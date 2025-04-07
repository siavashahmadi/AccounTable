import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get the return URL from location state or default to dashboard
  const from = location.state?.from || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleNetworkRetry = async () => {
    setNetworkError(false);
    handleSubmit(new Event('retry'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Please enter both email and password.",
      });
      return;
    }
    
    setIsLoading(true);
    setNetworkError(false);

    try {
      // Attempt to sign in
      const { data, error } = await signIn({
        email,
        password
      });
      
      if (error) {
        if (error.isNetworkError) {
          setNetworkError(true);
          throw new Error(error.message);
        }
        
        // Handle specific error cases
        if (error.message?.includes("Invalid login")) {
          throw new Error("Invalid email or password. Please try again.");
        } else if (error.message?.includes("Email not confirmed")) {
          throw new Error("Please confirm your email before signing in.");
        } else {
          throw error;
        }
      }
      
      if (!data?.session) {
        throw new Error('Sign in failed - no session created');
      }
      
      // Success - show toast and redirect
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
      
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password. Please try again.",
      });
    } finally {
      if (!networkError) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          {networkError ? (
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 p-4 rounded-md">
                <h3 className="font-medium text-destructive mb-2">Network Error</h3>
                <p className="text-sm mb-4">
                  Unable to connect to the authentication service. Please check your internet connection and try again.
                </p>
                <Button 
                  onClick={handleNetworkRetry}
                  variant="outline"
                  className="w-full"
                >
                  Retry Connection
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                <div className="text-center text-sm">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline">
                    Sign up
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login; 