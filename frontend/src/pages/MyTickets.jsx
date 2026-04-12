import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../services/api';

const MyTickets = () => {
  const [email, setEmail] = useState('');
  const [tickets, setTickets] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/tickets?email=${encodeURIComponent(email.trim())}`);
      setTickets(res.data);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = (qrCode) => {
    const canvas = document.getElementById(`qr-${qrCode}`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Eventia-Ticket-${qrCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link to="/" className="text-xl font-black text-indigo-600 tracking-tight">EVENTIA</Link>
        <Link
          to="/"
          className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition"
        >
          ← Back to Events
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-800 mb-2">My Tickets</h1>
          <p className="text-slate-500 text-sm">
            Enter the email address you used when purchasing to retrieve your tickets.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-10">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Find Tickets'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <p className="text-center text-red-500 text-sm mb-6">{error}</p>
        )}

        {/* Results */}
        {tickets !== null && (
          tickets.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">🎟️</p>
              <p className="font-semibold text-slate-600">No tickets found</p>
              <p className="text-sm mt-1">No tickets are associated with <strong>{email}</strong>.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 text-center mb-6">
                Found <strong>{tickets.length}</strong> ticket{tickets.length !== 1 ? 's' : ''} for <strong>{email}</strong>
              </p>
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row items-center gap-6"
                >
                  {/* QR Code */}
                  <div className="shrink-0">
                    <QRCodeCanvas
                      id={`qr-${ticket.qrCode}`}
                      value={ticket.qrCode}
                      size={140}
                      level="H"
                    />
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">
                      {ticket.event.title}
                    </h3>
                    <p className="text-slate-500 text-sm mb-1">
                      {new Date(ticket.event.startTime).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                    <p className="text-slate-500 text-sm mb-3">{ticket.event.venue}</p>

                    {ticket.checkedInAt ? (
                      <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        ✓ Checked in
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        Valid
                      </span>
                    )}

                    <div className="mt-4">
                      <button
                        onClick={() => downloadQR(ticket.qrCode)}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition"
                      >
                        Save QR Code
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MyTickets;
