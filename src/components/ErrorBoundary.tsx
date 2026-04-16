import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { STORAGE_KEY } from "../gameState";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  static displayName = "ErrorBoundary";
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    if (window.confirm("Are you sure you want to reset the game? All progress will be lost.")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="screen" style={{ textAlign: "center", padding: "4rem 1rem" }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Try reloading the page or reset the game.</p>
          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem" }}
          >
            <button onClick={() => window.location.reload()}>Reload</button>
            <button onClick={this.handleReset}>Reset Game</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
