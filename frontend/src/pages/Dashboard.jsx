import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Target, Users, Calendar, AlertTriangle } from 'lucide-react';
import { db } from '../lib/supabase';

const Dashboard = () => {
  const { user, getCurrentUser } = useAuth();
  const [partnerships, setPartnerships] = useState([]);
  const [goals, setGoals] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfileComplete, setUserProfileComplete] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) return;
      
      // If user exists but doesn't have first_name or last_name set, 
      // consider profile incomplete
      if (!user.first_name || !user.last_name) {
        setUserProfileComplete(false);
        return;
      }
      
      setUserProfileComplete(true);
    };

    const fetchDashboardData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Check if user profile is complete
        await checkUserProfile();

        // Only fetch data if we have a user with profile
        if (user && userProfileComplete) {
          // Fetch partnerships
          try {
            const { data: partnershipsData } = await db.getPartnerships();
            setPartnerships(partnershipsData || []);

            // If there is an active partnership, fetch related data
            if (partnershipsData && partnershipsData.length > 0) {
              const activePartnership = partnershipsData.find(p => p.status === 'active');
              
              if (activePartnership) {
                // Fetch goals for this partnership
                try {
                  const { data: goalsData } = await db.getGoals();
                  setGoals(goalsData || []);
                } catch (goalErr) {
                  console.error('Error fetching goals:', goalErr);
                }
                
                // For check-ins we can use the same data fetch since the dashboard 
                // should only show check-ins for active partnerships
                // We'll leave this for a separate implementation if needed
              }
            }
          } catch (partnershipErr) {
            console.error('Error in partnership fetch:', partnershipErr);
            toast({
              variant: "destructive",
              title: "Error loading partnerships",
              description: "Your partnerships couldn't be loaded. Please try again.",
            });
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          variant: "destructive",
          title: "Error loading dashboard",
          description: "Some dashboard data couldn't be loaded. Please refresh to try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, toast, userProfileComplete]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Try to get the full user again, which should create the profile if needed
      const { data: refreshedUser } = await getCurrentUser();
      if (refreshedUser) {
        // Re-render component with the refreshed user info
        toast({
          title: "Profile updated",
          description: "Your profile has been refreshed.",
        });
        window.location.reload();
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      toast({
        variant: "destructive",
        title: "Error refreshing profile",
        description: "There was a problem refreshing your profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show message if user profile isn't complete
  if (!userProfileComplete) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Complete Your Profile</h2>
            <p className="text-center mb-4">
              Please set up your profile information to use the dashboard.
            </p>
            <Button onClick={handleRefresh}>Refresh Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePartnership = partnerships.find(p => p.status === 'active');
  const activeGoal = goals.find(g => g.status === 'active');

  // Helper function to get partner's name with safety check
  const getPartnerName = (partnership) => {
    if (!partnership) return '';
    try {
      const isUserOne = partnership.user1.id === user?.id;
      const partner = isUserOne ? partnership.user2 : partnership.user1;
      return partner ? `${partner.first_name || ''} ${partner.last_name || ''}`.trim() : 'Partner';
    } catch (e) {
      console.error('Error getting partner name:', e);
      return 'Partner';
    }
  };

  // Format date for readability with error handling
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Not set';
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Partnership Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Partnership Status
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activePartnership ? (
              <div>
                <p className="text-lg font-semibold">
                  Partnered with {getPartnerName(activePartnership)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Partnership active since {formatDate(activePartnership.created_at)}
                </p>
              </div>
            ) : (
              <p className="text-lg">You don't have an active partnership</p>
            )}
          </CardContent>
          <CardFooter>
            {activePartnership ? (
              <Link to={`/partnerships/${activePartnership.id}`}>
                <Button variant="outline">View Partnership</Button>
              </Link>
            ) : (
              <Link to="/partnerships">
                <Button>Find a Partner</Button>
              </Link>
            )}
          </CardFooter>
        </Card>
        
        {/* Goals Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Goal
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeGoal ? (
              <div>
                <p className="text-lg font-semibold">{activeGoal.title}</p>
                <p className="text-sm text-muted-foreground">
                  Target: {activeGoal.target_date ? formatDate(activeGoal.target_date) : 'No deadline'}
                </p>
              </div>
            ) : (
              <p className="text-lg">No active goal</p>
            )}
          </CardContent>
          <CardFooter>
            {activeGoal ? (
              <Link to={`/goals/${activeGoal.id}`}>
                <Button variant="outline">View Goal</Button>
              </Link>
            ) : (
              <Link to="/goals">
                <Button>Create Goal</Button>
              </Link>
            )}
          </CardFooter>
        </Card>
        
        {/* Upcoming Check-ins Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Check-ins
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {checkins.length > 0 ? (
              <div className="space-y-2">
                {checkins.slice(0, 3).map((checkin) => (
                  <div key={checkin.id} className="flex justify-between">
                    <p className="text-sm">{formatDate(checkin.scheduled_at)}</p>
                    <p className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {checkin.status || "Scheduled"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg">No upcoming check-ins</p>
            )}
          </CardContent>
          <CardFooter>
            {activePartnership ? (
              <Link to="/checkins">
                <Button variant="outline">Schedule Check-in</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Find a partner first
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* Activity Summary Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your accountability journey at a glance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {goals.length > 0 || partnerships.length > 0 ? (
            <div className="space-y-4">
              {/* Recent goals */}
              {goals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Goals</h3>
                  <ul className="space-y-2">
                    {goals.slice(0, 3).map(goal => (
                      <li key={goal.id} className="border-b pb-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{goal.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            goal.status === 'active' 
                              ? 'bg-primary/10 text-primary' 
                              : goal.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-muted text-muted-foreground'
                          }`}>
                            {goal.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {goal.description ? goal.description.substring(0, 100) + (goal.description.length > 100 ? '...' : '') : 'No description'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Partnerships history */}
              {partnerships.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Partnership History</h3>
                  <ul className="space-y-2">
                    {partnerships.map(partnership => (
                      <li key={partnership.id} className="border-b pb-2 last:border-b-0">
                        <div className="flex justify-between">
                          <span className="font-medium">Partnership with {getPartnerName(partnership)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            partnership.status === 'active' 
                              ? 'bg-green-100 text-green-700'
                              : partnership.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : partnership.status === 'paused'
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-muted text-muted-foreground'
                          }`}>
                            {partnership.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Created: {formatDate(partnership.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No activity yet. Start by finding a partner or creating a goal!</p>
              <div className="flex justify-center gap-4 mt-4">
                <Link to="/partnerships">
                  <Button variant="outline">Find a Partner</Button>
                </Link>
                <Link to="/goals">
                  <Button variant="outline">Create a Goal</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 