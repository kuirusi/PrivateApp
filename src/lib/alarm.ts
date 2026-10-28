/**
 * 超支警报反馈：三声急促提示音 + 震动
 * 提示音用 WebAudio 实时合成，无需音频文件
 */
type UserActivation = { hasBeenActive?: boolean }

function canTriggerFeedback(): boolean {
  // 浏览器策略：没有用户手势时音频与震动会被拦截并报错，冷启动自动弹出的警报只出画面
  const activation = (navigator as Navigator & { userActivation?: UserActivation }).userActivation
  if (!activation || activation.hasBeenActive === undefined) {
    return true
  }
  return activation.hasBeenActive
}

export function playAlarm(soundEnabled: boolean): void {
  if (!canTriggerFeedback()) {
    return
  }

  if (soundEnabled) {
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtor) {
        const context = new AudioCtor()
        const start = context.currentTime
        const beeps = [
          { offset: 0, frequency: 920 },
          { offset: 0.26, frequency: 1180 },
          { offset: 0.52, frequency: 920 }
        ]
        beeps.forEach((beep) => {
          const oscillator = context.createOscillator()
          const gain = context.createGain()
          oscillator.type = 'square'
          oscillator.frequency.setValueAtTime(beep.frequency, start + beep.offset)
          gain.gain.setValueAtTime(0.0001, start + beep.offset)
          gain.gain.exponentialRampToValueAtTime(0.16, start + beep.offset + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, start + beep.offset + 0.2)
          oscillator.connect(gain)
          gain.connect(context.destination)
          oscillator.start(start + beep.offset)
          oscillator.stop(start + beep.offset + 0.22)
        })
        window.setTimeout(() => {
          context.close().catch(() => undefined)
        }, 1400)
      }
    } catch {
      /* 音频不可用时静默降级 */
    }
  }

  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate([160, 80, 160, 80, 320])
  }
}
