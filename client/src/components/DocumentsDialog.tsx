
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { 
  Upload, 
  FileText, 
  FolderPlus, 
  File as FileIcon, 
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  X,
  Image as ImageIcon,
  ArrowLeft
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { File as FileType } from '@shared/schema'

interface DocumentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentsDialog({ open, onOpenChange }: DocumentsDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileType | null>(null)
  const [fileToRename, setFileToRename] = useState<FileType | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [viewerFile, setViewerFile] = useState<FileType | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'My Drive' }
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const { data: files = [], isLoading } = useQuery<FileType[]>({
    queryKey: ['/api/files'],
    enabled: open,
  })

  const { data: folders = [] } = useQuery<any[]>({
    queryKey: ['/api/folders'],
    enabled: open,
  })

  // Filter files by current folder and allowed types
  const filteredFiles = files.filter(file => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    const isAllowedType = allowedTypes.includes(file.mimeType.toLowerCase())
    const isInCurrentFolder = file.folderId === currentFolderId
    return isAllowedType && isInCurrentFolder
  })

  // Get folders in current directory
  const currentFolders = folders.filter(folder => folder.parentId === currentFolderId)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type)
      
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      
      console.log('Upload response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Upload error response:', errorText)
        let errorMessage = 'Failed to upload file'
        try {
          const error = JSON.parse(errorText)
          errorMessage = error.error || errorMessage
        } catch (e) {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] })
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      })
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = ''
      }
    },
    onError: (error: any) => {
      console.error('Upload mutation error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      })
      setIsUploading(false)
    },
  })

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest('PATCH', `/api/files/${id}`, { name })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] })
      toast({
        title: 'Success',
        description: 'File renamed successfully',
      })
      setFileToRename(null)
      setNewFileName('')
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to rename file',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/files/${id}`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] })
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      })
      setFileToDelete(null)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete file',
        variant: 'destructive',
      })
    },
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) {
      toast({
        title: 'Error',
        description: 'No file selected',
        variant: 'destructive',
      })
      return
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    
    setIsUploading(true)
    
    // Group files by folder path
    const folderMap = new Map<string, File[]>()
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Error',
          description: `${file.name}: Only PDF and image files (PNG, JPG) are allowed`,
          variant: 'destructive',
        })
        continue
      }

      // Extract folder path from webkitRelativePath
      const relativePath = (file as any).webkitRelativePath || ''
      const pathParts = relativePath.split('/')
      const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : ''
      
      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, [])
      }
      folderMap.get(folderPath)!.push(file)
    }

    // Process each folder
    for (const [folderPath, folderFiles] of folderMap.entries()) {
      let parentFolderId = currentFolderId
      
      // Create folder hierarchy if needed
      if (folderPath) {
        const pathParts = folderPath.split('/')
        for (const folderName of pathParts) {
          // Check if folder already exists
          const existingFolder = folders.find(
            f => f.name === folderName && f.parentId === parentFolderId
          )
          
          if (existingFolder) {
            parentFolderId = existingFolder.id
          } else {
            // Create new folder
            try {
              const res = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  name: folderName,
                  parentId: parentFolderId,
                }),
              })
              
              if (res.ok) {
                const newFolder = await res.json()
                parentFolderId = newFolder.id
                queryClient.invalidateQueries({ queryKey: ['/api/folders'] })
              }
            } catch (error) {
              console.error('Error creating folder:', error)
            }
          }
        }
      }
      
      // Upload files to the folder
      for (const file of folderFiles) {
        const formData = new FormData()
        formData.append('file', file)
        if (parentFolderId) {
          formData.append('folderId', parentFolderId)
        }
        
        try {
          const res = await fetch('/api/files/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          })
          
          if (res.ok) {
            queryClient.invalidateQueries({ queryKey: ['/api/files'] })
          }
        } catch (error) {
          console.error('Error uploading file:', error)
        }
      }
    }
    
    setIsUploading(false)
    toast({
      title: 'Success',
      description: 'Folder uploaded successfully',
    })
    
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const handleDownload = async (file: FileType) => {
    try {
      const res = await fetch(`/api/files/${file.id}/download`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Download failed')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Success',
        description: 'File downloaded successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download file',
        variant: 'destructive',
      })
    }
  }

  const handleRename = () => {
    if (fileToRename && newFileName.trim()) {
      renameMutation.mutate({ id: fileToRename.id, name: newFileName.trim() })
    }
  }

  const handleDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.id)
    }
  }

  const handleFileDoubleClick = (e: React.MouseEvent, file: FileType) => {
    e.preventDefault()
    e.stopPropagation()
    setViewerFile(file)
  }

  const handleFolderDoubleClick = (folder: any) => {
    setCurrentFolderId(folder.id)
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }])
  }

  const navigateToFolder = (folderId: string | null, index: number) => {
    setCurrentFolderId(folderId)
    setFolderPath(folderPath.slice(0, index + 1))
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    return <FileIcon className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!open) return null

  // File Viewer Full Screen View
  if (viewerFile) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewerFile(null)}
              data-testid="button-back-to-files"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {getFileIcon(viewerFile.mimeType)}
            <h3 className="text-lg font-semibold truncate max-w-md">{viewerFile.name}</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(viewerFile)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        {/* File Content */}
        <div className="flex-1 overflow-auto bg-muted p-4 flex items-center justify-center">
          {viewerFile.mimeType.startsWith('image/') ? (
            <img
              src={`/api/files/${viewerFile.id}/download`}
              alt={viewerFile.name}
              className="max-w-full max-h-full object-contain"
              data-testid="img-file-viewer"
              onError={(e) => {
                console.error('Image load error:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : viewerFile.mimeType === 'application/pdf' ? (
            <embed
              src={`/api/files/${viewerFile.id}/download`}
              type="application/pdf"
              className="w-full h-full rounded"
              style={{ minHeight: '80vh' }}
              data-testid="pdf-viewer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">Preview not available for this file type</p>
              <Button onClick={() => handleDownload(viewerFile)} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main Files List View
  return (
    <>
      <div className="fixed inset-0 z-50 bg-background flex">
        {/* Left Sidebar */}
        <div className="w-56 border-r bg-muted/20 p-4 flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
            multiple
            data-testid="input-file-upload"
          />
          <input
            ref={folderInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
            multiple
            webkitdirectory=""
            data-testid="input-folder-upload"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full justify-start"
            variant="outline"
            data-testid="button-file-upload"
          >
            <Upload className="h-4 w-4 mr-2" />
            File Upload
          </Button>
          
          <Button
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className="w-full justify-start"
            variant="outline"
            data-testid="button-folder-upload"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Folder Upload
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">My Drive</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading files...</p>
              </div>
            ) : currentFolders.length === 0 && filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">No documents yet</p>
                <p className="text-sm text-muted-foreground">Upload PDF, PNG, or JPG files</p>
              </div>
            ) : (
              <div className="px-6 py-2">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                  {folderPath.map((folder, index) => (
                    <React.Fragment key={folder.id || 'root'}>
                      {index > 0 && <span className="text-muted-foreground">/</span>}
                      <button
                        onClick={() => navigateToFolder(folder.id, index)}
                        className="text-primary hover:underline"
                      >
                        {folder.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b text-sm font-medium text-muted-foreground">
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Owner</div>
                  <div className="col-span-3">Date modified</div>
                  <div className="col-span-2">File size</div>
                </div>

                {/* Folder Rows */}
                {currentFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 rounded-lg cursor-pointer group items-center"
                    onDoubleClick={() => handleFolderDoubleClick(folder)}
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      <FolderPlus className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium truncate">
                        {folder.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      me
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {formatDate(folder.createdAt)}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      -
                    </div>
                  </div>
                ))}

                {/* File Rows */}
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 rounded-lg cursor-pointer group items-center"
                    onDoubleClick={(e) => handleFileDoubleClick(e, file)}
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="col-span-5 flex items-center gap-3">
                      {getFileIcon(file.mimeType)}
                      <span className="text-sm font-medium truncate" data-testid={`text-filename-${file.id}`}>
                        {file.name}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      me
                    </div>
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {formatDate(file.createdAt)}
                    </div>
                    <div className="col-span-1 text-sm text-muted-foreground">
                      {formatFileSize(parseInt(file.size))}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            data-testid={`button-menu-${file.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDownload(file)}
                            data-testid={`button-download-${file.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setFileToRename(file)
                              setNewFileName(file.name)
                            }}
                            data-testid={`button-rename-${file.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setFileToDelete(file)}
                            className="text-destructive"
                            data-testid={`button-delete-${file.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <AlertDialog open={!!fileToRename} onOpenChange={(open) => !open && setFileToRename(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename File</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for the file
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Enter new name"
            data-testid="input-rename-file"
          />
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-rename">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRename}
              disabled={!newFileName.trim()}
              data-testid="button-confirm-rename"
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{fileToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
