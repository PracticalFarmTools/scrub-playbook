import { Component } from 'react';
import { downloadSavedBook } from '../utils/download';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="min-h-[100dvh] flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-6 space-y-4 text-center">
          <h1 className="text-lg font-extrabold text-slate-800">Scrub Playbook needs to reload</h1>
          <p className="text-sm text-slate-600">Your saved book is still on this phone. Reload to open it again, or download a copy first.</p>
          <button onClick={() => window.location.reload()} className="w-full min-h-11 rounded-xl bg-medical-600 text-white font-bold cursor-pointer">Reload</button>
          <button onClick={() => downloadSavedBook()} className="w-full min-h-11 rounded-xl border border-slate-300 text-slate-700 font-bold cursor-pointer">Download my saved book</button>
        </div>
      </div>
    );
  }
}
