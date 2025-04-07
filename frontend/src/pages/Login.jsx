import React, { useState } from 'react';
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get the return URL from location state or default to dashboard
  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Attempt to sign in
      const { data, error } = await signIn({
        email,
        password
      });
      
      if (error && error.message.includes('timed out')) {
        // Let's check if we're authenticated anyway before giving up
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          toast({
            title: "Success",
            description: "You have successfully logged in",
          });
          
          navigate(from, { replace: true });
          return;
        }
        
        // If we get here, the user really isn't logged in
        throw error;
      } else if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('Sign in failed - no response data');
      }
      
      // If we have a session or authenticated user, consider it a success even if profile is minimal
      if (data.session || data.user) {
        toast({
          title: "Success",
          description: "You have successfully logged in",
        });
        
        navigate(from, { replace: true });
      } else {
        throw new Error('Sign in failed - no session created');
      }
    } catch (error) {
      // Create a user-friendly error message
      let errorMessage = "Invalid email or password. Please try again.";
      
      if (error.message?.includes("confirmation")) {
        errorMessage = "Please confirm your email before signing in.";
      } else if (error.message?.includes("timed out")) {
        errorMessage = "Login timed out. Please try again or check your internet connection.";
      }
      
      toast({
        variant: "destructive",
        title: "Login failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
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
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
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
        </Card>
      </div>
    </div>
  );
};

export default Login; 