import React, { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, Loader2 } from 'lucide-react';

const MessageComposer = ({ partnership, user, onMessageSent }) => {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    if (!partnership || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing partnership or user information"
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await db.sendMessage(
        partnership.id,
        user.id,
        message.trim()
      );
      if (error) throw error;

      setMessage('');
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error.message || "Failed to send message"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={sending}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || sending}
        size="icon"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};

export default MessageComposer; 