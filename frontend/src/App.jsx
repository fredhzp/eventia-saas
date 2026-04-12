import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import AdminDashboard from './pages/AdminDashboard';
import MyTickets from './pages/MyTickets';
import CheckIn from './pages/CheckIn';

function AppContent() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  const isOrganizer = user?.role === 'ORGANIZER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Routes>
      {/* Always public */}
      <Route path="/" element={<Home />} />

      {/* Login — skip if already authenticated */}
      <Route path="/login" element={
        isAdmin ? <Navigate to="/admin" /> :
        isOrganizer ? <Navigate to="/dashboard" /> :
        <Login />
      } />

      {/* Admin-only */}
      <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/login" />} />

      {/* Organizer-only pages — flat, no nested Routes */}
      <Route
        path="/dashboard"
        element={isOrganizer ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />}
      />
      <Route
        path="/dashboard/create-event"
        element={isOrganizer ? <Layout><CreateEvent /></Layout> : <Navigate to="/login" />}
      />

      {/* Public ticket lookup */}
      <Route path="/my-tickets" element={<MyTickets />} />

      {/* Staff check-in */}
      <Route path="/checkin" element={<CheckIn />} />

      {/* Anything else → home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
