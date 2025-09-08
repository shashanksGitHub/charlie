import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock, Mail, Phone } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SuspendedAccountScreenProps {
  user: any;
  onLogout: () => void;
}

export function SuspendedAccountScreen({ user, onLogout }: SuspendedAccountScreenProps) {
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { toast } = useToast();

  // Real-time countdown calculation
  useEffect(() => {
    if (!user.suspensionExpiresAt) return;
    
    const suspensionExpiresAt = new Date(user.suspensionExpiresAt);

    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = suspensionExpiresAt.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateCountdown(); // Initial calculation
    const interval = setInterval(updateCountdown, 1000); // Update every second

    return () => clearInterval(interval);
  }, [user.suspensionExpiresAt]);



  const appealMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      return apiRequest('/api/suspension/appeal', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Appeal Submitted',
        description: 'Your appeal has been sent to our moderation team. You will receive an email response within 24-48 hours.',
      });
      setShowAppealDialog(false);
      setAppealMessage('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit appeal. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleAppealSubmit = () => {
    if (!appealMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for your appeal.',
        variant: 'destructive',
      });
      return;
    }

    appealMutation.mutate({ message: appealMessage.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 text-center border border-red-200 dark:border-red-800">
          {/* Warning Icon */}
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
            Account Suspended
          </h1>

          {/* Suspension Details */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
              <div className="flex justify-between">
                <span>Reason:</span>
                <span className="font-medium">Multiple user reports</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">3 days</span>
              </div>
              {(timeRemaining.days > 0 || timeRemaining.hours > 0 || timeRemaining.minutes > 0 || timeRemaining.seconds > 0) && (
                <div className="flex justify-between">
                  <span>Time remaining:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Your account has been temporarily suspended due to multiple reports from other users. 
            This is a safety measure to protect our community.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => {
                console.log("Appeal Suspension button clicked");
                setShowAppealDialog(true);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Appeal Suspension
            </Button>

            <Button 
              variant="outline" 
              onClick={onLogout}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Sign Out
            </Button>
          </div>

          {/* Contact Info */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
              Need help? Contact our support team:
            </p>
            <div className="flex justify-center gap-4 text-[10px]">
              <a 
                href="mailto:admin@kronogon.com" 
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Mail className="w-2.5 h-2.5" />
                admin@kronogon.com
              </a>
              <a 
                href="tel:+14694965620" 
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Phone className="w-2.5 h-2.5" />
                (469) 496-5620
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Appeal Dialog */}
      {showAppealDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAppealDialog(false)}
          />
          
          {/* Dialog Content */}
          <div className="relative w-[90vw] max-w-[500px] rounded-3xl border-2 shadow-2xl backdrop-blur-lg overflow-hidden bg-gradient-to-br from-indigo-900/95 via-purple-800/95 to-pink-700/95 border-cyan-400/30 p-6">
            {/* Futuristic Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
            <div className="absolute top-0 left-0 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-r from-cyan-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-2">
                  <Mail className="w-6 h-6 text-cyan-400" />
                  Appeal Suspension
                </h2>
                <p className="text-gray-300 text-sm">
                  Please explain why you believe this suspension was issued in error. 
                  Our moderation team will review your appeal within 24-48 hours.
                </p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="appeal-message" className="text-white text-sm font-medium block mb-2">
                    Your Message
                  </Label>
                  <Textarea
                    id="appeal-message"
                    value={appealMessage}
                    onChange={(e) => setAppealMessage(e.target.value)}
                    placeholder="Please explain your situation and why you believe this suspension should be lifted..."
                    className="min-h-[100px] w-full rounded-2xl border-2 border-cyan-400/30 bg-black/20 text-white placeholder:text-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 resize-none transition-all duration-200"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {appealMessage.length}/1000 characters
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={handleAppealSubmit}
                    disabled={appealMutation.isPending || !appealMessage.trim()}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 text-white font-medium"
                  >
                    {appealMutation.isPending ? 'Submitting...' : 'Submit Appeal'}
                  </Button>
                  <Button 
                    onClick={() => setShowAppealDialog(false)}
                    disabled={appealMutation.isPending}
                    className="rounded-2xl border-2 border-cyan-400/30 hover:border-cyan-400 bg-transparent hover:bg-cyan-400/10 text-white transform hover:scale-[1.02] transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}