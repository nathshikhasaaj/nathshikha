import React from 'react';
import { AlertCircle } from 'lucide-react';
import './RouteErrorBoundary.css';

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Nathshikha route error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page errorBoundary">
        <div className="errorBoundaryContent">
          <AlertCircle />
          <h2>Something went wrong loading this page</h2>
          <p>{this.state.error?.message || 'Please try again.'}</p>
          <button
            className="goldBtn"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            RETRY
          </button>
        </div>
      </main>
    );
  }
}
