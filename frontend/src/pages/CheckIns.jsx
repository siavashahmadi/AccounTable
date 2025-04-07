import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { db, supabase } from '../lib/supabase';
import { format } from 'date-fns';
import ScheduleCheckIn from '../components/check-ins/ScheduleCheckIn';
import { useAuth } from '../contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const CheckIns = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkIns, setCheckIns] = useState([]);
  const [selectedPartnership, setSelectedPartnership] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [partnerships, setPartnerships] = useState([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserAndData();
  }, []);

  const fetchUserAndData = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch partnerships
      const { data: partnershipsData, error: partnershipsError } = await db.getPartnerships();
      if (partnershipsError) throw partnershipsError;
      setPartnerships(partnershipsData || []);

      // First get the partnerships for this user
      const { data: userPartnerships, error: partnershipError } = await supabase
        .from('partnerships')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (partnershipError) throw partnershipError;

      if (!userPartnerships?.length) {
        setCheckIns([]);
        return;
      }

      // Then fetch check-ins for those partnerships
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select(`
          *,
          partnership:partnerships (
            *,
            user1:users!partnerships_user1_id_fkey(*),
            user2:users!partnerships_user2_id_fkey(*)
          )
        `)
        .in('partnership_id', userPartnerships.map(p => p.id))
        .order('scheduled_at', { ascending: true });

      if (checkInsError) throw checkInsError;
      setCheckIns(checkInsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCheckInStatus = async (checkInId, status) => {
    try {
      const { error } = await supabase
        .from('check_ins')
        .update({ status })
        .eq('id', checkInId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Check-in status updated"
      });
      fetchUserAndData();
    } catch (error) {
      console.error('Error updating check-in:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update check-in"
      });
    }
  };

  const handleScheduleClick = (partnership) => {
    setSelectedPartnership(partnership);
    setShowScheduleModal(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Check-ins</h1>
        <div className="flex gap-2">
          <Select onValueChange={(value) => handleScheduleClick(partnerships.find(p => p.id === value))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Schedule New Check-in" />
            </SelectTrigger>
            <SelectContent>
              {partnerships.map((partnership) => {
                const partner = partnership.user1.id === user?.id
                  ? partnership.user2
                  : partnership.user1;
                return (
                  <SelectItem key={partnership.id} value={partnership.id}>
                    With {partner.first_name} {partner.last_name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {checkIns.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No upcoming check-ins scheduled</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {checkIns.map((checkIn) => (
            <div
              key={checkIn.id}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">
                    Check-in with {checkIn.partnership.user1.id === user?.id
                      ? checkIn.partnership.user2.first_name
                      : checkIn.partnership.user1.first_name}
                  </h3>
                  <p className="text-gray-600">
                    {format(new Date(checkIn.scheduled_at), 'PPP p')}
                  </p>
                  {checkIn.duration_minutes && (
                    <p className="text-gray-600">
                      Duration: {checkIn.duration_minutes} minutes
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {checkIn.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => updateCheckInStatus(checkIn.id, 'completed')}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => updateCheckInStatus(checkIn.id, 'cancelled')}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              {checkIn.notes && (
                <div className="mt-4">
                  <p className="text-gray-700">{checkIn.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule Check-in Modal */}
      {showScheduleModal && selectedPartnership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Schedule Check-in</h2>
            <ScheduleCheckIn
              partnership={selectedPartnership}
              onScheduled={() => {
                setShowScheduleModal(false);
                fetchUserAndData();
              }}
              onCancel={() => setShowScheduleModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckIns; 