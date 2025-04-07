import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Target, CheckCircle, XCircle, Clock } from 'lucide-react';

const Goals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedPartnership, setSelectedPartnership] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch goals
        const { data: goalsData, error: goalsError } = await db.getGoals();
        if (goalsError) throw goalsError;
        setGoals(goalsData || []);

        // Fetch partnerships for goal creation
        const { data: partnershipsData, error: partnershipsError } = await db.getPartnerships();
        if (partnershipsError) throw partnershipsError;
        
        // Filter to only active or trial partnerships
        const activePartnerships = partnershipsData?.filter(p => 
          p.status === 'active' || p.status === 'trial'
        ) || [];
        
        setPartnerships(activePartnerships);
        
        // If there's only one partnership, select it by default
        if (activePartnerships.length === 1) {
          setSelectedPartnership(activePartnerships[0].id);
        }
      } catch (error) {
        console.error('Error fetching goals data:', error);
        toast({
          variant: "destructive",
          title: "Error loading goals",
          description: error.message || "Failed to load your goals data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Only depend on user changes, not toast
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!title || !selectedPartnership) return;

    setCreating(true);
    try {
      // Check if user already has an active goal for this partnership
      const existingActiveGoal = goals.find(g => 
        g.partnership_id === selectedPartnership && 
        g.status === 'active'
      );
      
      if (existingActiveGoal) {
        toast({
          variant: "destructive",
          title: "Active goal exists",
          description: "You already have an active goal for this partnership. Complete or abandon it first.",
        });
        return;
      }

      // Create the goal
      const goalData = {
        user_id: user.id,
        partnership_id: selectedPartnership,
        title,
        description,
        status: 'active',
        target_date: targetDate ? new Date(targetDate).toISOString() : null
      };
      
      const { data: newGoal, error } = await db.createGoal(goalData);
      if (error) throw error;
      
      toast({
        title: "Goal created",
        description: "Your new goal has been created successfully.",
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setTargetDate('');
      setShowGoalForm(false);
      
      // Refresh goals
      const { data: updatedGoals } = await db.getGoals(user.id);
      setGoals(updatedGoals || []);
      
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        variant: "destructive",
        title: "Error creating goal",
        description: error.message || "Failed to create goal. Please try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteGoal = async (goalId) => {
    try {
      const { error } = await db.updateGoal(goalId, { status: 'completed' });
      if (error) throw error;
      
      toast({
        title: "Goal completed",
        description: "Congratulations on completing your goal!",
      });
      
      // Refresh goals
      const { data: updatedGoals } = await db.getGoals(user.id);
      setGoals(updatedGoals || []);
      
    } catch (error) {
      console.error('Error completing goal:', error);
      toast({
        variant: "destructive",
        title: "Error updating goal",
        description: error.message || "Failed to mark goal as complete",
      });
    }
  };
  
  const handleAbandonGoal = async (goalId) => {
    try {
      const { error } = await db.updateGoal(goalId, { status: 'abandoned' });
      if (error) throw error;
      
      toast({
        title: "Goal abandoned",
        description: "The goal has been marked as abandoned.",
      });
      
      // Refresh goals
      const { data: updatedGoals } = await db.getGoals(user.id);
      setGoals(updatedGoals || []);
      
    } catch (error) {
      console.error('Error abandoning goal:', error);
      toast({
        variant: "destructive",
        title: "Error updating goal",
        description: error.message || "Failed to abandon goal",
      });
    }
  };

  // Helper function to get partner's name
  const getPartnerName = (partnershipId) => {
    const partnership = partnerships.find(p => p.id === partnershipId);
    if (!partnership) return '';
    
    const isUserOne = partnership.user_one.id === user?.id;
    const partner = isUserOne ? partnership.user_two : partnership.user_one;
    return `${partner.first_name} ${partner.last_name}`;
  };

  // Format date for readability
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Check if a goal is overdue
  const isOverdue = (goal) => {
    if (!goal.target_date || goal.status !== 'active') return false;
    return new Date(goal.target_date) < new Date();
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
        <h1 className="text-3xl font-bold">Goals</h1>
        {partnerships.length > 0 && (
          <Button onClick={() => setShowGoalForm(!showGoalForm)}>
            {showGoalForm ? 'Cancel' : 'Create Goal'}
          </Button>
        )}
      </div>

      {/* Goal Creation Form */}
      {showGoalForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create a New Goal</CardTitle>
            <CardDescription>
              Set a clear, measurable goal to work on with your accountability partner.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateGoal}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  placeholder="E.g., Exercise 3 times a week"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your goal in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date (Optional)</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="partnership">Partnership</Label>
                <select
                  id="partnership"
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedPartnership}
                  onChange={(e) => setSelectedPartnership(e.target.value)}
                  required
                >
                  <option value="">Select a partnership</option>
                  {partnerships.map(partnership => (
                    <option key={partnership.id} value={partnership.id}>
                      Partnership with {getPartnerName(partnership.id)}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={creating || !title || !selectedPartnership}
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Goal"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* No Partnerships Notice */}
      {partnerships.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-6">
              <Target size={36} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No active partnerships</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                You need an active partnership to create and track goals together.
              </p>
              <Link to="/partnerships">
                <Button>Find a Partner</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      {partnerships.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Goals</h2>
          
          {goals.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-6">
                  <Target size={36} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No goals yet</h3>
                  <p className="text-muted-foreground mt-1">
                    Create your first goal to start tracking your progress.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => {
                const statusColor = 
                  goal.status === 'completed' ? 'text-green-600 bg-green-50' :
                  goal.status === 'abandoned' ? 'text-red-600 bg-red-50' :
                  isOverdue(goal) ? 'text-amber-600 bg-amber-50' :
                  'text-blue-600 bg-blue-50';
                
                return (
                  <Card key={goal.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <div className={`px-3 py-1 rounded-full text-xs capitalize ${statusColor}`}>
                          {goal.status === 'completed' && <CheckCircle size={12} className="inline mr-1" />}
                          {goal.status === 'abandoned' && <XCircle size={12} className="inline mr-1" />}
                          {goal.status === 'active' && isOverdue(goal) && <Clock size={12} className="inline mr-1" />}
                          {goal.status === 'active' && isOverdue(goal) ? 'Overdue' : goal.status}
                        </div>
                      </div>
                      <CardDescription>
                        Partnership with {getPartnerName(goal.partnership_id)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="space-y-2">
                        <p className="text-sm">{goal.description || 'No description provided'}</p>
                        <p className="text-xs text-muted-foreground flex justify-between">
                          <span>Created: {formatDate(goal.created_at)}</span>
                          <span>Target: {formatDate(goal.target_date)}</span>
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-3 flex justify-between">
                      <Link to={`/goals/${goal.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      
                      {goal.status === 'active' && (
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAbandonGoal(goal.id)}
                          >
                            Abandon
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleCompleteGoal(goal.id)}
                          >
                            Complete
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Goals; 