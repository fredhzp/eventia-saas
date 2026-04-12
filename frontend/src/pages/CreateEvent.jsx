import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const CreateEvent = () => {
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/venues')
      .then(res => setVenues(res.data))
      .catch(err => console.error("Could not load venues"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVenue) return alert("Please select a venue first!");

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
      alert("Event created successfully!");
      setTitle('');
      setDate('');
    } catch (err) {
      alert("Backend Error: " + (err.response?.data?.error || "Check server logs"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-3xl font-bold mb-6 text-slate-800">Create New Event</h2>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
        <input
          type="text" placeholder="Event Title" required value={title}
          className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="datetime-local" required value={date}
          className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          required
          className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedVenue}
          onChange={(e) => setSelectedVenue(e.target.value)}
        >
          <option value="">-- Select a Venue --</option>
          {venues.map(v => (
            <option key={v.id} value={v.id}>{v.name} (Cap: {v.capacity})</option>
          ))}
        </select>
        <button disabled={loading || venues.length === 0} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">
          {venues.length === 0 ? "Create a Venue in Database First" : (loading ? "Saving..." : "Save Event")}
        </button>
      </form>
    </div>
  );
};

export default CreateEvent;
