import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/supabase';
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
import { Target, Users, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [partnerships, setPartnerships] = useState([]);
  const [goals, setGoals] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch partnerships
        const { data: partnershipsData, error: partnershipsError } = await db.getPartnerships(user.id);
        if (partnershipsError) throw partnershipsError;
        setPartnerships(partnershipsData || []);

        // Fetch goals
        const { data: goalsData, error: goalsError } = await db.getGoals(user.id);
        if (goalsError) throw goalsError;
        setGoals(goalsData || []);

        // If there is an active partnership, fetch check-ins
        if (partnershipsData && partnershipsData.length > 0) {
          const activePartnership = partnershipsData.find(p => p.status === 'active');
          if (activePartnership) {
            const { data: checkinsData, error: checkinsError } = await db.getUpcomingCheckins(activePartnership.id);
            if (checkinsError) throw checkinsError;
            setCheckins(checkinsData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          variant: "destructive",
          title: "Error loading dashboard",
          description: error.message || "Failed to load your dashboard data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activePartnership = partnerships.find(p => p.status === 'active');
  const activeGoal = goals.find(g => g.status === 'active');

  // Helper function to get partner's name
  const getPartnerName = (partnership) => {
    if (!partnership) return '';
    const isUserOne = partnership.user_one.id === user?.id;
    const partner = isUserOne ? partnership.user_two : partnership.user_one;
    return `${partner.first_name} ${partner.last_name}`;
  };

  // Format date for readability
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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
              <Link to="/partnerships/new">
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
              <Link to="/goals/new">
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
                          {goal.description ? goal.description.substring(0, 100) + '...' : 'No description'}
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
                      <li key={partnership.id} className="border-b pb-2">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            Partner: {getPartnerName(partnership)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            partnership.status === 'active' 
                              ? 'bg-primary/10 text-primary' 
                              : partnership.status === 'ended'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-muted text-muted-foreground'
                          }`}>
                            {partnership.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Since {formatDate(partnership.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                You haven't started your accountability journey yet
              </p>
              <Link to="/partnerships/new">
                <Button>Get Started</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard; 