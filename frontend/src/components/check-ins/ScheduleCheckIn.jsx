import React, { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';

const ScheduleCheckIn = ({ partnership, onScheduled, onCancel }) => {
  const { toast } = useToast();
  const [scheduling, setScheduling] = useState(false);
  const [formData, setFormData] = useState({
    scheduled_at: '',
    duration_minutes: '30',
    notes: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDurationChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      duration_minutes: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!partnership?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No partnership selected"
      });
      return;
    }

    setScheduling(true);
    try {
      const { error } = await db.createCheckIn({
        partnership_id: partnership.id,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        notes: formData.notes,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Check-in scheduled successfully"
      });
      onScheduled();
    } catch (error) {
      console.error('Error scheduling check-in:', error);
      toast({
        variant: "destructive",
        title: "Error scheduling check-in",
        description: error.message || "Failed to schedule check-in"
      });
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Check-in</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Date and Time</Label>
            <Input
              type="datetime-local"
              id="scheduled_at"
              name="scheduled_at"
              value={formData.scheduled_at}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select
              value={formData.duration_minutes}
              onValueChange={handleDurationChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any notes or agenda items..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={scheduling}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={scheduling}
          >
            {scheduling ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Scheduling...
              </>
            ) : (
              'Schedule'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ScheduleCheckIn; 