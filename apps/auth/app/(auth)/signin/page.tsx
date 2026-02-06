'use client';
import { useState } from 'react';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function submit(_e: React.FormEvent) {
    _e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok) {
        // Store a simple dev-only session in localStorage
        localStorage.setItem('sdfwa_user', JSON.stringify(json.user));
        setMessage(
          'Signed in (dev-only). You can close this tab and visit other apps.'
        );
      } else {
        setMessage(json.error || 'Sign in failed');
      }
    } catch (_err) {
      setMessage('Sign in error');
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Auth — Sign In (dev only)</h1>
      <form
        onSubmit={submit}
        style={{ display: 'grid', gap: 8, maxWidth: 360 }}
      >
        <label>
          Username
          <input
            value={username}
            onChange={(_e) => setUsername(_e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(_e) => setPassword(_e.target.value)}
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
      {message && <p>{message}</p>}
      <p style={{ marginTop: 12, color: '#666' }}>
        Dev credential: <strong>admin</strong> / <strong>admin</strong>
      </p>
    </main>
  );
}
