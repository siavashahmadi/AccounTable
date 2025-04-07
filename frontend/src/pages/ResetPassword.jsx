import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if we have a recovery token in the URL
  useEffect(() => {
    const checkRecoveryToken = async () => {
      // Get hash fragment from URL (Supabase adds #access_token=...)
      const hash = window.location.hash;
      
      if (!hash || !hash.includes('access_token=')) {
        toast({
          variant: "destructive",
          title: "Invalid recovery link",
          description: "This password reset link is invalid or has expired.",
        });
        navigate('/forgot-password');
      }
    };

    checkRecoveryToken();
  }, [navigate, toast]);

  const validatePassword = () => {
    const newErrors = {};
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    
    setIsLoading(true);
    
    try {
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset. You can now log in with your new password.",
        duration: 5000,
      });
      
      // Short delay before navigating to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: error.message || "Failed to reset your password. Please try again.",
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
            <CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle>
            <CardDescription className="text-center">
              Create a strong password for your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
                )}
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
                    <span>Updating password...</span>
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword; 