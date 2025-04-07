import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Users, UserPlus, Check, Clock, AlertCircle } from 'lucide-react';

const Partnerships = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partnerships, setPartnerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [invitingPartner, setInvitingPartner] = useState(false);

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

  const handleInvitePartner = async (e) => {
    e.preventDefault();
    if (!partnerEmail) return;

    setInvitingPartner(true);
    try {
      // Check if user exists
      const { data: userData, error: userError } = await db.getUserByEmail(partnerEmail);
      
      if (userError || !userData) {
        toast({
          variant: "destructive",
          title: "User not found",
          description: "No user was found with that email address. They must register first.",
        });
        return;
      }

      // Check if partnership already exists
      const { data: existingPartnerships, error: partnershipError } = await db.getPartnerships(user.id);
      if (partnershipError) throw partnershipError;
      
      const alreadyPartners = existingPartnerships?.some(p => 
        (p.user1.id === userData.id || p.user2.id === userData.id) && 
        p.status !== 'ended'
      );
      
      if (alreadyPartners) {
        toast({
          variant: "destructive",
          title: "Partnership exists",
          description: "You already have an active or pending partnership with this user.",
        });
        return;
      }

      // Create the partnership
      const { data: newPartnership, error: createError } = await db.createPartnership({
        user1: user.id,
        user2: userData.id,
        status: 'pending',
        created_by: user.id
      });
      
      if (createError) throw createError;
      
      toast({
        title: "Partnership invitation sent",
        description: `An invitation has been sent to ${partnerEmail}.`,
      });
      
      // Refresh partnerships
      const { data: updatedPartnerships } = await db.getPartnerships(user.id);
      setPartnerships(updatedPartnerships || []);
      setPartnerEmail('');
      
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

  const handleAcceptPartnership = async (partnershipId) => {
    try {
      const { error } = await db.updatePartnership(partnershipId, {
        status: 'trial',
        // Set trial end date to 14 days from now
        trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      if (error) throw error;
      
      toast({
        title: "Partnership accepted",
        description: "You have accepted the partnership invitation. Your trial period has begun.",
      });
      
      // Refresh partnerships
      const { data: updatedPartnerships } = await db.getPartnerships(user.id);
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

  // Helper function to get partner's name
  const getPartnerInfo = (partnership) => {
    if (!partnership) return { name: '', email: '' };
    const isUserOne = partnership.user1.id === user?.id;
    const partner = isUserOne ? partnership.user2 : partnership.user1;
    return { 
      name: `${partner.first_name} ${partner.last_name}`,
      email: partner.email 
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Partnerships</h1>
      </div>

      {/* Invite Partner Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Invite a new partner</CardTitle>
          <CardDescription>
            Find someone who shares your commitment to grow and achieve goals together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvitePartner} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partnerEmail">Partner's Email</Label>
              <div className="flex gap-2">
                <Input
                  id="partnerEmail"
                  type="email"
                  placeholder="email@example.com"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  required
                />
                <Button 
                  type="submit" 
                  disabled={invitingPartner || !partnerEmail}
                >
                  {invitingPartner ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Inviting
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="mr-2" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Partnerships List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Partnerships</h2>
        
        {partnerships.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-6">
                <Users size={36} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No partnerships yet</h3>
                <p className="text-muted-foreground mt-1">
                  Invite someone to start your accountability journey together.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {partnerships.map((partnership) => {
              const { name, email } = getPartnerInfo(partnership);
              const isPending = partnership.status === 'pending';
              const isInviter = partnership.created_by === user.id;
              const isTrial = partnership.status === 'trial';
              const isActive = partnership.status === 'active';
              const isEnded = partnership.status === 'ended';
              
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
                        <p className="mb-2">
                          Trial ends: {formatDate(partnership.trial_end_date)}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        Partnership since: {formatDate(partnership.created_at)}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 px-6">
                    {isPending && !isInviter && (
                      <Button 
                        onClick={() => handleAcceptPartnership(partnership.id)}
                        size="sm"
                      >
                        Accept Invitation
                      </Button>
                    )}
                    {isPending && isInviter && (
                      <p className="text-sm text-muted-foreground">
                        Waiting for {name} to accept your invitation
                      </p>
                    )}
                    {(isActive || isTrial) && (
                      <Link to={`/partnerships/${partnership.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Partnerships; 