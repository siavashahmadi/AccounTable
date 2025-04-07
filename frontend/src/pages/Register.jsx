import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, Mail, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { db } from '../lib/api';

const Register = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    invitationToken: invitationToken || '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [validatingToken, setValidatingToken] = useState(Boolean(invitationToken));
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validate invitation token if present
  useEffect(() => {
    const validateInvitationToken = async () => {
      if (!invitationToken) return;
      
      try {
        setValidatingToken(true);
        const data = await db.validateInvitation(invitationToken);
        
        if (data && data.valid) {
          setInvitationInfo(data);
          setFormData(prev => ({
            ...prev,
            email: data.email
          }));
          
          toast({
            title: "Invitation found",
            description: `You've been invited by ${data.inviter_name} to join as their accountability partner.`,
            duration: 6000,
          });
        }
      } catch (error) {
        console.error('Error validating invitation token:', error);
        toast({
          variant: "destructive",
          title: "Invalid invitation",
          description: "The invitation link is invalid or has expired.",
          duration: 6000,
        });
        // Remove the invitation token from URL
        navigate('/register', { replace: true });
      } finally {
        setValidatingToken(false);
      }
    };
    
    validateInvitationToken();
  }, [invitationToken, navigate, toast]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !formSubmitted) {
      navigate('/dashboard');
    }
  }, [user, navigate, formSubmitted]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleTimeZoneChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      timeZone: value,
    }));
    // Clear error
    if (errors.timeZone) {
      setErrors((prev) => ({
        ...prev,
        timeZone: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate first name
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length > 50) {
      newErrors.firstName = 'First name is too long (max 50 characters)';
    }
    
    // Validate last name
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length > 50) {
      newErrors.lastName = 'Last name is too long (max 50 characters)';
    }
    
    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }
    
    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate timezone
    if (!formData.timeZone) {
      newErrors.timeZone = 'Time zone is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setFormSubmitted(true);
    
    try {
      // Prepare user data for registration
      const userData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        time_zone: formData.timeZone,
        invitation_token: formData.invitationToken,
      };
      
      // Call Supabase Auth signup
      const { data, error } = await signUp(userData);
      
      if (error) {
        // Handle specific error cases
        if (error.message?.includes('email')) {
          setErrors(prev => ({ ...prev, email: error.message }));
          throw new Error('This email address is already in use.');
        } else {
          throw error;
        }
      }
      
      if (!data) {
        throw new Error('No response from registration service');
      }
      
      // Handle email confirmation case
      if (data.emailConfirmationRequired) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please check your email to complete registration.",
          duration: 6000,
        });
        // Navigate to login page after a short delay
        setTimeout(() => {
          setIsLoading(false);
          navigate('/login');
        }, 2000);
        return;
      }
      
      // Handle immediate success case (no email confirmation required)
      toast({
        title: "Account created",
        description: invitationInfo 
          ? `Your account has been created successfully. You are now ${invitationInfo.inviter_name}'s accountability partner!` 
          : "Your account has been created successfully.",
        duration: 5000,
      });
      
      // Navigate to dashboard or login based on session presence
      setTimeout(() => {
        setIsLoading(false);
        if (data.session) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      setFormSubmitted(false);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Registration failed. Please try again.",
        duration: 4000,
      });
    }
  };

  if (validatingToken) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="w-full max-w-md p-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Validating invitation...</h2>
          <p className="text-muted-foreground">Please wait while we check your invitation details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              {invitationInfo 
                ? `Join as ${invitationInfo.inviter_name}'s accountability partner` 
                : "Enter your information to create an account"}
            </CardDescription>
          </CardHeader>
          
          {invitationInfo && (
            <div className="px-6 pb-2">
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">Partnership Invitation</AlertTitle>
                <AlertDescription className="text-blue-600">
                  You've been invited to join as an accountability partner.
                  {invitationInfo.message && (
                    <div className="mt-2 p-2 bg-blue-100 rounded-md text-sm italic">
                      "{invitationInfo.message}"
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    aria-invalid={errors.firstName ? "true" : "false"}
                    disabled={isLoading}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-destructive text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    aria-invalid={errors.lastName ? "true" : "false"}
                    disabled={isLoading}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-destructive text-xs mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={errors.email ? "true" : "false"}
                  disabled={isLoading || Boolean(invitationInfo)}
                  required
                />
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email}</p>
                )}
                {invitationInfo && (
                  <p className="text-muted-foreground text-xs flex items-center mt-1">
                    <Info className="h-3 w-3 mr-1" />
                    Email is locked because you're using an invitation link
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={errors.password ? "true" : "false"}
                  disabled={isLoading}
                  required
                />
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">{errors.password}</p>
                )}
                {formData.password && !errors.password && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Password strength: {formData.password.length >= 10 ? 'Strong' : 'Medium'}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  disabled={isLoading}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone</Label>
                <Select
                  value={formData.timeZone}
                  onValueChange={handleTimeZoneChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="timeZone" aria-invalid={errors.timeZone ? "true" : "false"}>
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {Intl.supportedValuesOf('timeZone').map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timeZone && (
                  <p className="text-destructive text-xs mt-1">{errors.timeZone}</p>
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
                    <span>Creating account...</span>
                  </div>
                ) : (
                  invitationInfo ? "Accept Invitation & Join" : "Create account"
                )}
              </Button>
              <div className="text-center text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register; 