import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Explore from './pages/Explore'
import Activity from './pages/Activity'
import PostDetail from './pages/PostDetail'
import ResetPassword from './pages/ResetPassword'
import MessagesList from './pages/MessagesList'
import Chat from './pages/Chat'
import Premium from './pages/Premium'
import AdminFeedback from './pages/AdminFeedback'

// A wrapper for protected routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route 
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } 
      >
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/post/:postId" element={<PostDetail />} />
        <Route path="/messages" element={<MessagesList />} />
        <Route path="/messages/:conversationId" element={<Chat />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/admin/feedback" element={<AdminFeedback />} />
      </Route>
    </Routes>
  )
}

import { FeedbackPill } from './components/FeedbackPill'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <FeedbackPill />
      </AuthProvider>
    </BrowserRouter>
  )
}
