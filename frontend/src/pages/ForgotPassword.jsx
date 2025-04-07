import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Request password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      // Show success message
      setIsSuccess(true);
      toast({
        title: "Email sent",
        description: "Check your email for the password reset link.",
        duration: 5000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: error.message || "Failed to send password reset email. Please try again.",
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
            <CardTitle className="text-2xl font-bold text-center">Reset Your Password</CardTitle>
            <CardDescription className="text-center">
              {isSuccess 
                ? "Check your email for a password reset link" 
                : "Enter your email address and we'll send you a password reset link"}
            </CardDescription>
          </CardHeader>
          
          {!isSuccess ? (
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
                      <span>Sending...</span>
                    </div>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
                <div className="text-center text-sm">
                  Remember your password?{' '}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4">
              <div className="text-center p-4">
                <div className="mx-auto my-4 bg-primary/10 text-primary h-12 w-12 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <h3 className="text-lg font-medium mt-4">Check your email</h3>
                <p className="text-muted-foreground mt-2">
                  We've sent you a password reset link to {email}
                </p>
                
                <div className="mt-6">
                  <Button 
                    variant="outline" 
                    className="mr-2"
                    onClick={() => navigate('/login')}
                  >
                    Back to login
                  </Button>
                  <Button
                    onClick={() => {
                      setEmail('');
                      setIsSuccess(false);
                    }}
                  >
                    Send again
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword; 