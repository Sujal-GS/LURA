import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { HoverButton } from './ui/hover-button';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<'feature' | 'bug'>('feature');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            type,
            message: message.trim(),
            user_id: session?.user?.id || null,
            email: session?.user?.email || null
          }
        ]);

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setMessage('');
        setType('feature');
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-neutral-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-normal tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-400">
                  Submit Feedback
                </h2>
                <button 
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8 text-center"
                >
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">Thank you!</h3>
                  <p className="text-neutral-500 text-xs text-balance">Your feedback helps make Lura better.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setType('feature')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        type === 'feature' 
                        ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' 
                        : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      Feature
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('bug')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        type === 'bug' 
                        ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' 
                        : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <Bug className="w-3.5 h-3.5" />
                      Bug
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-neutral-600 ml-1">Your message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={type === 'feature' ? "What would you like to see?" : "What's broken?"}
                      className="w-full h-28 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all resize-none"
                      required
                    />
                  </div>

                  <HoverButton
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full py-4 flex items-center justify-center gap-2 text-sm rounded-2xl"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </HoverButton>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
