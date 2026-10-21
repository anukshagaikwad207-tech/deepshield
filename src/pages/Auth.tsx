import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthProps {
  onAuthSuccess?: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps = {}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);
    setCanResendConfirmation(false);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setMessage('Account created successfully!');
          onAuthSuccess?.();
        } else {
          setMessage(
            'Account created. Please check your email inbox (and spam folder) for a confirmation link, then sign in.'
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          onAuthSuccess?.();
        }
      }
    } catch (error: unknown) {
      setIsError(true);
      const errMsg =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      if (
        errMsg.toLowerCase().includes('email not confirmed') ||
        (error as { code?: string })?.code === 'email_not_confirmed'
      ) {
        setMessage(
          'Email not confirmed yet. Please verify your email using the link sent to your inbox before signing in.'
        );
        setCanResendConfirmation(true);
      } else {
        setMessage(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (error) throw error;
      setMessage('Confirmation link resent! Please check your inbox.');
      setIsError(false);
      setCanResendConfirmation(false);
    } catch (err: unknown) {
      setIsError(true);
      setMessage(
        err instanceof Error
          ? err.message
          : 'Failed to resend confirmation email.'
      );
    } finally {
      setResending(false);
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '15px',
    marginTop: '7px',
    background: '#ffffff',
    color: '#0f172a',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '32px',
          boxSizing: 'border-box',
          borderRadius: '16px',
          background: '#ffffff',
          color: '#0f172a',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '28px' }}>
          DeepShield AI
        </h1>

        <p style={{ margin: '0 0 28px', color: '#475569', lineHeight: 1.5 }}>
          {mode === 'signin'
            ? 'Sign in to access your private analysis history.'
            : 'Create an account to keep your analysis results private.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="auth-email"
            style={{ display: 'block', fontWeight: 600, fontSize: '14px' }}
          >
            Email address
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />

          <label
            htmlFor="auth-password"
            style={{
              display: 'block',
              marginTop: '18px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={
              mode === 'signin' ? 'current-password' : 'new-password'
            }
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            style={inputStyle}
          />

          {message && (
            <p
              role="status"
              style={{
                marginTop: '16px',
                fontSize: '14px',
                lineHeight: 1.5,
                color: isError ? '#b91c1c' : '#166534',
              }}
            >
              {message}
            </p>
          )}

          {canResendConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                border: '1px solid #93c5fd',
                borderRadius: '6px',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '13px',
                fontWeight: 600,
                cursor: resending ? 'wait' : 'pointer',
                width: '100%',
              }}
            >
              {resending ? 'Sending...' : 'Resend Confirmation Email'}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '24px',
              padding: '13px',
              border: 'none',
              borderRadius: '8px',
              background: loading ? '#64748b' : '#2563eb',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        <p
          style={{
            margin: '22px 0 0',
            textAlign: 'center',
            fontSize: '14px',
            color: '#475569',
          }}
        >
          {mode === 'signin'
            ? "Don't have an account?"
            : 'Already have an account?'}
          {' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setMessage('');
              setIsError(false);
            }}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              color: '#2563eb',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </section>
    </main>
  );
}