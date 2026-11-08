import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Ocurrió un error al cargar este módulo</h2>
          <p className="text-xs text-slate-500 mb-4 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {this.state.error?.message || 'Error inesperado en la interfaz'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recargar Módulo</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
