import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ==========================================
// 1. CONFIGURATION (PASTE YOUR IDs HERE)
// ==========================================
const TENANT_ID = "30ceea06-7513-45b5-96e5-a2377359e6ba";
const VENUE_ID = "7fef1f29-479e-46cf-bae4-e176b903ff00";

// const TENANT_ID = "b1a59024-87d2-45e0-9f18-6c8102d73489";
// const VENUE_ID = "d9c8b7a6-1234-4def-9012-3456789abcde";

// ==========================================
// 2. DASHBOARD COMPONENT (Updated with Sales & Tenant Name)
// ==========================================
const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("Organizer");

  // LOGIC: Sum up all tickets from all events for the KPI card
  const totalTicketsSold = events.reduce((sum, event) => sum + (event._count?.tickets || 0), 0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch the Events for the chart and table
        const eventResponse = await axios.get(`http://localhost:4000/api/events?tenantId=${TENANT_ID}`);
        setEvents(eventResponse.data);

        // 2. Fetch the actual Tenant Name for the dynamic header
        const tenantResponse = await axios.get(`http://localhost:4000/api/tenants/${TENANT_ID}`);
        if (tenantResponse.data && tenantResponse.data.name) {
          setTenantName(tenantResponse.data.name);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const handleGenerateForecast = async (eventId) => {
    try {
      await axios.post(`http://localhost:4000/api/events/${eventId}/forecast`);
      alert("Forecast Generated!");
      window.location.reload();
    } catch (error) {
      alert("AI Service Error");
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* --- THE DYNAMIC HEADER --- */}
      <h2 className="text-3xl font-bold text-slate-800">{tenantName} Dashboard</h2>

      {/* --- KPI SECTION --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Tickets Sold</p>
          <p className="text-4xl font-black text-indigo-600 mt-2">{totalTicketsSold}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Events</p>
          <p className="text-4xl font-black text-slate-800 mt-2">{events.length}</p>
        </div>
      </div>

      {/* --- ANALYTICS CHART --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Ticket Sales by Event</h3>
        {events.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={events}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="title" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                />
                <YAxis 
                  allowDecimals={false} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey={(event) => event._count?.tickets || 0} name="Tickets Sold" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400">Not enough data to display chart.</div>
        )}
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-700">Recent Events</h3>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <th className="p-4 font-medium">Event Title</th>
              <th className="p-4 font-medium">Tickets Sold</th>
              <th className="p-4 font-medium">Venue</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">AI Forecast</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                <td className="p-4 font-bold text-slate-800">{event.title}</td>
                
                <td className="p-4">
                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-mono font-bold">
                    {event._count?.tickets || 0}
                  </span>
                </td>

                <td className="p-4 text-slate-600 text-sm">{event.venue?.name || 'Unknown'}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full font-bold uppercase">
                    {event.status}
                  </span>
                </td>
                <td className="p-4">
                  {event.forecast ? (
                    <span className="flex items-center text-green-600 font-bold text-sm">
                      🔥 {(event.forecast.confidenceScore * 100).toFixed(0)}% Demand
                    </span>
                  ) : (
                    <button onClick={() => handleGenerateForecast(event.id)} className="text-xs font-bold text-indigo-600 hover:underline">
                      Predict
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 3. CREATE EVENT COMPONENT
// ==========================================
const CreateEvent = () => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage('Saving...');

    try {
      const response = await axios.post('http://localhost:4000/api/events', {
        title: title,
        date: date,
        tenantId: TENANT_ID,
        venueId: VENUE_ID
      });
      
      setStatusMessage(`✅ Success! Event ID: ${response.data.event.id}`);
      setTitle('');
      setDate('');
    } catch (error) {
      console.error(error);
      setStatusMessage('❌ Failed to create event.');
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-3xl font-bold mb-6 text-slate-800">Create New Event</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
          <input 
            type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="e.g. The Weeknd - World Tour"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
          <input 
            type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition w-full font-semibold">
          Save Event
        </button>
        {statusMessage && (
          <div className="mt-4 p-3 bg-slate-100 rounded text-center font-mono text-sm">{statusMessage}</div>
        )}
      </form>
    </div>
  );
};

// =================================
// 4. CUSTOMER FACING PUBLIC EVENTS
// =================================
const PublicEvents = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); 
  const [email, setEmail] = useState('');
  const [purchasedTicket, setPurchasedTicket] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:4000/api/events?tenantId=${TENANT_ID}`)
      .then(res => setEvents(res.data));
  }, []);

  const handleCompletePurchase = async (e) => {
    e.preventDefault();
    try {
      // 1. Make the request
      const response = await axios.post('http://localhost:4000/api/tickets/purchase', {
        eventId: selectedEvent.id,
        customerEmail: email,
        tenantId: TENANT_ID
      });
      
      // 2. Set the data IMMEDIATELY inside the try block
      setPurchasedTicket(response.data.ticket);
      setEmail('');
      
    } catch (err) {
      console.error("🚨 THE REAL ERROR IS:", err);
      
      // 3. Make sure we use 'err.response' here, not 'response'
      if (err.response && err.response.data && err.response.data.error === "SOLD_OUT") {
        alert("Sorry, this event just sold out!");
        setSelectedEvent(null);
      } else {
        alert(`Frontend Error: ${err.message}`); 
      }
    }
  };

  const downloadTicket = () => {
    const canvas = document.getElementById('ticket-qr');
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      // Names the file "Eventia-Ticket-QR-XXXXX.png"
      downloadLink.download = `Eventia-Ticket-${purchasedTicket.qrCode}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-4xl font-extrabold mb-8 text-slate-900">Upcoming Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => {
          // Calculate capacity logic safely
          const capacity = event.venue?.capacity || 0;
          const ticketsSold = event._count?.tickets || 0;
          const isSoldOut = capacity > 0 && ticketsSold >= capacity;
          const ticketsLeft = capacity - ticketsSold;

          return (
            <div key={event.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 flex flex-col">
              <div className="h-40 bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {event.title.charAt(0)}
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <p className="text-slate-500 text-sm mb-4">
                  {new Date(event.startTime).toLocaleDateString()} • {event.venue?.name}
                </p>
                
                {event.forecast && (
                  <div className="mb-4 p-2 bg-orange-50 rounded-lg border border-orange-100">
                    <span className="text-orange-700 text-xs font-bold uppercase tracking-wider">
                      🔥 Selling Fast: {(event.forecast.confidenceScore * 100).toFixed(0)}% Demand
                    </span>
                  </div>
                )}

                {/* --- NEW: CAPACITY CHECK UI --- */}
                {isSoldOut ? (
                  <button disabled className="mt-auto w-full bg-slate-200 text-slate-400 py-2 rounded-lg font-bold cursor-not-allowed border border-slate-300">
                    Sold Out
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedEvent(event)}
                    className="mt-auto w-full bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-slate-800 transition"
                  >
                    Get Tickets {capacity > 0 ? `(${ticketsLeft} left)` : ''}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout Modal & Success Screen */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 text-center">
            
            {/* IF TICKET IS PURCHASED: SHOW SUCCESS & QR CODE */}
            {purchasedTicket ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 text-3xl font-bold">✓</div>
                <h3 className="text-2xl font-bold mb-2 text-slate-900">You're going!</h3>
                <p className="text-slate-500 mb-6 font-medium">Have your QR code ready at the door.</p>
                
                <div className="p-4 bg-white border-2 border-slate-100 rounded-xl shadow-sm mb-4 inline-block">
                  {/* CHANGED TO CANVAS AND ADDED ID */}
                  <QRCodeCanvas id="ticket-qr" value={purchasedTicket.qrCode} size={200} level="H" />
                </div>
                
                <p className="font-mono text-xs text-slate-400 mb-4 tracking-widest">{purchasedTicket.qrCode}</p>
                
                {/* NEW DOWNLOAD BUTTON */}
                <button 
                  onClick={downloadTicket}
                  className="mb-4 flex items-center justify-center gap-2 w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-2 rounded-xl font-bold hover:bg-indigo-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Save QR to Device
                </button>
                
                <button 
                  onClick={() => { 
                    setSelectedEvent(null); 
                    setPurchasedTicket(null); 
                    window.location.reload(); 
                  }} 
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition"
                >
                  Close & Return to Events
                </button>
              </div>
            ) : (
              /* ELSE: SHOW THE REGULAR CHECKOUT FORM */
              <div className="text-left">
                <h3 className="text-2xl font-bold mb-1 text-slate-900">Checkout</h3>
                <p className="text-slate-500 mb-6 font-medium">{selectedEvent.title}</p>
                
                <form onSubmit={handleCompletePurchase} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" required placeholder="name@example.com" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900"
                    />
                  </div>
                  <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                    Confirm & Pay
                  </button>
                  <button onClick={() => setSelectedEvent(null)} type="button" className="w-full text-slate-400 text-sm font-semibold hover:text-slate-600 transition">
                    Go Back
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

// ==========================================
// MAIN APP ROUTER (SIDEBAR LAYOUT)
// ==========================================
function App() {
  return (
    <Router>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col">
          <div className="p-6 text-2xl font-bold tracking-wider text-indigo-400">EVENTIA</div>
          <nav className="flex-1 px-4 space-y-2">
            <Link to="/" className="block px-4 py-2 rounded hover:bg-slate-800 transition">Dashboard</Link>
            <Link to="/create-event" className="block px-4 py-2 rounded hover:bg-slate-800 transition">Create Event</Link>
            {/* NEW NAV LINK */}
            <Link to="/explore" className="block px-4 py-2 rounded border border-indigo-500/30 text-indigo-300 hover:bg-slate-800 transition">
              View as Buyer 🌐
            </Link>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-event" element={<CreateEvent />} />
            {/* NEW ROUTE */}
            <Route path="/explore" element={<PublicEvents />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}




export default App;