import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from '../components/ui/label';
import { 
  Users, 
  UserPlus, 
  Check, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Search,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Ban,
  Mail
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';

const Partnerships = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partnerships, setPartnerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [invitationMessage, setInvitationMessage] = useState('');
  const [invitingPartner, setInvitingPartner] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteStep, setInviteStep] = useState('email'); // email, agreement, message
  const [showAgreementDetails, setShowAgreementDetails] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  
  // Partnership agreement state
  const [agreement, setAgreement] = useState({
    communication_frequency: 'weekly',
    check_in_days: [],
    expectations: '',
    commitment_level: 'moderate',
    feedback_style: 'balanced'
  });
  
  // Partner search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    goal_type: '',
    commitment_level: '',
  });

  useEffect(() => {
    const fetchPartnerships = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await db.getPartnerships();
        if (error) {
          if (error.message === 'No authenticated user') {
            // Handle unauthenticated case
            setPartnerships([]);
          } else {
            console.error('Error fetching partnerships:', error);
            toast({
              variant: "destructive",
              title: "Error loading partnerships",
              description: error.message || "Failed to load your partnerships",
            });
          }
        } else {
          setPartnerships(data || []);
        }
        
        // Fetch pending invitations
        const { data: invitationsData, error: invitationsError } = await db.getPendingInvitations();
        if (!invitationsError) {
          setPendingInvitations(invitationsData || []);
        }
      } catch (error) {
        console.error('Error fetching partnerships:', error);
        toast({
          variant: "destructive",
          title: "Error loading partnerships",
          description: error.message || "Failed to load your partnerships",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerships();
    // Only depend on user changes, not toast
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleInvitePartner = async () => {
    if (!partnerEmail) return;

    setInvitingPartner(true);
    try {
      // For new user invitations, we don't need to check if they exist
      if (isNewUser) {
        // Create the partnership with isNewUser=true
        const { data: newPartnership, error: createError } = await db.createPartnership(
          partnerEmail, 
          invitationMessage,
          agreement,
          true // isNewUser flag
        );
        
        if (createError) throw createError;
        
        toast({
          title: "Invitation email sent",
          description: `An invitation has been sent to ${partnerEmail}. They'll get an email to join the app and become your accountability partner.`,
        });
        
        // Refresh partnerships and invitations
        const { data: updatedPartnerships } = await db.getPartnerships();
        setPartnerships(updatedPartnerships || []);
        
        const { data: updatedInvitations } = await db.getPendingInvitations();
        setPendingInvitations(updatedInvitations || []);
        
        // Reset form and close dialog
        resetForm();
        return;
      }
      
      // For existing users
      // Check if user exists
      const { data: userData, error: userError } = await db.getUserByEmail(partnerEmail);
      
      if (userError || !userData) {
        toast({
          title: "User not registered",
          description: "This email isn't registered in the system yet. Would you like to send them an invitation to join?",
          action: (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => {
                setIsNewUser(true);
                toast({
                  title: "Option changed",
                  description: "You're now inviting a new user to join the platform."
                });
              }}
            >
              Invite New User
            </Button>
          ),
        });
        setInvitingPartner(false);
        return;
      }

      // Check if partnership already exists
      const { data: partnerships, error: partnershipError } = await db.getPartnerships();
      if (partnershipError) throw partnershipError;
      
      const alreadyPartners = partnerships?.some(p => 
        ((p.user1 && p.user1.id === userData.id) || (p.user2 && p.user2.id === userData.id)) && 
        p.status !== 'ended'
      );
      
      if (alreadyPartners) {
        toast({
          variant: "destructive",
          title: "Partnership exists",
          description: "You already have an active or pending partnership with this user.",
        });
        setInvitingPartner(false);
        return;
      }

      // Create the partnership
      const { data: newPartnership, error: createError } = await db.createPartnership(
        partnerEmail, 
        invitationMessage,
        agreement,
        false // existing user
      );
      
      if (createError) throw createError;
      
      toast({
        title: "Partnership invitation sent",
        description: `An invitation has been sent to ${partnerEmail}.`,
      });
      
      // Refresh partnerships
      const { data: updatedPartnerships } = await db.getPartnerships();
      setPartnerships(updatedPartnerships || []);
      
      // Reset form
      resetForm();
      
    } catch (error) {
      console.error('Error inviting partner:', error);
      toast({
        variant: "destructive",
        title: "Error inviting partner",
        description: error.message || "Failed to send partnership invitation",
      });
    } finally {
      setInvitingPartner(false);
    }
  };

  const resetForm = () => {
    setPartnerEmail('');
    setInvitationMessage('');
    setIsNewUser(false);
    setAgreement({
      communication_frequency: 'weekly',
      check_in_days: [],
      expectations: '',
      commitment_level: 'moderate',
      feedback_style: 'balanced'
    });
    setShowInviteDialog(false);
    setInviteStep('email');
  };

  const handleAcceptPartnership = async (partnershipId) => {
    try {
      const { data, error } = await db.acceptPartnership(partnershipId);
      
      if (error) throw error;
      
      toast({
        title: "Partnership accepted",
        description: "You have accepted the partnership invitation. Your trial period has begun.",
      });
      
      // Refresh partnerships
      const { data: updatedPartnerships } = await db.getPartnerships();
      setPartnerships(updatedPartnerships || []);
      
    } catch (error) {
      console.error('Error accepting partnership:', error);
      toast({
        variant: "destructive",
        title: "Error accepting partnership",
        description: error.message || "Failed to accept partnership invitation",
      });
    }
  };

  const handleDeclinePartnership = async (partnershipId) => {
    try {
      const { data, error } = await db.declinePartnership(partnershipId);
      
      if (error) throw error;
      
      toast({
        title: "Partnership declined",
        description: "You have declined the partnership invitation.",
      });
      
      // Refresh partnerships
      const { data: updatedPartnerships } = await db.getPartnerships();
      setPartnerships(updatedPartnerships || []);
      
    } catch (error) {
      console.error('Error declining partnership:', error);
      toast({
        variant: "destructive",
        title: "Error declining partnership",
        description: error.message || "Failed to decline partnership invitation",
      });
    }
  };

  const handleFinalizePartnership = async (partnershipId) => {
    try {
      const { data, error } = await db.finalizePartnership(partnershipId);
      
      if (error) throw error;
      
      toast({
        title: "Partnership finalized",
        description: "Your trial period has ended and the partnership is now active.",
      });
      
      // Refresh partnerships
      const { data: updatedPartnerships } = await db.getPartnerships();
      setPartnerships(updatedPartnerships || []);
      
    } catch (error) {
      console.error('Error finalizing partnership:', error);
      toast({
        variant: "destructive",
        title: "Error finalizing partnership",
        description: error.message || "Failed to finalize partnership",
      });
    }
  };

  const handleEndTrialPartnership = async (partnershipId) => {
    try {
      const { data, error } = await db.endTrialPartnership(partnershipId);
      
      if (error) throw error;
      
      toast({
        title: "Trial period ended",
        description: "You have ended the trial partnership.",
      });
      
      // Refresh partnerships
      const { data: updatedPartnerships } = await db.getPartnerships();
      setPartnerships(updatedPartnerships || []);
      
    } catch (error) {
      console.error('Error ending trial partnership:', error);
      toast({
        variant: "destructive",
        title: "Error ending trial",
        description: error.message || "Failed to end trial partnership",
      });
    }
  };

  const handleCheckInDayToggle = (day) => {
    const updatedDays = [...agreement.check_in_days];
    if (updatedDays.includes(day)) {
      const index = updatedDays.indexOf(day);
      updatedDays.splice(index, 1);
    } else {
      updatedDays.push(day);
    }
    setAgreement({
      ...agreement,
      check_in_days: updatedDays
    });
  };

  const searchPartners = async () => {
    if (!searchQuery.trim() && !searchFilters.goal_type && !searchFilters.commitment_level) {
      return;
    }
    
    setSearchLoading(true);
    try {
      const { data, error } = await db.searchPartners({
        query: searchQuery.trim(),
        ...searchFilters
      });
      
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching partners:', error);
      toast({
        variant: "destructive",
        title: "Error searching",
        description: error.message || "Failed to search for partners",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Helper function to get partner's name
  const getPartnerInfo = (partnership) => {
    if (!partnership) return { name: '', email: '' };
    const isUserOne = partnership.user1?.id === user?.id;
    const partner = isUserOne ? partnership.user2 : partnership.user1;
    return { 
      name: partner ? `${partner.first_name} ${partner.last_name}` : 'Unknown User',
      email: partner ? partner.email : '',
      id: partner ? partner.id : ''
    };
  };

  // Format date for readability
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Check if a trial is ending soon (within 3 days)
  const isTrialEndingSoon = (trialEndDate) => {
    if (!trialEndDate) return false;
    const endDate = new Date(trialEndDate);
    const now = new Date();
    const diffDays = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading partnerships...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Partnerships</h1>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus size={16} className="mr-2" />
          Invite Partner
        </Button>
      </div>

      {/* Partnership Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="trial">Trial</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="ended">Ended</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {renderPartnershipsList(partnerships)}
        </TabsContent>
        
        <TabsContent value="pending" className="space-y-4">
          {renderPartnershipsList(partnerships.filter(p => p.status === 'pending'))}
        </TabsContent>
        
        <TabsContent value="trial" className="space-y-4">
          {renderPartnershipsList(partnerships.filter(p => p.status === 'trial'))}
        </TabsContent>
        
        <TabsContent value="active" className="space-y-4">
          {renderPartnershipsList(partnerships.filter(p => p.status === 'active'))}
        </TabsContent>
        
        <TabsContent value="ended" className="space-y-4">
          {renderPartnershipsList(partnerships.filter(p => p.status === 'ended'))}
        </TabsContent>
      </Tabs>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Pending Email Invitations</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingInvitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Mail className="mr-2 h-5 w-5" />
                    Invitation to {invitation.email}
                  </CardTitle>
                  <CardDescription>
                    Sent on {formatDate(invitation.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Status: <Badge variant="outline" className="ml-1 capitalize">
                      {invitation.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires: {formatDate(invitation.expires_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Invite Partner Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a partner</DialogTitle>
            <DialogDescription>
              Create an accountability partnership with someone you trust.
            </DialogDescription>
          </DialogHeader>
          
          {inviteStep === 'email' && (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="partnerEmail">Partner's Email</Label>
                  <Input
                    id="partnerEmail"
                    type="email"
                    placeholder="email@example.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    required
                  />
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox 
                      id="isNewUser" 
                      checked={isNewUser}
                      onCheckedChange={() => setIsNewUser(!isNewUser)}
                    />
                    <Label htmlFor="isNewUser" className="font-normal">
                      This person doesn't have an account yet
                    </Label>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    {isNewUser 
                      ? "We'll send them an email invitation to join AccounTable as your accountability partner." 
                      : "Your partner needs to have an account to join you"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="button"
                  disabled={!partnerEmail} 
                  onClick={() => setInviteStep('agreement')}
                >
                  Next
                </Button>
              </DialogFooter>
            </>
          )}
          
          {inviteStep === 'agreement' && (
            <>
              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="communicationFrequency">Communication Frequency</Label>
                  <Select 
                    value={agreement.communication_frequency}
                    onValueChange={(value) => setAgreement({...agreement, communication_frequency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Check-in Days</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`day-${day}`} 
                          checked={agreement.check_in_days.includes(day)}
                          onCheckedChange={() => handleCheckInDayToggle(day)}
                        />
                        <Label htmlFor={`day-${day}`} className="capitalize">
                          {day.slice(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expectations">Partnership Expectations</Label>
                  <Textarea
                    id="expectations"
                    placeholder="Describe your expectations for this partnership"
                    value={agreement.expectations}
                    onChange={(e) => setAgreement({...agreement, expectations: e.target.value})}
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="commitmentLevel">Commitment Level</Label>
                  <Select 
                    value={agreement.commitment_level}
                    onValueChange={(value) => setAgreement({...agreement, commitment_level: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select commitment level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="strict">Strict</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="feedbackStyle">Feedback Style</Label>
                  <Select 
                    value={agreement.feedback_style}
                    onValueChange={(value) => setAgreement({...agreement, feedback_style: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select feedback style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="gentle">Gentle</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteStep('email')}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setInviteStep('message')}
                >
                  Next
                </Button>
              </DialogFooter>
            </>
          )}
          
          {inviteStep === 'message' && (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invitationMessage">Invitation Message</Label>
                  <Textarea
                    id="invitationMessage"
                    placeholder={isNewUser 
                      ? "Write a message inviting them to join the app and be your accountability partner..." 
                      : "Write a message to your potential partner..."
                    }
                    value={invitationMessage}
                    onChange={(e) => setInvitationMessage(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteStep('agreement')}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleInvitePartner}
                  disabled={invitingPartner}
                >
                  {invitingPartner ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : isNewUser ? (
                    "Send Email Invitation"
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Partner Search Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Search size={16} className="mr-2" />
            Search for Potential Partners
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Find a Partner</DialogTitle>
            <DialogDescription>
              Search for other users who share your goals and commitment level.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={searchPartners} disabled={searchLoading}>
                {searchLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search size={16} />
                )}
              </Button>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="goalType" className="text-xs">Goal Type</Label>
                <Select 
                  value={searchFilters.goal_type}
                  onValueChange={(value) => setSearchFilters({...searchFilters, goal_type: value})}
                >
                  <SelectTrigger id="goalType">
                    <SelectValue placeholder="Any goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="career">Career</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="commitmentLevel" className="text-xs">Commitment Level</Label>
                <Select 
                  value={searchFilters.commitment_level}
                  onValueChange={(value) => setSearchFilters({...searchFilters, commitment_level: value})}
                >
                  <SelectTrigger id="commitmentLevel">
                    <SelectValue placeholder="Any commitment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Search Results */}
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium">Results</h3>
              
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  ) : (
                    searchQuery || searchFilters.goal_type || searchFilters.commitment_level ? (
                      "No matching users found"
                    ) : (
                      "Start searching to find potential partners"
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {searchResults.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{user.first_name} {user.last_name}</h4>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.goal_type && (
                            <Badge variant="outline" className="mt-1 capitalize">
                              {user.goal_type}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setPartnerEmail(user.email);
                            setIsNewUser(false);
                            setInviteStep('agreement');
                            setShowInviteDialog(true);
                          }}
                        >
                          <UserPlus size={14} className="mr-1" />
                          Invite
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Helper function to render partnerships list
  function renderPartnershipsList(partnerships) {
    if (partnerships.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-6">
              <Users size={36} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No partnerships in this category</h3>
              <p className="text-muted-foreground mt-1">
                {partnerships.length === 0 
                  ? "Start by inviting someone to be your accountability partner." 
                  : "You don't have any partnerships with this status."}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {partnerships.map((partnership) => {
          const { name, email } = getPartnerInfo(partnership);
          const isPending = partnership.status === 'pending';
          const isInviter = partnership.user_one === user?.id;
          const isTrial = partnership.status === 'trial';
          const isActive = partnership.status === 'active';
          const isEnded = partnership.status === 'ended';
          const trialEndingSoon = isTrial && isTrialEndingSoon(partnership.trial_end_date);
          
          return (
            <Card key={partnership.id} className="overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{name}</CardTitle>
                  <CardDescription>{email}</CardDescription>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs ${
                  isActive ? 'bg-green-100 text-green-800' :
                  isTrial ? 'bg-blue-100 text-blue-800' :
                  isPending ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {isActive && <Check size={12} className="inline mr-1" />}
                  {isTrial && <Clock size={12} className="inline mr-1" />}
                  {isPending && <AlertCircle size={12} className="inline mr-1" />}
                  {isActive ? 'Active' : 
                   isTrial ? 'Trial' : 
                   isPending ? 'Pending' : 
                   'Ended'}
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-sm">
                  {isTrial && (
                    <p className={`mb-2 flex gap-1 items-center ${trialEndingSoon ? 'text-amber-600 font-medium' : ''}`}>
                      <Calendar size={14} className="inline" />
                      Trial ends: {formatDate(partnership.trial_end_date)}
                      {trialEndingSoon && ' (soon)'}
                    </p>
                  )}
                  <p className="text-muted-foreground flex gap-1 items-center">
                    <Clock size={14} className="inline" />
                    Partnership since: {formatDate(partnership.created_at)}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-3 px-6 flex justify-between">
                {isPending && !isInviter && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleAcceptPartnership(partnership.id)}
                      size="sm"
                      variant="default"
                    >
                      <Check size={14} className="mr-1" />
                      Accept
                    </Button>
                    <Button 
                      onClick={() => handleDeclinePartnership(partnership.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <Ban size={14} className="mr-1" />
                      Decline
                    </Button>
                  </div>
                )}
                {isPending && isInviter && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MessageSquare size={14} />
                    Waiting for {name} to accept
                  </p>
                )}
                {isTrial && (
                  <div className="flex gap-2 w-full justify-between">
                    <Button
                      onClick={() => handleFinalizePartnership(partnership.id)}
                      size="sm"
                      variant="default"
                    >
                      <ShieldCheck size={14} className="mr-1" />
                      Finalize Partnership
                    </Button>
                    <Button
                      onClick={() => handleEndTrialPartnership(partnership.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      End Trial
                    </Button>
                  </div>
                )}
                {(isActive || isTrial) && (
                  <Link to={`/partnerships/${partnership.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                )}
                {isEnded && (
                  <p className="text-sm text-muted-foreground">
                    This partnership has ended
                  </p>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  }
};

export default Partnerships; 