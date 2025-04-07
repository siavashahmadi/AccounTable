import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

// Simple protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading, authError, isAuthenticated } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);
  
  // Set a timeout to prevent infinite loading
  useEffect(() => {
    let timeoutId = null;
    
    if (loading) {
      console.log('ProtectedRoute: Setting auth verification timeout');
      timeoutId = setTimeout(() => {
        console.log('ProtectedRoute: Auth verification timeout occurred');
        setTimeoutOccurred(true);
      }, 10000); // 10 second timeout
    }
    
    return () => {
      if (timeoutId) {
        console.log('ProtectedRoute: Clearing auth verification timeout');
        clearTimeout(timeoutId);
      }
    };
  }, [loading]);
  
  // Show loading state
  if (loading && !timeoutOccurred) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }
  
  // Show timeout error if it occurred
  if (timeoutOccurred && loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4 max-w-md p-6 rounded-lg bg-card shadow-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Authentication Timeout</h2>
          <p className="text-center text-muted-foreground">
            We're having trouble verifying your authentication status. This could be due to network issues.
          </p>
          <div className="flex space-x-4 mt-2">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
            <button 
              onClick={() => {
                // Clear any auth state before redirecting
                localStorage.removeItem('sb-kjkdobwgvflqipyikakn-auth-token');
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show auth error if one occurred
  if (authError) {
    console.error('ProtectedRoute: Auth error occurred', authError);
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4 max-w-md p-6 rounded-lg bg-card shadow-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Authentication Error</h2>
          <p className="text-center text-muted-foreground">
            {authError.message || "An error occurred while authenticating. Please try again."}
          </p>
          <div className="flex space-x-4 mt-2">
            <button 
              onClick={() => {
                // Clear any auth state before redirecting
                localStorage.removeItem('sb-kjkdobwgvflqipyikakn-auth-token');
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    toast({
      title: "Authentication required",
      description: "Please sign in to access this page.",
      duration: 6000, // Use consistent 6 second duration
    });
    
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  // If authenticated, render children
  return children;
};

export default ProtectedRoute; 