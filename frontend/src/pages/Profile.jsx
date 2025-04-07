import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Pencil, Loader2, Save, ArrowLeft, Lock, KeyRound, Palette } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '../components/ui/dialog';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, updateProfile, loading: authLoading } = useAuth();
  const { theme, setTheme, themes } = useTheme();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    avatar_url: '',
  });
  const [formChanged, setFormChanged] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login', { state: { from: '/profile' } });
      return;
    }

    // Initialize form with user data
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      bio: user.bio || '',
      time_zone: user.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      avatar_url: user.avatar_url || '',
    });
    
    setLoading(false);
  }, [user, authLoading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      // Check if any field has changed
      const hasChanged = 
        newData.first_name !== user?.first_name || 
        newData.last_name !== user?.last_name || 
        newData.bio !== user?.bio || 
        newData.time_zone !== user?.time_zone;
      
      setFormChanged(hasChanged);
      return newData;
    });
  };

  const handleTimeZoneChange = (value) => {
    setFormData((prev) => {
      const newData = { ...prev, time_zone: value };
      
      // Update form changed status
      const hasChanged = newData.time_zone !== user?.time_zone || 
        newData.first_name !== user?.first_name || 
        newData.last_name !== user?.last_name || 
        newData.bio !== user?.bio;
      
      setFormChanged(hasChanged);
      return newData;
    });
  };

  const handleAvatarUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Avatar image must be less than 2MB"
        });
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Avatar must be a JPEG, PNG, GIF, or WEBP image"
        });
        return;
      }

      setUpdating(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Delete old avatar if exists and is not a default avatar
      if (formData.avatar_url && formData.avatar_url.includes(`avatars/${user.id}`)) {
        try {
          const oldPath = formData.avatar_url.split('/').slice(-2).join('/');
          await supabase.storage.from('avatars').remove([oldPath]);
        } catch (error) {
          console.error('Error removing old avatar:', error);
          // Continue with upload even if delete fails
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl }, error: urlError } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (urlError) throw urlError;

      setFormData((prev) => {
        const newData = { ...prev, avatar_url: publicUrl };
        setFormChanged(true);
        return newData;
      });

      toast({
        title: "Success",
        description: "Avatar uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Error uploading avatar",
        description: error.message || "Failed to upload avatar"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const { data, error } = await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        time_zone: formData.time_zone,
        avatar_url: formData.avatar_url,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      
      setFormChanged(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message || "Failed to update profile"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No email address found for your account."
      });
      return;
    }

    setResetLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for a link to reset your password."
      });
      
      // Close dialog
      setDialogOpen(false);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        variant: "destructive",
        title: "Failed to send reset email",
        description: error.message || "Please try again later."
      });
    } finally {
      setResetLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md mt-8">
        <CardHeader>
          <CardTitle>Please Log In</CardTitle>
          <CardDescription>You need to be logged in to view your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/login')} className="w-full">
            Log In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-6">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information and how others see you on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.avatar_url} alt={formData.first_name} />
                  <AvatarFallback>
                    {formData.first_name?.[0]}{formData.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <Pencil className="h-4 w-4" />
                      <span>Change avatar</span>
                    </div>
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      disabled={updating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      disabled={updating}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    disabled={updating}
                    placeholder="Tell others a bit about yourself..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_zone">Time Zone</Label>
                  <Select
                    value={formData.time_zone}
                    onValueChange={handleTimeZoneChange}
                    disabled={updating}
                  >
                    <SelectTrigger>
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
                </div>
              </div>

              <Button
                type="submit"
                disabled={!formChanged || updating}
                className="w-full"
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Theme Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Settings
            </CardTitle>
            <CardDescription>
              Customize the appearance of your dashboard by choosing a color theme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(themes).map(([key, value]) => (
                <Button
                  key={key}
                  variant={theme === value ? "default" : "outline"}
                  className="w-full h-24 relative"
                  onClick={() => setTheme(value)}
                >
                  <div className="absolute inset-3 rounded-md transition-colors"
                       style={{
                         background: `var(--primary)`,
                         border: theme === value ? '2px solid var(--primary)' : '1px solid var(--border)'
                       }}
                  />
                  <span className="relative z-10 capitalize mt-2">{key}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your account security settings and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="w-full"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              We'll send you an email with instructions to reset your password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={resetLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile; 