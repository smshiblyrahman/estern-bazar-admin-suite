"use client";
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, Lock, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignupRequest, setShowSignupRequest] = useState(false);
  const [signupRequest, setSignupRequest] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'CUSTOMER' as 'CUSTOMER' | 'ADMIN' | 'CALL_AGENT',
    reason: ''
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await signIn('credentials', { 
        email, 
        password, 
        redirect: false 
      });
      
      if ((res as any)?.error) {
        if ((res as any).error === 'CredentialsSignin') {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setError('Sign-in failed. Please try again.');
        }
      } else if (res?.ok) {
        // Redirect based on user role
        window.location.href = '/admin/dashboard';
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  const handleSignupRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    
    try {
      const response = await fetch('/api/auth/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupRequest)
      });
      
      if (response.ok) {
        setSignupSuccess(true);
        setSignupRequest({ name: '', email: '', phone: '', role: 'CUSTOMER', reason: '' });
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to submit signup request');
      }
    } catch (err) {
      setError('Failed to submit signup request. Please try again.');
    }
    
    setSignupLoading(false);
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Request Submitted</h2>
              <p className="text-gray-600">
                Your account request has been submitted successfully. An administrator will review your request and create your account if approved.
              </p>
              <p className="text-sm text-gray-500">
                You will receive an email notification once your account is ready.
              </p>
              <Button 
                onClick={() => {
                  setShowSignupRequest(false);
                  setSignupSuccess(false);
                }}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Estern Bazar</h1>
          <p className="mt-2 text-sm text-gray-600">Admin Portal Access</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
            <p className="text-center text-sm text-gray-600">
              Access your admin account
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Signup Request */}
        {!showSignupRequest ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <UserPlus className="h-8 w-8 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Don't have an account?</h3>
                  <p className="text-sm text-gray-600">
                    Request access to the admin portal
                  </p>
                </div>
                <Button 
                  onClick={() => setShowSignupRequest(true)}
                  variant="outline"
                  className="w-full"
                >
                  Request Account Access
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Request Account Access</CardTitle>
              <p className="text-center text-sm text-gray-600">
                Submit your details for admin review
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignupRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={signupRequest.name}
                    onChange={(e) => setSignupRequest({...signupRequest, name: e.target.value})}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={signupRequest.email}
                    onChange={(e) => setSignupRequest({...signupRequest, email: e.target.value})}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={signupRequest.phone}
                    onChange={(e) => setSignupRequest({...signupRequest, phone: e.target.value})}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requested Role
                  </label>
                  <select
                    value={signupRequest.role}
                    onChange={(e) => setSignupRequest({...signupRequest, role: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="ADMIN">Admin</option>
                    <option value="CALL_AGENT">Call Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Access
                  </label>
                  <textarea
                    value={signupRequest.reason}
                    onChange={(e) => setSignupRequest({...signupRequest, reason: e.target.value})}
                    placeholder="Please explain why you need access to the admin portal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="button"
                    onClick={() => setShowSignupRequest(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={signupLoading}
                    className="flex-1"
                  >
                    {signupLoading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Demo Credentials */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Demo Credentials</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div><Badge variant="outline" className="mr-2">SUPER_ADMIN</Badge> admin@esternbazar.com / Admin123!</div>
                <div><Badge variant="outline" className="mr-2">ADMIN</Badge> admin@example.com / Admin123!</div>
                <div><Badge variant="outline" className="mr-2">CALL_AGENT</Badge> callagent@esternbazar.com / CallAgent123!</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Back to Estern Bazar Website
          </Link>
        </div>
      </div>
    </div>
  );
}


