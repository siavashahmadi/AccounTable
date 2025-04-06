import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, supabase } from '../services/supabase';
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

const Dashboard = () => {
  const { user, ensureUserRecord } = useAuth();
  const [partnerships, setPartnerships] = useState([]);
  const [goals, setGoals] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfileExists, setUserProfileExists] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) return;

      try {
        // Check if the user record exists in the users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          // If error is "No rows found", user profile doesn't exist
          if (error.code === 'PGRST116') {
            setUserProfileExists(false);
            
            // Create user profile
            const profile = await ensureUserRecord(user);
            if (profile) {
              setUserProfileExists(true);
              // Wait a moment for database to update
              setTimeout(() => {
                fetchDashboardData();
              }, 1000);
            }
          } else {
            console.error('Error checking user profile:', error);
            toast({
              variant: "destructive",
              title: "Error checking profile",
              description: "There was an issue with your user profile. Please try again later.",
            });
          }
        } else {
          setUserProfileExists(true);
        }
      } catch (err) {
        console.error('Error in checkUserProfile:', err);
      }
    };

    const fetchDashboardData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Check user profile first
        await checkUserProfile();

        // Only fetch data if user profile exists
        if (userProfileExists) {
          // Fetch partnerships with proper error handling
          try {
            const { data: partnershipsData, error: partnershipsError } = await db.getPartnerships(user.id);
            if (partnershipsError) {
              console.error('Error fetching partnerships:', partnershipsError);
              // Continue with other data fetching
            } else {
              setPartnerships(partnershipsData || []);

              // If there is an active partnership, fetch check-ins
              if (partnershipsData && partnershipsData.length > 0) {
                const activePartnership = partnershipsData.find(p => p.status === 'active');
                if (activePartnership) {
                  try {
                    const { data: checkinsData, error: checkinsError } = await db.getUpcomingCheckins(activePartnership.id);
                    if (!checkinsError) {
                      setCheckins(checkinsData || []);
                    }
                  } catch (checkinErr) {
                    console.error('Error fetching check-ins:', checkinErr);
                  }
                }
              }
            }
          } catch (partnershipErr) {
            console.error('Error in partnership fetch:', partnershipErr);
          }

          // Fetch goals with proper error handling
          try {
            const { data: goalsData, error: goalsError } = await db.getGoals(user.id);
            if (!goalsError) {
              setGoals(goalsData || []);
            }
          } catch (goalErr) {
            console.error('Error fetching goals:', goalErr);
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
  }, [user, toast, ensureUserRecord, userProfileExists]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show message if user profile doesn't exist
  if (!userProfileExists) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setting Up Your Profile</h2>
            <p className="text-center mb-4">
              We're setting up your user profile. This may take a moment.
            </p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
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
      const isUserOne = partnership.user_one.id === user?.id;
      const partner = isUserOne ? partnership.user_two : partnership.user_one;
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
                      Upcoming
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
                              : partnership.status === 'trial'
                                ? 'bg-blue-100 text-blue-700'
                                : partnership.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
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