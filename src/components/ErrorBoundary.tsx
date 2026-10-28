import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** 兜底错误边界：渲染异常时展示可恢复界面，而不是白屏 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[轻记账] 渲染异常', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }
    return (
      <div className="crash">
        <p className="crash__icon">⚠️</p>
        <p className="crash__title">页面出了点问题</p>
        <p className="crash__message">{error.message || '未知错误'}</p>
        <div className="crash__actions">
          <button type="button" className="btn btn--primary" onClick={this.handleReset}>
            重试
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      </div>
    )
  }
}
