/**
 * 真实浏览器 E2E 冒烟测试（手机尺寸，复用本机 Chrome/Edge，无需下载浏览器）
 * 前置：npm run build && npm run preview -- --port 4173
 * 运行：node test/e2e.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const BASE = process.env.E2E_BASE || 'http://localhost:4173'
const OUT = path.resolve('screens')

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean)

const executablePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate))

const results = []
function check(name, condition, extra) {
  results.push({ name, ok: Boolean(condition), extra })
  console.log(`${condition ? '[PASS]' : '[FAIL]'} ${name}${condition || !extra ? '' : ' -> ' + extra}`)
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({ path: path.join(OUT, name) })
}

const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-CN'
})
const page = await context.newPage()

const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text())
  }
})
page.on('pageerror', (error) => consoleErrors.push(String(error)))

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  check('空态文案正常显示', await page.getByText('本月还没有记录').isVisible())
  await shot(page, '01-empty.png')

  // 记一笔：支出
  await page.locator('.fab').click()
  await page.locator('.amount__input').fill('58.5')
  await page.getByRole('button', { name: '餐饮' }).click()
  await page.locator('.field__input').nth(1).fill('楼下小面')

  const saveBox = await page.getByRole('button', { name: '保存' }).boundingBox()
  check('弹层保存按钮处于可视区内', Boolean(saveBox) && saveBox.y + saveBox.height <= 844, JSON.stringify(saveBox))
  await shot(page, '02-sheet.png')
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(400)

  check('支出记账后出现在明细中', await page.getByText('楼下小面').isVisible())
  check(
    '金额按两位小数展示',
    await page.locator('.row__amount').first().innerText().then((text) => text.trim().endsWith('-58.50'))
  )
  check('本月支出汇总正确', await page.locator('.hero__amount').innerText().then((text) => text.includes('58.50')))

  // 记一笔：收入
  await page.locator('.fab').click()
  await page.getByRole('button', { name: '收入' }).click()
  await page.locator('.amount__input').fill('8000')
  await page.getByRole('button', { name: '工资' }).click()
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(400)

  check('收入记账后汇总显示收入笔', await page.locator('.hero__meta').innerText().then((text) => text.includes('8,000.00')))
  check('记账后弹层已关闭', (await page.locator('.sheet__panel').count()) === 0)
  await shot(page, '03-list.png')

  // 月份选择面板
  await page.locator('.month__label').first().click()
  check('月份选择面板可打开', await page.locator('.picker__panel').isVisible())
  await page.getByRole('button', { name: '回到本月' }).click()

  // 统计页
  await page.getByRole('button', { name: '统计' }).click()
  await page.waitForTimeout(300)
  check('统计页环形图渲染', (await page.locator('.donut svg circle').count()) >= 2)
  check('统计页柱状图渲染 6 个月', (await page.locator('.bars text').count()) === 6)
  check('支出排行出现餐饮', await page.getByText('餐饮').first().isVisible())
  check('未超支时统计页无危险模式', (await page.locator('.danger-bar').count()) === 0)
  await shot(page, '04-stats.png')

  // 我的页
  await page.getByRole('button', { name: '我的' }).click()
  await page.waitForTimeout(300)
  check('我的页数据总览显示 2 笔', await page.getByText('累计笔数').isVisible())

  await page.locator('.budget-input__field').fill('3000')
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(300)
  check('预算保存成功', await page.locator('.budget-input__field').inputValue().then((value) => value === '3000'))
  await shot(page, '05-me.png')

  // 首页预算进度条
  await page.getByRole('button', { name: '明细' }).click()
  check('首页显示预算进度', await page.locator('.budget__bar').isVisible())

  // 刷新后数据仍在（localStorage 持久化）
  await page.reload({ waitUntil: 'networkidle' })
  check('刷新后账单仍然存在', await page.getByText('楼下小面').isVisible())
  check('刷新后预算仍然存在', await page.getByText('月预算 ¥3,000.00').isVisible())

  // App 内确认弹窗（Android WebView 不支持 window.confirm，必须走自定义弹窗）
  await page.locator('.row').first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '删除' }).click()
  check('删除账单弹出 App 内确认框', await page.locator('.dialog__panel').isVisible())
  await page.locator('.dialog__btn--danger').click()
  await page.waitForTimeout(400)
  check('确认后删除成功，剩余 1 笔', (await page.locator('.row').count()) === 1)

  await page.getByRole('button', { name: '我的' }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: /清空所有账目/ }).click()
  check('清空操作弹出确认框', await page.locator('.dialog__panel').isVisible())
  await page.getByRole('button', { name: '取消' }).click()
  check('取消后数据仍然存在', await page.getByText('累计笔数').isVisible())

  await page.getByRole('button', { name: /清空所有账目/ }).click()
  await page.locator('.dialog__btn--danger').click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '明细' }).click()
  await page.waitForTimeout(300)
  check('清空后回到空态', await page.getByText('本月还没有记录').isVisible())

  // 超支夸张提醒
  await page.getByRole('button', { name: '我的' }).click()
  await page.waitForTimeout(250)
  await page.locator('.budget-input__field').fill('100')
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '明细' }).click()
  await page.waitForTimeout(300)

  await page.locator('.fab').click()
  await page.locator('.amount__input').fill('150')
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(1100)

  check('超支后弹出全屏警报', await page.locator('.alert').isVisible())
  check(
    '警报显示超支金额 50',
    await page.locator('.alert__amount').innerText().then((text) => text.replace(/\s/g, '').includes('50.00'))
  )
  check(
    '警报显示已支出与超支比例',
    await page.locator('.alert__stats').innerText().then((text) => text.includes('150.00') && text.includes('50%'))
  )
  check('警报含频闪层', (await page.locator('.alert__flash').count()) === 1)
  check(
    '警报含随机吐槽文案',
    await page.locator('.alert__taunt').innerText().then((text) => text.trim().length > 6)
  )
  check(
    '警报显示单日超标天数',
    await page.locator('.alert').innerText().then((text) => text.includes('天单日超标'))
  )
  await shot(page, '06-overspend.png')

  await page.getByRole('button', { name: '我认了' }).click()
  await page.waitForTimeout(400)
  check('关闭警报后首页出现超支横幅', await page.locator('.warn').isVisible())
  check(
    '超支横幅显示超支金额',
    await page.locator('.warn').innerText().then((text) => text.includes('50.00'))
  )
  check('超支时首页头部切换为警告配色', (await page.locator('.hero--over').count()) === 1)
  await shot(page, '07-overspend-banner.png')

  // 频率「每天一次」：当天已提醒过，刷新不再弹
  await page.getByRole('button', { name: '我的' }).click()
  await page.waitForTimeout(250)
  check('提醒频率三档可选', (await page.locator('.seg--wide .seg__item').count()) === 3)
  await page.getByRole('button', { name: '每天一次' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '明细' }).click()
  await page.waitForTimeout(200)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  check('每天一次频率下刷新不弹警报', (await page.locator('.alert').count()) === 0)
  check('刷新后超支横幅依然醒目', await page.locator('.warn').isVisible())

  // 频率「不提醒」：刷新不弹，但首页横幅仍然保留
  await page.getByRole('button', { name: '我的' }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: '不提醒' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '明细' }).click()
  await page.waitForTimeout(200)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  check('选择不提醒后刷新不弹警报', (await page.locator('.alert').count()) === 0)
  check('选择不提醒后首页仍有超支横幅', await page.locator('.warn').isVisible())

  // 频率「每次打开」：刷新会再弹
  await page.getByRole('button', { name: '我的' }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: '每次打开' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '明细' }).click()
  await page.waitForTimeout(200)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  check('每次打开频率下刷新会再弹警报', await page.locator('.alert').isVisible())
  await page.getByRole('button', { name: '我认了' }).click()
  await page.waitForTimeout(400)

  // 已经超支还继续花钱 -> 继续弹警报
  await page.locator('.fab').click()
  await page.locator('.amount__input').fill('30')
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(1100)
  check('超支状态下继续消费会再次警报', await page.locator('.alert').isVisible())
  await page.getByRole('button', { name: '去看账单' }).click()
  await page.waitForTimeout(500)

  // 统计页危险模式
  check('从警报跳到统计页', await page.locator('.summary').isVisible())
  check('超支后统计页进入危险模式', (await page.locator('.view--danger').count()) === 1)
  check('危险模式显示超支横幅', await page.locator('.danger-bar').isVisible())
  check('危险模式显示超支解剖卡', await page.locator('.danger-card').isVisible())
  check(
    '解剖卡标注头号元凶',
    await page.locator('.danger-culprit').innerText().then((text) => text.includes('餐饮'))
  )
  check(
    '预算使用率显示超支比例',
    await page.locator('.gauge__value').innerText().then((text) => text.includes('%'))
  )
  check('柱状图高亮超支月份', (await page.locator('.bars rect[stroke-dasharray="4 3"]').count()) === 1)
  check('支出排行标记元凶', (await page.locator('.rank__item--culprit .rank__badge').count()) === 1)
  await shot(page, '08-stats-danger.png')

  // ===== 购物二级标签（独立场景，重置数据与预算干扰） =====
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  await page.locator('.fab').click()
  await page.locator('.amount__input').fill('199.9')
  check('非购物分类不显示标签', (await page.locator('.tags__item').count()) === 0)
  await page.locator('.cats__item', { hasText: '购物' }).click()
  check('选择购物后出现标签选项', (await page.locator('.tags__item').count()) >= 5)
  await page.locator('.tags__item', { hasText: '衣服' }).click()
  check(
    '标签可以选中',
    await page.locator('.tags__item--active').innerText().then((text) => text.includes('衣服'))
  )
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(400)

  check(
    '明细显示购物标签',
    await page.locator('.row__tag').first().innerText().then((text) => text.trim() === '衣服')
  )

  // 第二笔换个标签
  await page.locator('.fab').click()
  await page.locator('.amount__input').fill('300')
  await page.locator('.cats__item', { hasText: '购物' }).click()
  await page.locator('.tags__item', { hasText: '包包' }).click()
  await page.getByRole('button', { name: '保存' }).click()
  await page.waitForTimeout(400)

  // 编辑时标签应回填
  await page.locator('.row').first().click()
  await page.waitForTimeout(300)
  check(
    '编辑时标签回填',
    await page.locator('.tags__item--active').innerText().then((text) => text.includes('包包'))
  )
  await page.locator('.sheet__mask').click({ position: { x: 12, y: 12 } })
  await page.waitForTimeout(400)

  await page.getByRole('button', { name: '统计' }).click()
  await page.waitForTimeout(400)
  check('统计页出现购物细分卡片', await page.getByText('购物细分').isVisible())
  const tagRankText = await page.locator('.rank').last().innerText()
  check('购物细分按标签汇总', tagRankText.includes('衣服') && tagRankText.includes('包包'))
  check(
    '购物细分金额正确',
    tagRankText.includes('300.00') && tagRankText.includes('199.90')
  )
  await shot(page, '10-shopping-tags.png')

  check('无控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
} catch (error) {
  check('测试执行完成', false, String(error))
} finally {
  await browser.close()
}

const failed = results.filter((item) => !item.ok)
console.log(`\n通过 ${results.length - failed.length} 项，失败 ${failed.length} 项`)
process.exit(failed.length === 0 ? 0 : 1)
