import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, Trash2, CheckCircle2, Clock, Mail, ShieldAlert, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface FeedbackItem {
  id: string;
  created_at: string;
  type: 'bug' | 'feature';
  message: string;
  user_email?: string;
  user_id?: string;
}

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bug' | 'feature'>('all');
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    fetchFeedback();
  }, [filter]);

  const checkAdmin = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    
    if (!data?.is_admin) {
      navigate('/');
    }
  };

  const fetchFeedback = async () => {
    try {
      let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('type', filter);
      
      const { data, error } = await query;
      if (error) throw error;
      setFeedback(data || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      const { error } = await supabase.from('feedback').delete().eq('id', id);
      if (error) throw error;
      setFeedback(feedback.filter(f => f.id !== id));
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24 pt-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Admin Feedback Terminal</h1>
            </div>
            <p className="text-neutral-500 text-sm">Review user reports and feature requests.</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            {['all', 'bug', 'feature'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filter === f 
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            <p className="text-neutral-500 text-sm animate-pulse">Accessing secure database...</p>
          </div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5 border-dashed">
            <p className="text-neutral-500 text-sm italic">No feedback found for this category.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {feedback.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                        item.type === 'bug' 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {item.type === 'bug' ? <Bug className="w-3 h-3" /> : <MessageSquarePlus className="w-3 h-3" />}
                        {item.type}
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <button 
                      onClick={() => deleteFeedback(item.id)}
                      className="p-2 rounded-xl bg-white/5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Message */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                  </div>

                  {/* User */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <Mail className="w-3.5 h-3.5 text-neutral-600" />
                    <span className="text-xs text-neutral-500 font-medium">
                      {item.user_email || 'Anonymous Guest'}
                    </span>
                    {item.user_id && (
                      <span className="text-[10px] text-neutral-700 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        ID: {item.user_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
