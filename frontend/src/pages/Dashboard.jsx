import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [tenantName, setTenantName] = useState("Organizer");

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

  return (
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
              <Tooltip />
              <Bar dataKey={(e) => e._count?.tickets || 0} fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
