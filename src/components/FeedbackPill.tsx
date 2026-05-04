import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { HoverButton } from './ui/hover-button';

import { useLocation } from 'react-router-dom';

import { FeedbackModal } from './FeedbackModal';
import bugIcon from '../assets/bug-feedback.png';

export function FeedbackPill() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/reset-password';

  // ONLY show on auth pages (Login, Signup, etc.)
  if (!isAuthPage) {
    return null;
  }

  return (
    <>
      {/* Floating Pill (Only on Auth Pages) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02, opacity: 1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-lg group hover:bg-white/10 transition-all duration-300 opacity-60 hover:opacity-100"
      >
        <img src={bugIcon} alt="Feedback" className="w-4 h-4 invert opacity-60 group-hover:opacity-100 transition-opacity" />
        <span className="text-[11px] font-medium tracking-tight text-neutral-500 group-hover:text-neutral-300 uppercase">Feedback</span>
      </motion.button>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
