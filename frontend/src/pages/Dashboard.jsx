import { useState, useEffect, useContext } from 'react';
import Toast from '../components/Toast';
import { AuthContext } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [tenantName, setTenantName] = useState("Organizer");
  const [forecastingId, setForecastingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.tenantId) return;
      try {
        const eventRes = await api.get(`/api/events?tenantId=${user.tenantId}`);
        setEvents(eventRes.data);

        const tenantRes = await api.get(`/api/tenants/${user.tenantId}`);
        setTenantName(tenantRes.data.name);
      } catch (error) {
        console.error("Dashboard error", error);
      }
    };
    fetchDashboardData();
  }, [user]);

  const updateStatus = async (eventId, status) => {
    setUpdatingId(eventId);
    try {
      const res = await api.patch(
        `/api/events/${eventId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: res.data.status } : e));
    } catch (err) {
      console.error('Status update error', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.delete(`/api/events/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      const code = err.response?.data?.error;
      setToast({
        message: code === 'PUBLISHED_EVENT' ? 'Cancel the event before deleting it.' : 'Failed to delete event.',
        type: 'error',
      });
    }
    setPendingDeleteId(null);
  };

  const runForecast = async (eventId) => {
    setForecastingId(eventId);
    try {
      const res = await api.post(`/api/events/${eventId}/forecast`);
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, forecast: res.data } : e
      ));
    } catch (err) {
      console.error('Forecast error', err);
    } finally {
      setForecastingId(null);
    }
  };

  return (
    <>
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">{tenantName} Dashboard</h2>
        <button onClick={logout} className="text-sm text-red-500 font-bold hover:underline">Logout</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase">Total Tickets Sold</p>
          <p className="text-4xl font-black text-indigo-600 mt-2">
            {events.reduce((sum, e) => sum + (e._count?.tickets || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase">Active Events</p>
          <p className="text-4xl font-black text-slate-800 mt-2">{events.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800">Sales Analytics</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={events}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="title" hide />
              <YAxis />
              <Tooltip formatter={(value) => [value, 'Tickets Sold']} labelFormatter={(_, payload) => payload?.[0]?.payload?.title || ''} />
              <Bar dataKey={(e) => e._count?.tickets || 0} fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Your Events</h3>
        </div>
        {events.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">No events yet. Create your first event!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase bg-slate-50">
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Venue</th>
                  <th className="px-6 py-3">Tickets Sold</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">AI Forecast</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => {
                  const sold = event._count?.tickets || 0;
                  const capacity = event.venue?.capacity || 1;
                  const fillPct = Math.min(100, Math.round((sold / capacity) * 100));
                  const score = event.forecast?.confidenceScore;

                  return (
                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{event.title}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(event.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {event.venue?.name || '—'}
                        <span className="ml-1 text-xs text-slate-400">({capacity.toLocaleString()} cap)</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${fillPct >= 90 ? 'bg-red-500' : fillPct >= 60 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <span className="text-slate-700 font-medium">{sold} <span className="text-slate-400 font-normal">/ {capacity}</span></span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          event.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                          event.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {score != null ? (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${score >= 0.5 ? 'bg-emerald-500' : score >= 0.3 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                              <span className="font-semibold text-slate-700">{Math.round(score * 100)}%</span>
                              <span className="text-slate-400 text-xs">sell-out</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No forecast</span>
                          )}
                          <button
                            onClick={() => runForecast(event.id)}
                            disabled={forecastingId === event.id}
                            className="ml-1 px-2 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {forecastingId === event.id ? '...' : score != null ? 'Refresh' : 'Run'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {event.status === 'DRAFT' && (
                            <button
                              onClick={() => updateStatus(event.id, 'PUBLISHED')}
                              disabled={updatingId === event.id}
                              className="px-2 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                            >
                              Publish
                            </button>
                          )}
                          {event.status !== 'CANCELLED' && (
                            <button
                              onClick={() => updateStatus(event.id, 'CANCELLED')}
                              disabled={updatingId === event.id}
                              className="px-2 py-1 text-xs font-semibold rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          {event.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => setPendingDeleteId(event.id)}
                              className="px-2 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

    {pendingDeleteId && (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <p className="text-lg font-bold text-slate-800 mb-2">Delete this event?</p>
          <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
          <div className="flex gap-3">
            <button
              onClick={() => deleteEvent(pendingDeleteId)}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 transition"
            >
              Delete
            </button>
            <button
              onClick={() => setPendingDeleteId(null)}
              className="flex-1 border border-slate-200 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Dashboard;
