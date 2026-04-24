import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Toast from '../components/Toast';

const CreateEvent = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api.get('/api/venues')
      .then(res => setVenues(res.data))
      .catch(err => console.error("Could not load venues"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVenue) {
      setToast({ message: 'Please select a venue first!', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/events', {
        title,
        date,
        venueId: selectedVenue,
        tenantId: user.tenantId
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      navigate('/dashboard');
    } catch (err) {
      setToast({ message: 'Error: ' + (err.response?.data?.error || 'Check server logs'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-slate-50 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-indigo-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Create New Event</h2>
          <p className="text-indigo-200 text-sm mt-1">Fill in the details to publish your event</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Event Title</label>
            <input
              type="text"
              placeholder="e.g. Summer Jazz Night"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date &amp; Time</label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Venue</label>
            {venues.length === 0 ? (
              <div className="w-full border border-amber-200 bg-amber-50 text-amber-700 text-sm p-3 rounded-xl">
                No venues available. Ask your platform admin to add a venue first.
              </div>
            ) : (
              <select
                required
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white"
              >
                <option value="">— Select a venue —</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name} (capacity: {v.capacity.toLocaleString()})</option>
                ))}
              </select>
            )}
          </div>

          {/* Submit */}
          <button
            disabled={loading || venues.length === 0}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
          >
            {loading ? 'Saving…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
