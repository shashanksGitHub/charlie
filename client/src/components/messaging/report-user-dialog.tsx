import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: number;
  reportedUserName: string;
  matchId?: number;
}

const reportReasons = [
  { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'spam', label: 'Spam or Unwanted Messages' },
  { value: 'fake_profile', label: 'Fake Profile or Catfishing' },
  { value: 'offensive_content', label: 'Offensive or Harmful Content' },
  { value: 'scam_fraud', label: 'Scam or Fraud Attempt' },
  { value: 'underage', label: 'Suspected Underage User' },
  { value: 'violence_threats', label: 'Violence or Threats' },
  { value: 'other', label: 'Other' },
];

export function ReportUserDialog({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  matchId,
}: ReportUserDialogProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const reportMutation = useMutation({
    mutationFn: async (data: {
      reportedUserId: number;
      reason: string;
      description: string;
      matchId?: number;
    }) => {
      return apiRequest('/api/report-user', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      // Invalidate matches and messages queries to reflect unmatch
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      
      toast({
        title: 'Report Submitted',
        description: 'Thank you for helping keep our community safe. The user has been immediately unmatched.',
      });
      
      // Auto-close and redirect to Messages page
      setTimeout(() => {
        handleClose();
        setLocation('/messages');
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Please select a reason for reporting.',
        variant: 'destructive',
      });
      return;
    }

    reportMutation.mutate({
      reportedUserId,
      reason,
      description,
      matchId,
    });
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setIsSubmitted(false);
    onClose();
  };

  if (isSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-[400px] max-h-[85vh] p-0 overflow-hidden border-0 bg-transparent shadow-none">
          {/* Futuristic Success Background */}
          <div className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-green-900 rounded-3xl border border-emerald-500/30 backdrop-blur-xl shadow-2xl">
            {/* Success Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <motion.div
                className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.7, 0.4]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-500/15 rounded-full blur-3xl"
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
            </div>

            <div className="relative z-10 text-center py-5 px-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: "backOut" }}
                className="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent mb-3">
                  Report Submitted Successfully
                </h3>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                  Thank you for helping keep our community safe. We take all reports seriously and will investigate immediately.
                </p>
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-emerald-300 font-medium mb-3">Immediate Actions Taken:</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p>• You and <span className="text-emerald-300">{reportedUserName}</span> have been instantly unmatched</p>
                    <p>• Both users can no longer contact each other</p>
                    <p>• Our moderation team has been notified</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-[400px] max-h-[85vh] p-0 overflow-hidden border-0 bg-transparent shadow-none">
        {/* Futuristic Background with Curved Edges */}
        <div className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 rounded-3xl border border-cyan-500/20 backdrop-blur-xl shadow-2xl">
          {/* Animated Background Orbs */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <motion.div
              className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.4, 0.2, 0.4]
              }}
              transition={{ 
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.5, 0.2]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
            />
          </div>

          {/* Main Content Container */}
          <div className="relative z-10 p-4">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <DialogTitle className="text-lg font-bold bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">
                  Report User
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-gray-300 leading-relaxed">
                Report <strong className="text-cyan-300">{reportedUserName}</strong> for community guideline violations. 
                This action will immediately unmatch you from this user and notify our moderation team.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {/* Reason Selection */}
              <div>
                <label className="text-xs font-medium mb-2 block text-gray-300">
                  Reason for Report <span className="text-cyan-400">*</span>
                </label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="bg-black/20 border-cyan-500/30 text-white rounded-2xl backdrop-blur-sm hover:border-cyan-400/50 transition-colors">
                    <SelectValue placeholder="Select a reason..." className="text-gray-400" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-500/30 rounded-2xl backdrop-blur-xl">
                    {reportReasons.map((item) => (
                      <SelectItem 
                        key={item.value} 
                        value={item.value}
                        className="text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Details */}
              <div>
                <label className="text-xs font-medium mb-2 block text-gray-300">
                  Additional Details (Optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any additional context..."
                  rows={2}
                  className="resize-none bg-black/20 border-cyan-500/30 text-white placeholder:text-gray-500 rounded-2xl backdrop-blur-sm hover:border-cyan-400/50 focus:border-cyan-400 transition-colors"
                />
              </div>

              {/* Safety Notice */}
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-3 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs text-gray-300">
                    <p className="font-medium mb-1 text-cyan-300">Your Safety Matters</p>
                    <p className="leading-relaxed text-xs">
                      Submitting this report will immediately unmatch you from this user and prevent all future contact. 
                      Our team reviews all reports within 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:border-gray-500 rounded-2xl backdrop-blur-sm transition-all duration-200"
                disabled={reportMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={reportMutation.isPending || !reason}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-medium rounded-2xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
              >
                {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}