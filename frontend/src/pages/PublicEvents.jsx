import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../services/api';

const PublicEvents = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [email, setEmail] = useState('');
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [searchParams] = useSearchParams();

  const tenantId = searchParams.get('tenantId') || "30ceea06-7513-45b5-96e5-a2377359e6ba";

  useEffect(() => {
    api.get(`/api/events?tenantId=${tenantId}`)
      .then(res => setEvents(res.data))
      .catch(err => console.error("Fetch error", err));
  }, [tenantId]);

  const handleCompletePurchase = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/tickets/purchase', {
        eventId: selectedEvent.id,
        customerEmail: email,
        tenantId
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
      const downloadLink = document.createElement("a");
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
                <button onClick={() => { setSelectedEvent(null); setPurchasedTicket(null); }} className="mt-2 w-full text-slate-500">Close</button>
              </div>
            ) : (
              <form onSubmit={handleCompletePurchase} className="text-left space-y-4">
                <h3 className="text-2xl font-bold">Checkout</h3>
                <input
                  type="email" required placeholder="Email" className="w-full border p-3 rounded-xl"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Pay Now</button>
                <button type="button" onClick={() => setSelectedEvent(null)} className="w-full text-slate-400">Cancel</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicEvents;
