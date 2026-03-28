import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  title?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
}

class AdminTabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin tab crashed:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            {this.props.title ?? "This section failed to load"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The rest of admin is safe. Retry this section without reloading the whole panel.
          </p>
          <Button onClick={this.handleRetry} variant="outline" className="mt-4">
            Retry section
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminTabErrorBoundary;