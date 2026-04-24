import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.post('/api/auth/login', { email, password });
        login(res.data.token);
        const decoded = jwtDecode(res.data.token);
        navigate(decoded.role === 'ADMIN' ? '/admin' : '/dashboard');
      } else {
        const res = await api.post('/api/auth/register', { email, password, role: 'ORGANIZER' });
        login(res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg === 'EMAIL_IN_USE') setError('An account with this email already exists.');
      else if (mode === 'login') setError('Invalid email or password.');
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="bg-white rounded-2xl shadow-xl w-96 overflow-hidden">

        {/* Tab toggle */}
        <div className="flex">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-4 text-sm font-bold transition ${
              mode === 'login'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                : 'bg-slate-50 text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-4 text-sm font-bold transition ${
              mode === 'register'
                ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                : 'bg-slate-50 text-slate-400 hover:text-slate-600'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <input
            type="email" placeholder="Email address" required
            className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="Password" required
            className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-slate-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="text-indigo-500 font-semibold hover:underline">
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </form>

        <div className="px-8 pb-6 text-center">
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 transition">
            ← Back to public site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
