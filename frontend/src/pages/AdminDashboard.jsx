import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const TABS = ['Tenants', 'Venues', 'Events'];

const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ── Generic edit modal ────────────────────────────────────────────────────────
const EditModal = ({ title, fields, initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial);
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-slate-800 mb-6">{title}</h3>
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSave(form)} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition">Save</button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('Tenants');
  const [tenants, setTenants] = useState([]);
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null);   // { type, data }
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [error, setError] = useState('');

  const headers = authHeaders(user?.token);

  useEffect(() => {
    api.get('/api/admin/tenants', headers).then(r => setTenants(r.data)).catch(() => {});
    api.get('/api/admin/venues',  headers).then(r => setVenues(r.data)).catch(() => {});
    api.get('/api/admin/events',  headers).then(r => setEvents(r.data)).catch(() => {});
  }, []);

  // ── Saves ──
  const saveTenant = async (form) => {
    try {
      const r = await api.put(`/api/admin/tenants/${editing.data.id}`, form, headers);
      setTenants(prev => prev.map(t => t.id === r.data.id ? { ...t, ...r.data } : t));
      setEditing(null);
    } catch { setError('Failed to save tenant.'); }
  };

  const saveVenue = async (form) => {
    try {
      const r = await api.put(`/api/admin/venues/${editing.data.id}`, form, headers);
      setVenues(prev => prev.map(v => v.id === r.data.id ? { ...v, ...r.data } : v));
      setEditing(null);
    } catch { setError('Failed to save venue.'); }
  };

  const addVenue = async (form) => {
    try {
      const r = await api.post('/api/admin/venues', form, headers);
      setVenues(prev => [...prev, { ...r.data, _count: { events: 0 } }]);
      setShowAdd(false);
    } catch { setError('Failed to create venue.'); }
  };

  const deleteVenue = async (id) => {
    try {
      await api.delete(`/api/admin/venues/${id}`, headers);
      setVenues(prev => prev.filter(v => v.id !== id));
    } catch { setError('Cannot delete — venue may have associated events.'); }
    setPendingDeleteId(null);
  };

  const saveEvent = async (form) => {
    try {
      const r = await api.put(`/api/admin/events/${editing.data.id}`, form, headers);
      setEvents(prev => prev.map(e => e.id === r.data.id ? { ...e, ...r.data } : e));
      setEditing(null);
    } catch { setError('Failed to save event.'); }
  };

  // ── Table helpers ──
  const badge = (val, map) => {
    const { bg, text } = map[val] ?? { bg: 'bg-slate-100', text: 'text-slate-500' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${bg} ${text}`}>{val}</span>;
  };

  const statusColors = {
    PUBLISHED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    DRAFT:     { bg: 'bg-slate-100',   text: 'text-slate-500'   },
    CANCELLED: { bg: 'bg-red-100',     text: 'text-red-600'     },
    ACTIVE:    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-indigo-400">EVENTIA</span>
          <span className="text-slate-500">|</span>
          <span className="text-sm font-semibold text-slate-300">System Administration</span>
        </div>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-red-400 transition font-medium">Logout</button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex justify-between">
            {error}
            <button onClick={() => setError('')} className="font-bold">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t}
              <span className="ml-1.5 text-xs opacity-70">
                ({t === 'Tenants' ? tenants.length : t === 'Venues' ? venues.length : events.length})
              </span>
            </button>
          ))}
        </div>

        {/* ── Tenants tab ── */}
        {tab === 'Tenants' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3">Organisation</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Users</th>
                  <th className="px-6 py-3">Events</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
                    <td className="px-6 py-4">{badge(t.subscriptionStatus, statusColors)}</td>
                    <td className="px-6 py-4 text-slate-500">{t._count.users}</td>
                    <td className="px-6 py-4 text-slate-500">{t._count.events}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setEditing({ type: 'tenant', data: t })} className="text-xs font-semibold text-indigo-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Venues tab ── */}
        {tab === 'Venues' && (
          <>
            <div className="flex justify-end mb-3">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition">
                + Add Venue
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Capacity</th>
                    <th className="px-6 py-3">Events</th>
                    <th className="px-6 py-3">Coordinates</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venues.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{v.name}</td>
                      <td className="px-6 py-4 text-slate-600">{v.capacity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500">{v._count.events}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {v.geoLat && v.geoLong ? `${v.geoLat}, ${v.geoLong}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right flex gap-3 justify-end">
                        <button onClick={() => setEditing({ type: 'venue', data: v })} className="text-xs font-semibold text-indigo-600 hover:underline">Edit</button>
                        <button onClick={() => setPendingDeleteId(v.id)} className="text-xs font-semibold text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Events tab ── */}
        {tab === 'Events' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3">Event</th>
                  <th className="px-6 py-3">Organiser</th>
                  <th className="px-6 py-3">Venue</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Tickets</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{e.title}</td>
                    <td className="px-6 py-4 text-slate-500">{e.tenant?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{e.venue?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(e.startTime).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-500">{e._count.tickets}</td>
                    <td className="px-6 py-4">{badge(e.status, statusColors)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setEditing({ type: 'event', data: e })} className="text-xs font-semibold text-indigo-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit modals ── */}
      {editing?.type === 'tenant' && (
        <EditModal
          title={`Edit Tenant: ${editing.data.name}`}
          fields={[
            { key: 'name', label: 'Organisation Name' },
            { key: 'subscriptionStatus', label: 'Status', type: 'select', options: ['ACTIVE', 'SUSPENDED', 'CANCELLED'] },
          ]}
          initial={{ name: editing.data.name, subscriptionStatus: editing.data.subscriptionStatus }}
          onSave={saveTenant}
          onClose={() => setEditing(null)}
        />
      )}

      {editing?.type === 'venue' && (
        <EditModal
          title={`Edit Venue: ${editing.data.name}`}
          fields={[
            { key: 'name',     label: 'Venue Name' },
            { key: 'capacity', label: 'Capacity', type: 'number' },
            { key: 'geoLat',   label: 'Latitude (optional)', type: 'number' },
            { key: 'geoLong',  label: 'Longitude (optional)', type: 'number' },
          ]}
          initial={{ name: editing.data.name, capacity: editing.data.capacity, geoLat: editing.data.geoLat ?? '', geoLong: editing.data.geoLong ?? '' }}
          onSave={saveVenue}
          onClose={() => setEditing(null)}
        />
      )}

      {showAdd && (
        <EditModal
          title="Add New Venue"
          fields={[
            { key: 'name',     label: 'Venue Name' },
            { key: 'capacity', label: 'Capacity', type: 'number' },
            { key: 'geoLat',   label: 'Latitude (optional)', type: 'number' },
            { key: 'geoLong',  label: 'Longitude (optional)', type: 'number' },
          ]}
          initial={{ name: '', capacity: '', geoLat: '', geoLong: '' }}
          onSave={addVenue}
          onClose={() => setShowAdd(false)}
        />
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <p className="text-lg font-bold text-slate-800 mb-2">Delete this venue?</p>
            <p className="text-sm text-slate-500 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteVenue(pendingDeleteId)}
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

      {editing?.type === 'event' && (
        <EditModal
          title={`Edit Event: ${editing.data.title}`}
          fields={[
            { key: 'title',     label: 'Title' },
            { key: 'startTime', label: 'Date & Time', type: 'datetime-local' },
            { key: 'status',    label: 'Status', type: 'select', options: ['DRAFT', 'PUBLISHED', 'CANCELLED'] },
          ]}
          initial={{
            title:     editing.data.title,
            startTime: new Date(editing.data.startTime).toISOString().slice(0, 16),
            status:    editing.data.status,
          }}
          onSave={saveEvent}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
