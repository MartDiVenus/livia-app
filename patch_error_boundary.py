with open("src/main.tsx", "r") as f:
    content = f.read()

if "ErrorBoundary" not in content:
    content = """import React from 'react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: '20px', color: 'red'}}><h1>Something went wrong.</h1><pre>{this.state.error.toString()}</pre></div>;
    }
    return this.props.children;
  }
}
""" + content.replace("<App />", "<ErrorBoundary><App /></ErrorBoundary>")

    with open("src/main.tsx", "w") as f:
        f.write(content)
