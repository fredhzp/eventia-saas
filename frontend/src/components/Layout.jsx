import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { logout } = useContext(AuthContext);
  const { pathname } = useLocation();

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`block px-4 py-2 rounded text-sm font-medium transition ${
        pathname === to ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <Link to="/" className="p-6 text-2xl font-bold text-indigo-400 hover:text-indigo-300 transition">
          EVENTIA
        </Link>
        <nav className="flex-1 px-4 space-y-1">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/dashboard/create-event', 'Create Event')}
          <Link
            to="/"
            className="block px-4 py-2 rounded text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition mt-4"
          >
            ← View Public Site
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 rounded text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
