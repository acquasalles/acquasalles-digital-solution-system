import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { useIntl } from 'react-intl';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const intl = useIntl();

  useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation will be handled by the useEffect above
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="flex items-center justify-center mb-8">
          <KeyRound className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">
          {intl.formatMessage({ id: 'auth.login.title' })}
        </h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {intl.formatMessage({ id: 'auth.login.error' })}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              {intl.formatMessage({ id: 'auth.login.email' })}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              {intl.formatMessage({ id: 'auth.login.password' })}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                {intl.formatMessage({ id: 'auth.login.signingIn' })}
              </>
            ) : (
              intl.formatMessage({ id: 'auth.login.submit' })
            )}
          </button>
          <div className="mt-4 text-center">
            <span className="text-gray-600">
              {intl.formatMessage({ id: 'auth.login.noAccount' })}
            </span>{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
              {intl.formatMessage({ id: 'auth.login.signUp' })}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}