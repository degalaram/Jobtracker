import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient, apiRequest } from '@/lib/queryClient'
import { Header } from './Header'
import { TabNavigation } from './TabNavigation'
import { JobsTab } from './JobsTab'
import { TasksTab } from './TasksTab'
import { NotesTab } from './NotesTab'
import { SocialMediaTab } from './SocialMediaTab'
import { ChatAssistant } from './ChatAssistant'

import { ThemeProvider } from './ThemeProvider'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useLocation } from 'wouter'

interface Task {
  id: string
  title: string
  company: string
  url?: string
  type: 'job-application' | 'follow-up' | 'interview' | 'other'
  completed: boolean
  addedDate: string
}

interface JobData {
  id: string
  url: string
  title: string
  company: string
  location: string
  type: string
  description: string
  postedDate: string
}

interface User {
  id: string
  username: string
  email: string
  password?: string
}

interface ProfileFormValues {
  fullName: string
  email: string
  currentPassword?: string
  newPassword?: string
}

function DailyTrackerContent() {
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const [activeTab, setActiveTab] = useState<'jobs' | 'tasks' | 'notes' | 'social'>('jobs')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // Use React Query for tasks - this enables real-time sync via WebSocket
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  })

  const addTaskMutation = useMutation({
    mutationFn: async (newTaskData: Omit<Task, 'id'>) => {
      // apiRequest throws on !res.ok, so we only reach here on success
      const res = await apiRequest('POST', '/api/tasks', newTaskData)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })
    },
  })

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest('DELETE', `/api/jobs/${jobId}`)
      if (res.status !== 204) {
        return res.json()
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] })
    },
  })

  const handleAddToTasks = async (job: JobData) => {
    const newTaskData = {
      title: `Apply to ${job.title} position`,
      company: job.company,
      url: job.url,
      type: 'job-application' as const,
      completed: false,
      addedDate: 'just now' // This will be updated to a proper date in the backend or a more robust client-side logic
    }

    try {
      await addTaskMutation.mutateAsync(newTaskData)
      await deleteJobMutation.mutateAsync(job.id)
      setActiveTab('tasks')
    } catch (error: any) {
      if (error.message && error.message.includes('Task with this URL already exists')) {
        toast({
          title: '✅ Application Already Added!',
          description: 'The job has already been added to your list.',
          className: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
        })
        return
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add task',
      })
    }
  }

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest('PUT', `/api/tasks/${id}`, { completed })
      if (!res.ok) {
        throw new Error('Failed to update task')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update task",
      });
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/tasks/${id}`)
      if (res.status !== 204) {
        return res.json()
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })
    },
  })

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    try {
      await toggleTaskMutation.mutateAsync({ id, completed: !task.completed })
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await apiRequest('PATCH', '/api/auth/user', userData)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] })
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    }
  })

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    updateProfileMutation.mutate({
      username: data.fullName,
      email: data.email,
    })
  }

  const handlePasswordChange = async (data: ProfileFormValues) => {
    if (!data.currentPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your current password",
      });
      return;
    }

    if (!data.newPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a new password",
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      setShowEditProfile(false);
      profileForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to change password",
      });
    }
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/auth/account')
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      // Redirect to login page after a brief delay
      setTimeout(() => {
        setLocation('/auth')
      }, 1500)
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete account",
      });
    }
  })

  const handleDeleteAccount = async () => {
    setShowDeleteDialog(false)
    await deleteAccountMutation.mutateAsync()
  }

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(zod.object({
      fullName: zod.string().min(1, { message: "Full name is required" }),
      email: zod.string().email({ message: "Invalid email address" }),
      currentPassword: zod.string().optional(),
      newPassword: zod.string().optional(),
    })),
    defaultValues: {
      fullName: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
    },
  });

  // Fetch user's current password for display
  const { data: userData } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    enabled: showEditProfile,
  });

  // Pre-fill with user data
  useEffect(() => {
    if (showEditProfile && user) {
      profileForm.reset({
        fullName: user.username || '',
        email: user.email || '',
        currentPassword: userData?.password || '',
        newPassword: '',
      });
    }
  }, [showEditProfile, user, userData]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-0 sm:px-4">
        {activeTab === 'jobs' && (
          <JobsTab onAddToTasks={handleAddToTasks} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab />
        )}
        {activeTab === 'social' && (
          <SocialMediaTab />
        )}
      </main>
    </div>
  )
}

export function DailyTracker() {
  return (
    <ThemeProvider>
      <DailyTrackerContent />
    </ThemeProvider>
  )
}

export default DailyTracker