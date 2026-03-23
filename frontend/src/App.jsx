import { useState, useEffect, useContext, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { jwtDecode } from 'jwt-decode';

// ==========================================
// 1. AUTHENTICATION CONTEXT
// ==========================================
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ ...decoded, token });
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode(token);
    setUser({ ...decoded, token });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// 2. LOGIN PAGE COMPONENT
// ==========================================
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:4000/api/auth/login', { email, password });
      login(res.data.token);
      navigate('/');
    } catch (err) {
      alert("Invalid Credentials");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-xl w-96">
        <h2 className="text-3xl font-bold mb-6 text-slate-800 text-center">Eventia Login</h2>
        <div className="space-y-4">
          <input 
            type="email" placeholder="Email" required 
            className="w-full border p-3 rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required 
            className="w-full border p-3 rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// 3. DASHBOARD (Dynamic Tenant Data)
// ==========================================
const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [tenantName, setTenantName] = useState("Organizer");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.tenantId) return;
      try {
        const eventRes = await axios.get(`http://localhost:4000/api/events?tenantId=${user.tenantId}`);
        setEvents(eventRes.data);

        const tenantRes = await axios.get(`http://localhost:4000/api/tenants/${user.tenantId}`);
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

// ==========================================
// 4. CUSTOMER FACING PUBLIC EVENTS (Fixed Tenant Logic)
// ==========================================
const PublicEvents = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); 
  const [email, setEmail] = useState('');
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [searchParams] = useSearchParams();

  // Get tenant from URL (?tenantId=...) or fallback to a known ID for testing
  const tenantId = searchParams.get('tenantId') || "30ceea06-7513-45b5-96e5-a2377359e6ba";

  useEffect(() => {
    axios.get(`http://localhost:4000/api/events?tenantId=${tenantId}`)
      .then(res => setEvents(res.data))
      .catch(err => console.error("Fetch error", err));
  }, [tenantId]);

  const handleCompletePurchase = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:4000/api/tickets/purchase', {
        eventId: selectedEvent.id,
        customerEmail: email,
        tenantId: tenantId // Use the ID from the searchParams
      });
      setPurchasedTicket(response.data.ticket);
      setEmail('');
    } catch (err) {
      alert(err.response?.data?.error === "SOLD_OUT" ? "Sold out!" : "Error buying ticket");
    }
  };

  const downloadTicket = () => {
    const canvas = document.getElementById('ticket-qr');
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `Eventia-Ticket-${purchasedTicket.qrCode}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-4xl font-extrabold mb-8 text-slate-900">Explore Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white rounded-xl shadow-md overflow-hidden border">
            <div className="h-40 bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
              {event.title.charAt(0)}
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold mb-2">{event.title}</h3>
              <p className="text-slate-500 text-sm mb-4">{event.venue?.name}</p>
              <button 
                onClick={() => setSelectedEvent(event)}
                className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-slate-800 transition"
              >
                Get Tickets
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center">
            {purchasedTicket ? (
              <div>
                <h3 className="text-2xl font-bold mb-4">You're going!</h3>
                <QRCodeCanvas id="ticket-qr" value={purchasedTicket.qrCode} size={200} />
                <button onClick={downloadTicket} className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-xl">Download</button>
                <button onClick={() => {setSelectedEvent(null); setPurchasedTicket(null);}} className="mt-2 w-full text-slate-500">Close</button>
              </div>
            ) : (
              <form onSubmit={handleCompletePurchase} className="text-left space-y-4">
                <h3 className="text-2xl font-bold">Checkout</h3>
                <input 
                  type="email" required placeholder="Email" className="w-full border p-3 rounded-xl"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Pay Now</button>
                <button onClick={() => setSelectedEvent(null)} className="w-full text-slate-400">Cancel</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateEvent = () => {
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [venues, setVenues] = useState([]); // Store fetched venues
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch venues belonging to THIS tenant on load
  useEffect(() => {
    if (user?.tenantId) {
      axios.get(`http://localhost:4000/api/venues?tenantId=${user.tenantId}`)
        .then(res => setVenues(res.data))
        .catch(err => console.error("Could not load venues"));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVenue) return alert("Please select a venue first!");
    
    setLoading(true);
    try {
      await axios.post('http://localhost:4000/api/events', {
        title,
        date: date,
        venueId: selectedVenue,
        tenantId: user.tenantId 
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert("Event created successfully!");
      setTitle(''); setDate('');
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
        
        {/* DROPDOWN INSTEAD OF UUID INPUT */}
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

// ==========================================
// 5. MAIN ROUTER LOGIC
// ==========================================
function AppContent() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/explore" element={<PublicEvents />} />

      {/* Protected Layout for Organizers */}
      <Route 
        path="/*" 
        element={user && user.role === 'ORGANIZER' ? (
          <div className="flex h-screen bg-slate-50">
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
              <div className="p-6 text-2xl font-bold text-indigo-400">EVENTIA</div>
              <nav className="flex-1 px-4 space-y-2">
                <Link to="/" className="block px-4 py-2 rounded hover:bg-slate-800">Dashboard</Link>

                <Link to="/create-event" className="block px-4 py-2 rounded hover:bg-slate-800">Create Event</Link>
                {/* Important: Add the specific tenant ID to the Explore link so buyers see THIS organizer's events */}
                <Link to={`/explore?tenantId=${user.tenantId}`} className="block px-4 py-2 rounded border border-indigo-500/30 text-indigo-300 hover:bg-slate-800 transition">
                  View as Buyer 🌐
                </Link>
              </nav>
            </aside>
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/create-event" element={<CreateEvent />} />
              </Routes>
            </main>
          </div>
        ) : <Navigate to="/login" />} 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;