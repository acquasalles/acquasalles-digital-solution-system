import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useIntl } from 'react-intl';

export function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const intl = useIntl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(intl.formatMessage({ id: 'auth.signup.passwordMismatch' }));
      return;
    }

    try {
      await signUp(email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
          <div className="text-green-600 mb-4">
            <UserPlus className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold mb-4">
            {intl.formatMessage({ id: 'auth.signup.success' })}
          </h2>
          <p className="text-gray-600 mb-6">
            {intl.formatMessage({ id: 'auth.signup.checkEmail' })}
          </p>
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {intl.formatMessage({ id: 'auth.signup.returnToLogin' })}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="flex items-center justify-center mb-8">
          <UserPlus className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">
          {intl.formatMessage({ id: 'auth.signup.title' })}
        </h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              {intl.formatMessage({ id: 'auth.signup.email' })}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              {intl.formatMessage({ id: 'auth.signup.password' })}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              {intl.formatMessage({ id: 'auth.signup.confirmPassword' })}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {intl.formatMessage({ id: 'auth.signup.submit' })}
          </button>
          <div className="mt-4 text-center">
            <span className="text-gray-600">
              {intl.formatMessage({ id: 'auth.signup.hasAccount' })}
            </span>{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              {intl.formatMessage({ id: 'auth.signup.signIn' })}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}