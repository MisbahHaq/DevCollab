import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[devcollab] render error", error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="brutal w-full max-w-md bg-white p-6 text-center">
          <p className="text-4xl">💥</p>
          <h1 className="heading-brutal mt-3 text-2xl text-ink">Something broke</h1>
          <p className="mt-2 break-words font-mono text-xs text-ink/60">
            {this.state.error?.message || "An unexpected error crashed this screen."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button onClick={this.handleReset} className="btn-brutal cursor-pointer bg-canary px-4 py-2 text-ink">
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-brutal cursor-pointer bg-canvas px-4 py-2 text-ink"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}