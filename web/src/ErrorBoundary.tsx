import { Component, type ErrorInfo, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <div className="page-title">Something went wrong</div>
          <p style={{ color: "var(--muted)", margin: "12px 0 24px" }}>
            An unexpected error occurred. Your bids are safe because they are recorded by the server.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.assign("/auctions")}>
            Back to auctions
          </button>
        </div>
      </div>
    );
  }
}