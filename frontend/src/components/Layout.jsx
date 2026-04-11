import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user } = useContext(AuthContext);

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold text-indigo-400">EVENTIA</div>
        <nav className="flex-1 px-4 space-y-2">
          <Link to="/" className="block px-4 py-2 rounded hover:bg-slate-800">Dashboard</Link>
          <Link to="/create-event" className="block px-4 py-2 rounded hover:bg-slate-800">Create Event</Link>
          <Link
            to={`/explore?tenantId=${user?.tenantId}`}
            className="block px-4 py-2 rounded border border-indigo-500/30 text-indigo-300 hover:bg-slate-800 transition"
          >
            View as Buyer
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
