import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const CARD_GRADIENTS = [
  'from-violet-600 to-indigo-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-700',
  'from-blue-500 to-cyan-700',
  'from-fuchsia-500 to-purple-700',
];

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [email, setEmail] = useState('');
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [search, setSearch] = useState('');

  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.venue?.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.tenant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    api.get('/api/events/public')
      .then(res => setEvents(res.data))
      .catch(err => console.error('Failed to load events', err));
  }, []);

  const openModal = (event) => {
    setSelectedEvent(event);
    setPurchasedTicket(null);
    setEmail('');
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setPurchasedTicket(null);
    setEmail('');
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setPurchasing(true);
    try {
      const res = await api.post('/api/tickets/purchase', {
        eventId: selectedEvent.id,
        customerEmail: email,
        tenantId: selectedEvent.tenantId,
      });
      setPurchasedTicket(res.data.ticket);
    } catch (err) {
      alert(err.response?.data?.error === 'SOLD_OUT' ? 'This event is sold out!' : 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const downloadTicket = () => {
    const canvas = document.getElementById('ticket-qr');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `Eventia-Ticket-${purchasedTicket.qrCode}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-black text-indigo-600 tracking-tight">EVENTIA</span>
        <div className="flex items-center gap-3">
          <Link
            to="/my-tickets"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            My Tickets
          </Link>
          {user?.role === 'ORGANIZER' ? (
            <>
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition"
              >
                My Dashboard
              </Link>
              <button
                onClick={logout}
                className="text-sm text-slate-400 hover:text-red-500 transition font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition"
            >
              Organizer Login
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white px-6 py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-slate-900 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-indigo-400 font-semibold text-xs uppercase tracking-widest mb-4">
            Live Events &amp; Experiences
          </p>
          <h1 className="text-5xl md:text-6xl font-black mb-5 leading-tight">
            Discover. Experience.<br />Remember.
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Browse upcoming live events from organizers everywhere. Book your tickets in seconds.
          </p>
        </div>
      </div>

      {/* ── Events Grid ────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {search
              ? `${filteredEvents.length} result${filteredEvents.length !== 1 ? 's' : ''} for "${search}"`
              : events.length > 0 ? `${events.length} Upcoming Event${events.length !== 1 ? 's' : ''}` : 'Upcoming Events'
            }
          </h2>
          <input
            type="text"
            placeholder="Search events, venues, organisers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-72 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
          />
        </div>

        {events.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-6xl mb-4">🎟️</p>
            <p className="font-semibold text-lg text-slate-600">No events yet</p>
            <p className="text-sm mt-2">
              Check back soon — or{' '}
              <Link to="/login" className="text-indigo-500 hover:underline font-medium">
                list your event as an organizer
              </Link>
              .
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-semibold text-lg text-slate-600">No events match your search</p>
            <button onClick={() => setSearch('')} className="mt-3 text-sm text-indigo-500 hover:underline">Clear search</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, i) => {
              const sold     = event._count?.tickets || 0;
              const capacity = event.venue?.capacity || 1;
              const fillPct  = Math.min(100, Math.round((sold / capacity) * 100));
              const isSoldOut      = sold >= capacity;
              const isSellingFast  = !isSoldOut && (event.forecast?.confidenceScore ?? 0) >= 0.7;
              const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
                  {/* Coloured header */}
                  <div className={`h-44 bg-gradient-to-br ${gradient} relative flex items-end p-5`}>
                    <span className="text-white/10 text-9xl font-black leading-none select-none absolute -right-2 -bottom-3 pointer-events-none">
                      {event.title.charAt(0).toUpperCase()}
                    </span>
                    {isSellingFast && (
                      <span className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full shadow">
                        Selling Fast
                      </span>
                    )}
                    {isSoldOut && (
                      <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                        Sold Out
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">
                      {event.tenant?.name || 'Eventia'}
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug mb-1">{event.title}</h3>
                    <p className="text-sm text-slate-500 mb-0.5">
                      {new Date(event.startTime).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-400 mb-4">{event.venue?.name}</p>

                    {/* Capacity fill bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{sold.toLocaleString()} sold</span>
                        <span>{capacity.toLocaleString()} cap</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            fillPct >= 90 ? 'bg-red-500' : fillPct >= 60 ? 'bg-amber-400' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => !isSoldOut && openModal(event)}
                      disabled={isSoldOut}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition ${
                        isSoldOut
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-slate-700 active:scale-95'
                      }`}
                    >
                      {isSoldOut ? 'Sold Out' : 'Get Tickets'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-400">
        <span className="font-bold text-indigo-500">EVENTIA</span> · Multi-Tenant Event Platform
        {!user && (
          <span>
            {' · '}
            <Link to="/login" className="hover:text-indigo-500 transition">
              Are you an organizer?
            </Link>
          </span>
        )}
      </footer>

      {/* ── Purchase Modal ──────────────────────────────────────────────── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white p-8 rounded-2xl max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {purchasedTicket ? (
              /* ── Success state ── */
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">You're going!</h3>
                <p className="text-slate-500 text-sm mb-6">{selectedEvent.title}</p>
                <div className="flex justify-center p-4 bg-slate-50 rounded-xl mb-6">
                  <QRCodeCanvas id="ticket-qr" value={purchasedTicket.qrCode} size={180} level="H" />
                </div>
                <button
                  onClick={downloadTicket}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition mb-2"
                >
                  Save Ticket
                </button>
                <button
                  onClick={closeModal}
                  className="w-full text-slate-400 text-sm hover:text-slate-600 transition py-2"
                >
                  Close
                </button>
              </div>
            ) : (
              /* ── Checkout form ── */
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">{selectedEvent.title}</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {new Date(selectedEvent.startTime).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}{' · '}{selectedEvent.venue?.name}
                </p>
                <form onSubmit={handlePurchase} className="space-y-4">
                  <input
                    type="email"
                    required
                    placeholder="Your email address"
                    className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <button
                    disabled={purchasing}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    {purchasing ? 'Processing…' : 'Claim Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full text-slate-400 text-sm hover:text-slate-600 transition py-1"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
