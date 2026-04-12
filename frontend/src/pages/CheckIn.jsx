import { useState } from 'react';
import { Link } from 'react-router-dom';
import QrScanner from '../components/QrScanner';
import api from '../services/api';

const STATUS = { IDLE: 'idle', LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' };

const CheckIn = () => {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState(null);   // last check-in result or error
  const [history, setHistory] = useState([]);   // running log for the session

  const handleScan = async (qrCode) => {
    setStatus(STATUS.LOADING);
    setResult(null);
    try {
      const res = await api.post('/api/tickets/checkin', { qrCode });
      const entry = { ok: true, qrCode, ...res.data, ts: new Date() };
      setResult(entry);
      setHistory(prev => [entry, ...prev]);
      setStatus(STATUS.SUCCESS);
    } catch (err) {
      const code = err.response?.data?.error ?? 'ERROR';
      const entry = { ok: false, qrCode, code, ts: new Date() };
      setResult(entry);
      setHistory(prev => [entry, ...prev]);
      setStatus(STATUS.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-black text-indigo-400 tracking-tight">EVENTIA</Link>
        <span className="text-slate-400 text-sm font-medium">Staff Check-in</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-black mb-2">Ticket Check-in</h1>
        <p className="text-slate-400 text-sm mb-8">
          Enter the QR code printed on the ticket to mark the attendee as arrived.
        </p>

        {/* Scanner */}
        <QrScanner onScan={handleScan} disabled={status === STATUS.LOADING} />

        {/* Feedback */}
        {status === STATUS.LOADING && (
          <div className="mt-6 text-center text-slate-400 text-sm animate-pulse">Verifying…</div>
        )}

        {status === STATUS.SUCCESS && result && (
          <div className="mt-6 bg-emerald-900/50 border border-emerald-500/40 rounded-2xl p-5">
            <p className="text-emerald-400 font-bold text-lg mb-1">✓ Checked in</p>
            <p className="text-white font-semibold">{result.ticket.event.title}</p>
            <p className="text-slate-300 text-sm">{result.ticket.event.venue}</p>
            <p className="text-slate-400 text-sm mt-1">Buyer: {result.ticket.buyerEmail}</p>
            <p className="text-slate-500 text-xs mt-2 font-mono">{result.qrCode}</p>
          </div>
        )}

        {status === STATUS.ERROR && result && (
          <div className="mt-6 bg-red-900/50 border border-red-500/40 rounded-2xl p-5">
            {result.code === 'ALREADY_CHECKED_IN' ? (
              <>
                <p className="text-red-400 font-bold text-lg mb-1">✗ Already checked in</p>
                <p className="text-slate-300 text-sm">
                  This ticket was already used at{' '}
                  {new Date(result.checkedInAt).toLocaleTimeString()}.
                </p>
              </>
            ) : result.code === 'TICKET_NOT_FOUND' ? (
              <p className="text-red-400 font-bold">✗ Ticket not found</p>
            ) : (
              <p className="text-red-400 font-bold">✗ Error: {result.code}</p>
            )}
            <p className="text-slate-500 text-xs mt-2 font-mono">{result.qrCode}</p>
          </div>
        )}

        {/* Session log */}
        {history.length > 0 && (
          <div className="mt-10">
            <h2 className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-3">
              Session log ({history.length})
            </h2>
            <div className="space-y-2">
              {history.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-2 rounded-xl text-sm ${
                    entry.ok
                      ? 'bg-emerald-900/30 text-emerald-300'
                      : 'bg-red-900/30 text-red-300'
                  }`}
                >
                  <span className="font-mono">{entry.qrCode}</span>
                  <span className="text-xs opacity-70">
                    {entry.ok ? '✓' : `✗ ${entry.code}`}
                    {' · '}
                    {entry.ts.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckIn;
