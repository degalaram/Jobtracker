import { Moon, Sun, LogOut, Settings, Eye, EyeOff, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from './ThemeProvider'
import { DocumentsDialog } from './DocumentsDialog'
import logoImage from '@assets/image_1758850436132.png'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const { logout } = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false)

  const { data: userData } = useQuery<{ id: string; username: string; email: string; phone: string }>({
    queryKey: ['/api/auth/me'],
    enabled: isSettingsOpen,
  })

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest('POST', '/api/auth/change-password', { 
        currentPassword: '',
        newPassword: password 
      })
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully",
      })
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      })
    }
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/auth/account')
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      })
      setShowDeleteDialog(false)
      setIsSettingsOpen(false)
      setTimeout(() => {
        logout()
      }, 1500)
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete account",
      })
    }
  })

  const handleDeleteAccount = async () => {
    await deleteAccountMutation.mutateAsync()
  }

  useEffect(() => {
    if (isSettingsOpen && userData) {
      setFullName(userData.username || '');
      setEmail(userData.email || '');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isSettingsOpen, userData]);

  const handleSaveChanges = async () => {
    try {
      // Validate password fields if any password field is filled
      if (newPassword || confirmPassword) {
        // Don't trim - compare exact values
        if (!newPassword) {
          toast({
            title: "Password Required",
            description: "Please enter a new password",
            variant: "destructive",
          });
          return;
        }

        if (!confirmPassword) {
          toast({
            title: "Confirmation Required",
            description: "Please confirm your new password",
            variant: "destructive",
          });
          return;
        }

        if (newPassword.length < 6) {
          toast({
            title: "Invalid Password",
            description: "Password must be at least 6 characters",
            variant: "destructive",
          });
          return;
        }

        if (newPassword !== confirmPassword) {
          toast({
            title: "Password Mismatch",
            description: "New passwords do not match. Please ensure both fields are identical.",
            variant: "destructive",
          });
          return;
        }

        // Update password first
        await updatePasswordMutation.mutateAsync(newPassword);
      }

      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully",
      })

      setIsSettingsOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Save settings error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setIsSettingsOpen(false)
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <img
            src={logoImage}
            alt="Daily Tracker"
            className="w-6 h-6"
            data-testid="img-logo"
          />
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
            Daily Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDocumentsOpen(true)}
            data-testid="button-documents"
          >
            <FileText className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-center">Account Profile</DialogTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">Manage your account details and preferences</p>
          </DialogHeader>

          {/* Content */}
          <div className="p-6">
              {/* Personal Information Display Section */}
              <div className="mb-8 p-6 bg-muted/30 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>Personal Information</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Full Name</Label>
                    <p className="text-base font-medium mt-1" data-testid="text-display-username">
                      {userData?.username || 'Loading...'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone Number</Label>
                    <p className="text-base font-medium mt-1 flex items-center gap-2" data-testid="text-display-phone">
                      <span className="text-muted-foreground">📞</span>
                      {userData?.phone || 'Loading...'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email Address</Label>
                    <p className="text-base font-medium mt-1 flex items-center gap-2" data-testid="text-display-email">
                      <span className="text-muted-foreground">✉️</span>
                      {userData?.email || 'Loading...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="mb-6 space-y-4">
                <h3 className="text-lg font-semibold">Edit Password</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="bg-muted/50 pr-10"
                        data-testid="input-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-new-password"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPassword && newPassword.length < 6 && (
                      <p className="text-xs text-destructive">Password must be at least 6 characters</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="bg-muted/50 pr-10"
                        data-testid="input-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-confirm-password"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleSaveChanges}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  data-testid="button-save-changes"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>

              {/* Logout Button */}
              <div className="mt-6 pt-6 border-t">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>

              {/* Delete Account Section */}
              <div className="mt-6 pt-6 border-t border-destructive/20">
                <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. This will permanently delete your account and all associated data including jobs, tasks, and notes.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full"
                  data-testid="button-delete-account"
                >
                  Delete Account
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data including jobs, tasks, and notes from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">No</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Documents Dialog */}
      <DocumentsDialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen} />
    </>
  )
}