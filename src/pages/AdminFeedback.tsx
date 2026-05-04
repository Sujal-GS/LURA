import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Bug, Trash2, CheckCircle2, Clock, Mail, ShieldAlert, Filter, Users, Search, Ban, Crown, UserMinus, UserCheck, ShieldCheck } from 'lucide-react';
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
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface ProfileItem {
  id: string;
  username: string;
  full_name: string;
  is_premium: boolean;
  is_banned: boolean;
  is_admin: boolean;
  avatar_url?: string;
}

export default function AdminTerminal() {
  const [activeTab, setActiveTab] = useState<'feedback' | 'users'>('feedback');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [users, setUsers] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'bug' | 'feature'>('all');
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    if (activeTab === 'feedback') fetchFeedback();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, feedbackFilter]);

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

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchFeedback = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // Fetch feedback with associated profile data
      let query = supabase
        .from('feedback')
        .select('*, profiles:user_id(username, avatar_url)')
        .order('created_at', { ascending: false });
      
      if (feedbackFilter !== 'all') query = query.eq('type', feedbackFilter);
      
      const { data, error } = await query;
      if (error) throw error;
      setFeedback(data || []);
    } catch (err: any) {
      console.error('Error fetching feedback:', err);
      setFetchError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(true);
      // Artificially keep loading for a second to show state
      setTimeout(() => setLoading(false), 500);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('username', { ascending: true });
      if (searchQuery) {
        query = query.ilike('username', `%${searchQuery}%`);
      } else {
        query = query.limit(20);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_premium: !currentStatus }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, is_premium: !currentStatus } : u));
    } catch (err) {
      alert('Failed to update premium status');
    }
  };

  const toggleBan = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'unban' : 'ban';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const { error } = await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));
    } catch (err) {
      alert('Failed to update ban status');
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

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black pb-[300px] pt-8 px-4 relative">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <ShieldAlert className="w-7 h-7 text-red-500" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-3xl md:text-5xl font-normal tracking-tight text-white whitespace-nowrap">Admin Terminal</h1>
              <p className="text-neutral-500 text-[10px] md:text-xs font-medium uppercase tracking-[0.3em]">System Control Unit</p>
            </div>
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl w-fit">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'feedback' 
                ? 'bg-white text-black shadow-xl' 
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
              }`}
            >
              <MessageSquarePlus className="w-4 h-4" />
              Feedback
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'users' 
                ? 'bg-white text-black shadow-xl' 
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'feedback' ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Feedback Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['all', 'bug', 'feature'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFeedbackFilter(f as any)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                      feedbackFilter === f 
                      ? 'bg-white/10 text-white border-white/20' 
                      : 'bg-transparent text-neutral-600 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {fetchError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center">
                  <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-4" />
                  <p className="text-red-500 font-bold mb-2">Access Error</p>
                  <p className="text-neutral-500 text-sm">{fetchError}</p>
                </div>
              ) : loading ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>
              ) : feedback.length === 0 ? (
                <p className="text-center py-20 text-neutral-600 italic">No feedback reported.</p>
              ) : (
                <div className="grid gap-4">
                  {feedback.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      className="bg-neutral-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 group hover:bg-neutral-900/60 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex flex-col gap-1">
                          <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${item.type === 'bug' ? 'text-red-500' : 'text-blue-500'}`}>
                            {item.type} Report
                          </div>
                          <div className="flex items-center gap-2 text-neutral-500 text-xs">
                            <Clock className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteFeedback(item.id)}
                          className="p-3 rounded-2xl bg-white/5 text-neutral-600 hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-black/20 rounded-2xl p-5 border border-white/5 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
                        <p className="text-sm text-neutral-300 leading-relaxed font-medium">{item.message}</p>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <div className="flex items-center gap-2 mr-auto">
                          <img 
                            src={item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.profiles?.username || 'User'}`} 
                            className="w-5 h-5 rounded-full object-cover border border-white/10"
                          />
                          <span className="text-[11px] font-bold text-neutral-400">
                            @{item.profiles?.username || 'unknown'}
                          </span>
                          <span className="text-neutral-700 text-[10px]">•</span>
                          <span className="text-[10px] font-medium text-neutral-600">{item.user_email || 'No Email'}</span>
                        </div>
                        <span className="text-[9px] text-neutral-700 font-mono">ID: {item.id.slice(0, 8)}</span>
                      </div>
                    </motion.div>
                  ))}
                  {/* Bottom Spacer */}
                  <div className="h-40" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* User Search */}
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  placeholder="Search by username (Press Enter)..."
                  className="w-full bg-white/5 border border-white/10 rounded-[2rem] pl-16 pr-8 py-5 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:border-white/20 transition-all"
                />
              </div>

              {loading ? (
                <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" /></div>
              ) : (
                <div className="grid gap-6">
                  {users.map((user) => (
                    <div key={user.id} className={`bg-neutral-900/40 backdrop-blur-2xl border ${user.is_banned ? 'border-red-500/20' : 'border-white/10'} rounded-[3rem] p-6 md:p-10 transition-all hover:bg-neutral-900/60`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img 
                              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} 
                              className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 ${user.is_premium ? 'border-yellow-500/40' : 'border-white/10'} object-cover`}
                            />
                            {user.is_admin && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 border-2 border-black">
                                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                              <h3 className="text-lg md:text-2xl font-bold text-white truncate max-w-[200px] md:max-w-none">@{user.username}</h3>
                              {user.is_premium && <Crown className="w-5 h-5 text-yellow-500" />}
                            </div>
                            <p className="text-neutral-500 text-sm md:text-base truncate">{user.full_name || 'No Name'}</p>
                            {user.is_banned && (
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-500 mt-2 block">Banned User</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                          {/* Premium Action */}
                          <button
                            onClick={() => togglePremium(user.id, user.is_premium)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                              user.is_premium 
                              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20' 
                              : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:border-white/20'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            {user.is_premium ? 'Remove Premium' : 'Grant Premium'}
                          </button>

                          {/* Ban Action */}
                          <button
                            onClick={() => toggleBan(user.id, user.is_banned)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                              user.is_banned 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                            }`}
                          >
                            {user.is_banned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            {user.is_banned ? 'Unban User' : 'Ban User'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Bottom Spacer */}
                  <div className="h-40" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-32 right-8 w-14 h-14 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center text-white shadow-2xl hover:bg-white/20 transition-all z-50 group"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
