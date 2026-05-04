import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { HoverButton } from './ui/hover-button';

export function FeedbackPill() {
  const [isOpen, setIsOpen] = useState(false);
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
        setIsOpen(false);
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
    <>
      {/* Floating Pill */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group hover:bg-white/20 transition-all duration-300"
      >
        <MessageSquarePlus className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
        <span className="text-sm font-medium tracking-wide">Feedback</span>
      </motion.button>

      {/* Modal Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-normal tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-400">
                    Submit Feedback
                  </h2>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {isSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-12 text-center"
                  >
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Thank you!</h3>
                    <p className="text-neutral-400 text-sm">Your feedback helps make Lura better.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Feedback Type Toggle */}
                    <div className="flex gap-4 p-1 bg-white/5 rounded-xl border border-white/5">
                      <button
                        type="button"
                        onClick={() => setType('feature')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                          type === 'feature' 
                          ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' 
                          : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        Feature
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('bug')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                          type === 'bug' 
                          ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10' 
                          : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        <Bug className="w-4 h-4" />
                        Bug
                      </button>
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-400 ml-1">Your message</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={type === 'feature' ? "What would you like to see in Lura?" : "What's broken?"}
                        className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all resize-none"
                        required
                      />
                    </div>

                    <HoverButton
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      className="w-full py-4 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
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
    </>
  );
}
