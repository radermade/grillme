import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Error details are intentionally not rendered or persisted.
  }

  private restart = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return <main className="recovery" aria-labelledby="recovery-title">
      <p className="eyebrow">Grill Me</p>
      <h1 id="recovery-title">The application needs to restart</h1>
      <p role="alert">Your saved course progress is still available on this device.</p>
      <button className="primary" onClick={this.restart}>Restart application</button>
    </main>;
  }
}