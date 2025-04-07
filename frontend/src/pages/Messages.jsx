import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';
import { db } from '../lib/supabase';
import MessageList from '../components/messages/MessageList';
import MessageComposer from '../components/messages/MessageComposer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { MessageCircle } from 'lucide-react';

const Messages = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState([]);
  const [selectedPartnership, setSelectedPartnership] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchUserAndPartnerships = async () => {
      try {
        const { data: userData } = await db.getCurrentUser();
        if (!userData) {
          navigate('/login');
          return;
        }
        setUser(userData);

        const { data: partnershipsData, error } = await db.getPartnerships();
        if (error) {
          if (error.message === 'No authenticated user') {
            setPartnerships([]);
          } else {
            throw error;
          }
        } else {
          setPartnerships(partnershipsData || []);
          if (partnershipsData?.length > 0) {
            setSelectedPartnership(partnershipsData[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching partnerships:', error);
        toast({
          variant: "destructive",
          title: "Error loading partnerships",
          description: error.message || "Failed to load partnerships"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndPartnerships();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedPartnership?.id) return;
      
      try {
        const { data, error } = await db.getMessages(selectedPartnership.id);
        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          variant: "destructive",
          title: "Error loading messages",
          description: error.message || "Failed to load messages"
        });
      }
    };

    fetchMessages();
  }, [selectedPartnership?.id, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md mt-8">
        <CardHeader>
          <CardTitle>Please Log In</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You need to be logged in to view messages.</p>
          <Button onClick={() => navigate('/login')} className="mt-4">Log In</Button>
        </CardContent>
      </Card>
    );
  }

  if (partnerships.length === 0) {
    return (
      <Card className="mx-auto max-w-md mt-8">
        <CardHeader>
          <CardTitle>No Partnerships Yet</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Find a partner to start messaging</p>
          <Button onClick={() => navigate('/partnerships')}>Find a Partner</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-4 gap-4 h-full">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Partnerships</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <CardContent className="space-y-2">
              {partnerships.map((partnership) => {
                const partner = partnership.user1.id === user?.id
                  ? partnership.user2
                  : partnership.user1;
                return (
                  <Button
                    key={partnership.id}
                    variant={selectedPartnership?.id === partnership.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedPartnership(partnership)}
                  >
                    {partner.first_name} {partner.last_name}
                  </Button>
                );
              })}
            </CardContent>
          </ScrollArea>
        </Card>

        <Card className="col-span-3 flex flex-col">
          {selectedPartnership ? (
            <>
              <CardHeader className="border-b">
                <CardTitle>
                  {selectedPartnership.user1.id === user?.id
                    ? selectedPartnership.user2.first_name
                    : selectedPartnership.user1.first_name}
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                <CardContent>
                  <MessageList messages={messages} currentUser={user} />
                  <div ref={messagesEndRef} />
                </CardContent>
              </ScrollArea>
              <CardContent className="border-t">
                <MessageComposer
                  partnership={selectedPartnership}
                  user={user}
                  onMessageSent={() => {
                    const fetchNewMessages = async () => {
                      const { data } = await db.getMessages(selectedPartnership.id);
                      setMessages(data || []);
                    };
                    fetchNewMessages();
                  }}
                />
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a partnership to start messaging</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages; 