'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lock, CheckCircle } from 'lucide-react';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/v1/auth/reset-password', { token, password });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            className="pl-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const [searchParamsLoaded, setSearchParamsLoaded] = React.useState(false);
  const [token, setToken] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
    setSearchParamsLoaded(true);
  }, []);

  if (!searchParamsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Password Reset</CardTitle>
            <CardDescription>Your password has been reset successfully</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Invalid Link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button variant="outline" onClick={() => window.location.href = '/forgot-password'} className="w-full">
              Request a new reset link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} onSuccess={() => setSuccess(true)} />
        </CardContent>
      </Card>
    </div>
  );
}
