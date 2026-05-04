import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Users, Smartphone, Info, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { HoverButton } from './ui/hover-button';

interface OnboardingModalProps {
  isOpen: boolean;
  onAccepted: () => void;
}

export function OnboardingModal({ isOpen, onAccepted }: OnboardingModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();

  const handleAccept = async () => {
    if (!agreed || !session?.user?.id) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_accepted_terms: true })
        .eq('id', session.user.id);

      if (error) throw error;
      onAccepted();
    } catch (err) {
      console.error('Error accepting terms:', err);
      alert('Failed to save your preference. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-lg max-h-[85vh] bg-neutral-900/50 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 pb-0 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-normal tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">
                  Welcome to Lura Beta
                </h2>
              </div>
              <p className="text-neutral-500 text-sm ml-13">Please review our guidelines before joining the community.</p>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Development Warning */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-500/80">
                  <Info className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Active Development</h3>
                </div>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Lura is currently in Preview/Beta. Expect bugs and unfinished features as we refine the experience. 
                  Some features may be removed or replaced as development progresses.
                </p>
              </section>

              {/* Contributions & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Users className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Contributions</h3>
                  </div>
                  <p className="text-neutral-500 text-xs">We welcome contributions! Feel free to open issues or submit PRs on GitHub.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Smartphone className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Coming Soon</h3>
                  </div>
                  <p className="text-neutral-500 text-xs">A native Android version of Lura is currently in development and releasing soon!</p>
                </div>
              </div>

              {/* Conduct Rules */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                  <ShieldCheck className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Usage & Conduct</h3>
                </div>
                
                <div className="grid gap-3">
                  {[
                    { title: "Be Considerate", desc: "Respectful posting. Authentic connection, not conflict." },
                    { title: "Storage Conscious", desc: "Post sparingly due to storage limits. Avoid large/duplicate files." },
                    { title: "No Harassment", desc: "Bullying, hate speech, or targeted harassment is not tolerated." },
                    { title: "Content Standards", desc: "NSFW, illegal, or graphic content is strictly prohibited." },
                    { title: "No Spam or Botting", desc: "Automated posting or trending manipulation results in removal." },
                    { title: "Authenticity", desc: "No impersonating individuals or spreading misinformation." },
                    { title: "Permanent Bans", desc: "Violation of these standards results in an immediate and permanent ban." }
                  ].map((rule, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 rounded-xl hover:bg-white/5 transition-colors group">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-700 mt-1.5 shrink-0 group-hover:bg-neutral-400 transition-colors" />
                      <div>
                        <h4 className="text-xs font-bold text-neutral-300 mb-0.5">{rule.title}</h4>
                        <p className="text-[11px] text-neutral-500 leading-normal">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-8 pt-4 bg-neutral-900/80 backdrop-blur-xl border-t border-white/5 shrink-0 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <div className="w-6 h-6 rounded-lg border-2 border-white/10 peer-checked:border-white peer-checked:bg-white transition-all flex items-center justify-center group-hover:border-white/30">
                    <Check className={`w-4 h-4 text-black transition-transform ${agreed ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                  </div>
                </div>
                <span className="text-sm text-neutral-400 group-hover:text-neutral-200 transition-colors">
                  I agree to the terms and conditions of Lura
                </span>
              </label>

              <HoverButton
                onClick={handleAccept}
                disabled={!agreed || isSubmitting}
                className={`w-full py-5 rounded-2xl text-base font-bold transition-all ${
                  agreed 
                  ? 'bg-white text-black' 
                  : 'bg-white/5 text-neutral-600 opacity-50 grayscale cursor-not-allowed border border-white/5'
                }`}
              >
                {isSubmitting ? "Processing..." : "Continue to use Lura"}
              </HoverButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
