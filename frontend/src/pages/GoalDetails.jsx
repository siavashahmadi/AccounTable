import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { 
  Target, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ChevronLeft, 
  Calendar, 
  ArrowUpCircle 
} from 'lucide-react';

const GoalDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [partnership, setPartnership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [progressValue, setProgressValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchGoalData = async () => {
      if (!user || !id) return;

      setLoading(true);
      try {
        // Fetch goal details
        const { data: goalData, error: goalError } = await db.getGoal(id);
        if (goalError) throw goalError;
        if (!goalData) {
          toast({
            variant: "destructive",
            title: "Goal not found",
            description: "The requested goal could not be found.",
          });
          navigate('/goals');
          return;
        }
        
        setGoal(goalData);

        // Fetch partnership details
        if (goalData.partnership_id) {
          const { data: partnershipData, error: partnershipError } = await db.getPartnership(goalData.partnership_id);
          if (partnershipError) throw partnershipError;
          setPartnership(partnershipData);
        }

        // Fetch progress updates
        const { data: updatesData, error: updatesError } = await db.getProgressUpdates(id);
        if (updatesError) throw updatesError;
        setProgressUpdates(updatesData || []);
        
      } catch (error) {
        console.error('Error fetching goal data:', error);
        toast({
          variant: "destructive",
          title: "Error loading goal",
          description: error.message || "Failed to load goal details",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGoalData();
  }, [id, user, toast, navigate]);

  const handleAddProgressUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdate) return;

    setSubmitting(true);
    try {
      // Create new progress update
      const updateData = {
        goal_id: id,
        user_id: user.id,
        description: newUpdate,
        progress_value: progressValue ? parseFloat(progressValue) : null
      };
      
      const { data: newProgressUpdate, error } = await db.createProgressUpdate(updateData);
      if (error) throw error;
      
      toast({
        title: "Progress update added",
        description: "Your progress update has been successfully added.",
      });
      
      // Add to list and reset form
      setProgressUpdates([newProgressUpdate, ...progressUpdates]);
      setNewUpdate('');
      setProgressValue('');
      
    } catch (error) {
      console.error('Error adding progress update:', error);
      toast({
        variant: "destructive",
        title: "Error adding update",
        description: error.message || "Failed to add progress update",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteGoal = async () => {
    try {
      const { error } = await db.updateGoal(id, { status: 'completed' });
      if (error) throw error;
      
      // Update local state
      setGoal({ ...goal, status: 'completed' });
      
      toast({
        title: "Goal completed",
        description: "Congratulations on completing your goal!",
      });
      
    } catch (error) {
      console.error('Error completing goal:', error);
      toast({
        variant: "destructive",
        title: "Error updating goal",
        description: error.message || "Failed to mark goal as complete",
      });
    }
  };
  
  const handleAbandonGoal = async () => {
    try {
      const { error } = await db.updateGoal(id, { status: 'abandoned' });
      if (error) throw error;
      
      // Update local state
      setGoal({ ...goal, status: 'abandoned' });
      
      toast({
        title: "Goal abandoned",
        description: "The goal has been marked as abandoned.",
      });
      
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
  const getPartnerName = () => {
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
  
  // Format datetime for progress updates
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  // Check if a goal is overdue
  const isOverdue = () => {
    if (!goal || !goal.target_date || goal.status !== 'active') return false;
    return new Date(goal.target_date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="space-y-4">
        <Link to="/goals" className="inline-flex items-center text-sm text-primary hover:underline">
          <ChevronLeft size={16} className="mr-1" />
          Back to Goals
        </Link>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-6">
              <h3 className="text-lg font-medium">Goal not found</h3>
              <p className="text-muted-foreground mt-1">
                The goal you're looking for doesn't exist or you don't have permission to view it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine status color
  const statusColor = 
    goal.status === 'completed' ? 'text-green-600 bg-green-50' :
    goal.status === 'abandoned' ? 'text-red-600 bg-red-50' :
    isOverdue() ? 'text-amber-600 bg-amber-50' :
    'text-blue-600 bg-blue-50';

  return (
    <div className="space-y-6">
      <Link to="/goals" className="inline-flex items-center text-sm text-primary hover:underline">
        <ChevronLeft size={16} className="mr-1" />
        Back to Goals
      </Link>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{goal.title}</CardTitle>
              <CardDescription className="mt-1">
                Partnership with {getPartnerName()}
              </CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs capitalize self-start md:self-auto ${statusColor}`}>
              {goal.status === 'completed' && <CheckCircle size={12} className="inline mr-1" />}
              {goal.status === 'abandoned' && <XCircle size={12} className="inline mr-1" />}
              {goal.status === 'active' && isOverdue() && <Clock size={12} className="inline mr-1" />}
              {goal.status === 'active' && isOverdue() ? 'Overdue' : goal.status}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-md">
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm">{goal.description || 'No description provided'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 border rounded-md">
              <Calendar size={18} className="text-muted-foreground mr-2" />
              <div>
                <h4 className="text-xs text-muted-foreground uppercase">Created</h4>
                <p className="text-sm">{formatDate(goal.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center p-4 border rounded-md">
              <Target size={18} className="text-muted-foreground mr-2" />
              <div>
                <h4 className="text-xs text-muted-foreground uppercase">Target Date</h4>
                <p className="text-sm">{formatDate(goal.target_date)}</p>
              </div>
            </div>
          </div>
          
          {goal.status === 'active' && (
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleAbandonGoal}
              >
                <XCircle size={16} className="mr-1" />
                Abandon Goal
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={handleCompleteGoal}
              >
                <CheckCircle size={16} className="mr-1" />
                Complete Goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {goal.status === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Progress Update</CardTitle>
            <CardDescription>
              Track your progress by adding regular updates. This helps keep you accountable.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAddProgressUpdate}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="progressUpdate">Update</Label>
                <Textarea
                  id="progressUpdate"
                  placeholder="Share your progress, challenges, or achievements..."
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="progressValue">Progress Value (Optional)</Label>
                <Input
                  id="progressValue"
                  type="number"
                  placeholder="e.g., 75 for 75%"
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a number to represent your progress (e.g., percentage complete)
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                disabled={submitting || !newUpdate}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle size={16} className="mr-1" />
                    Add Update
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Progress Updates</h2>
        
        {progressUpdates.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-6">
                <ArrowUpCircle size={36} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No progress updates yet</h3>
                <p className="text-muted-foreground mt-1">
                  Add your first progress update to start tracking your journey.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {progressUpdates.map((update) => (
              <Card key={update.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">
                      {update.progress_value !== null && (
                        <span className="text-primary mr-2">{update.progress_value}%</span>
                      )}
                      Progress Update
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(update.created_at)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{update.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalDetails; 