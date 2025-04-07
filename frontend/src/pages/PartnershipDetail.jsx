import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
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
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock,
  CheckSquare,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Edit,
  Ban,
  Loader2,
  AlertTriangle 
} from 'lucide-react';
import { Badge } from '../components/ui/badge';

const PartnershipDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partnership, setPartnership] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [editingAgreement, setEditingAgreement] = useState(false);
  const [confirmEndTrial, setConfirmEndTrial] = useState(false);
  const [confirmFinalizeTrial, setConfirmFinalizeTrial] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  
  // Agreement edit state
  const [editedAgreement, setEditedAgreement] = useState({
    communication_frequency: 'weekly',
    check_in_days: [],
    expectations: '',
    commitment_level: 'moderate',
    feedback_style: 'balanced'
  });

  useEffect(() => {
    const fetchPartnershipData = async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch partnership details
        const { data: partnershipData, error: partnershipError } = await db.getPartnership(id);
        if (partnershipError || !partnershipData) {
          throw new Error(partnershipError?.message || 'Partnership not found');
        }
        
        setPartnership(partnershipData);
        
        // Fetch agreement if it exists
        const { data: agreementData, error: agreementError, notFound } = await db.getAgreement(id);
        
        if (agreementError && !notFound) {
          console.error('Error fetching agreement:', agreementError);
          toast({
            variant: "destructive",
            title: "Error loading agreement",
            description: agreementError.message || "Failed to load partnership agreement",
          });
        } else if (agreementData) {
          setAgreement(agreementData);
          setEditedAgreement(agreementData);
        }
      } catch (error) {
        console.error('Error fetching partnership details:', error);
        toast({
          variant: "destructive",
          title: "Error loading partnership",
          description: error.message || "Failed to load partnership details",
        });
        navigate('/partnerships');
      } finally {
        setLoading(false);
      }
    };

    fetchPartnershipData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const handleCheckInDayToggle = (day) => {
    const updatedDays = [...editedAgreement.check_in_days];
    if (updatedDays.includes(day)) {
      const index = updatedDays.indexOf(day);
      updatedDays.splice(index, 1);
    } else {
      updatedDays.push(day);
    }
    setEditedAgreement({
      ...editedAgreement,
      check_in_days: updatedDays
    });
  };

  const handleSaveAgreement = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await db.createOrUpdateAgreement(id, editedAgreement);
      
      if (error) throw error;
      
      setAgreement(data);
      setEditingAgreement(false);
      
      toast({
        title: "Agreement updated",
        description: "Your partnership agreement has been saved.",
      });
    } catch (error) {
      console.error('Error saving agreement:', error);
      toast({
        variant: "destructive",
        title: "Error updating agreement",
        description: error.message || "Failed to save partnership agreement",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleEndTrial = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await db.endTrialPartnership(id);
      
      if (error) throw error;
      
      toast({
        title: "Trial period ended",
        description: "You have ended the trial partnership.",
      });
      
      navigate('/partnerships');
    } catch (error) {
      console.error('Error ending trial partnership:', error);
      toast({
        variant: "destructive",
        title: "Error ending trial",
        description: error.message || "Failed to end trial partnership",
      });
      setConfirmEndTrial(false);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleFinalizeTrial = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await db.finalizePartnership(id);
      
      if (error) throw error;
      
      setPartnership({
        ...partnership,
        status: 'active',
        trial_end_date: null
      });
      
      toast({
        title: "Partnership finalized",
        description: "Your trial period has ended and the partnership is now active.",
      });
      
      setConfirmFinalizeTrial(false);
    } catch (error) {
      console.error('Error finalizing partnership:', error);
      toast({
        variant: "destructive",
        title: "Error finalizing partnership",
        description: error.message || "Failed to finalize partnership",
      });
      setConfirmFinalizeTrial(false);
    } finally {
      setProcessingAction(false);
    }
  };

  // Helper function to get partner's info
  const getPartnerInfo = () => {
    if (!partnership) return { name: '', email: '' };
    const isUserOne = partnership.user1?.id === user?.id;
    const partner = isUserOne ? partnership.user2 : partnership.user1;
    return { 
      name: partner ? `${partner.first_name} ${partner.last_name}` : 'Unknown User',
      firstName: partner ? partner.first_name : '',
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

  // Calculate trial period progress
  const calculateTrialProgress = () => {
    if (!partnership?.trial_end_date) return 100;
    
    const startDate = new Date(partnership.created_at);
    const endDate = new Date(partnership.trial_end_date);
    const currentDate = new Date();
    
    const totalDuration = endDate - startDate;
    const elapsedDuration = currentDate - startDate;
    
    const progress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
    return Math.round(progress);
  };

  // Format check-in days for display
  const formatCheckInDays = (days) => {
    if (!days || days.length === 0) return 'Not specified';
    
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading partnership details...</p>
        </div>
      </div>
    );
  }

  if (!partnership) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-2xl font-bold">Partnership Not Found</h2>
        <p className="text-muted-foreground">The partnership you're looking for doesn't exist or you don't have access.</p>
        <Button variant="outline" onClick={() => navigate('/partnerships')}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Partnerships
        </Button>
      </div>
    );
  }

  const partner = getPartnerInfo();
  const isTrial = partnership.status === 'trial';
  const isActive = partnership.status === 'active';
  const trialEndingSoon = isTrial && isTrialEndingSoon(partnership.trial_end_date);
  const trialProgress = isTrial ? calculateTrialProgress() : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/partnerships')}>
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Partnership with {partner.firstName}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Partnership Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={18} />
              Partnership Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <div className={`mt-1 px-3 py-1 rounded-full text-xs inline-flex items-center ${
                isActive ? 'bg-green-100 text-green-800' :
                isTrial ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {isActive && <CheckSquare size={12} className="mr-1" />}
                {isTrial && <Clock size={12} className="mr-1" />}
                {isActive ? 'Active' : isTrial ? 'Trial' : 'Ended'}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Partner</h3>
              <p className="mt-1 font-medium">{partner.name}</p>
              <p className="text-sm text-muted-foreground">{partner.email}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Dates</h3>
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-1 text-sm">
                  <Calendar size={14} />
                  <span>Created: {formatDate(partnership.created_at)}</span>
                </div>
                {isTrial && (
                  <div className={`flex items-center gap-1 text-sm ${trialEndingSoon ? 'text-amber-600 font-medium' : ''}`}>
                    <Calendar size={14} />
                    <span>Trial ends: {formatDate(partnership.trial_end_date)}</span>
                    {trialEndingSoon && <span className="text-xs bg-amber-100 text-amber-800 px-1 rounded">Soon</span>}
                  </div>
                )}
              </div>
            </div>
            
            {isTrial && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Trial Progress</h3>
                <Progress value={trialProgress} className="h-2" />
                <p className="text-xs text-right mt-1 text-muted-foreground">{trialProgress}% Complete</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {isTrial && (
              <>
                <Button 
                  className="w-full"
                  onClick={() => setConfirmFinalizeTrial(true)}
                >
                  <ShieldCheck size={16} className="mr-2" />
                  Finalize Partnership
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => setConfirmEndTrial(true)}
                >
                  <Ban size={16} className="mr-2" />
                  End Trial
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Agreement Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Partnership Agreement</CardTitle>
                <CardDescription>
                  The terms of your accountability partnership
                </CardDescription>
              </div>
              {!editingAgreement && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingAgreement(true)}
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingAgreement ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="communicationFrequency">Communication Frequency</Label>
                    <Select 
                      value={editedAgreement.communication_frequency}
                      onValueChange={(value) => setEditedAgreement({...editedAgreement, communication_frequency: value})}
                    >
                      <SelectTrigger id="communicationFrequency">
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
                            checked={editedAgreement.check_in_days?.includes?.(day)}
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
                      value={editedAgreement.expectations || ''}
                      onChange={(e) => setEditedAgreement({...editedAgreement, expectations: e.target.value})}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commitmentLevel">Commitment Level</Label>
                    <Select 
                      value={editedAgreement.commitment_level}
                      onValueChange={(value) => setEditedAgreement({...editedAgreement, commitment_level: value})}
                    >
                      <SelectTrigger id="commitmentLevel">
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
                      value={editedAgreement.feedback_style}
                      onValueChange={(value) => setEditedAgreement({...editedAgreement, feedback_style: value})}
                    >
                      <SelectTrigger id="feedbackStyle">
                        <SelectValue placeholder="Select feedback style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="gentle">Gentle</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingAgreement(false);
                        setEditedAgreement(agreement || {
                          communication_frequency: 'weekly',
                          check_in_days: [],
                          expectations: '',
                          commitment_level: 'moderate',
                          feedback_style: 'balanced'
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveAgreement}
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : "Save Agreement"}
                    </Button>
                  </div>
                </div>
              ) : agreement ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Communication Frequency</h3>
                      <p className="mt-1 capitalize">{agreement.communication_frequency}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Commitment Level</h3>
                      <p className="mt-1 capitalize">{agreement.commitment_level}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Feedback Style</h3>
                      <p className="mt-1 capitalize">{agreement.feedback_style}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Check-in Days</h3>
                      <p className="mt-1">{formatCheckInDays(agreement.check_in_days)}</p>
                    </div>
                  </div>
                  
                  {agreement.expectations && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Expectations</h3>
                      <p className="mt-1 text-sm whitespace-pre-line">{agreement.expectations}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No agreement has been set up yet.</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setEditingAgreement(true)}
                  >
                    Create Agreement
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages and Check-ins will be added in future sections */}
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Messages, check-ins, and goal tracking will be available in the next update.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare size={16} />
                  <span>Messaging system to communicate with your partner</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar size={16} />
                  <span>Schedule and track check-in meetings</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckSquare size={16} />
                  <span>Set and track goals together</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* End Trial Confirmation Dialog */}
      <Dialog open={confirmEndTrial} onOpenChange={setConfirmEndTrial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Trial Partnership</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this trial partnership? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Ending the trial early means you've decided this partnership isn't the right fit. 
              Both you and your partner will be notified and the partnership will be marked as ended.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmEndTrial(false)}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndTrial}
              disabled={processingAction}
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : "End Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Trial Confirmation Dialog */}
      <Dialog open={confirmFinalizeTrial} onOpenChange={setConfirmFinalizeTrial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalize Partnership</DialogTitle>
            <DialogDescription>
              Are you ready to finalize this partnership and move from the trial to active status?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Finalizing the partnership means you're ready to commit to this accountability relationship
              beyond the trial period. Both you and your partner will be notified of this change.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmFinalizeTrial(false)}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalizeTrial}
              disabled={processingAction}
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : "Finalize Partnership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnershipDetail; 