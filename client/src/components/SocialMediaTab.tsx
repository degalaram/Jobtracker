import { useState } from 'react'
import { Plus, Trash2, ExternalLink, Edit, Save, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'

interface SocialMediaPost {
  id: string
  platform: string
  content: string
  url: string
}

export function SocialMediaTab() {
  const [platform, setPlatform] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null)

  const socialPlatforms = [
    {
      name: 'ChatGPT',
      url: 'https://chat.openai.com',
      color: 'hover:bg-emerald-600',
      description: 'AI Assistant',
      icon: (
        <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
        </svg>
      )
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com',
      color: 'hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-600 hover:to-orange-500',
      description: 'Photo & video sharing',
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12" fill="currentColor">
          <radialGradient id="instagram-gradient" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stopColor="#FFD521" />
            <stop offset="5%" stopColor="#FFD521" />
            <stop offset="50.1119%" stopColor="#F50000" />
            <stop offset="95%" stopColor="#B900B4" />
            <stop offset="95.0079%" stopColor="#B900B4" />
            <stop offset="100%" stopColor="#B900B4" />
          </radialGradient>
          <path fill="url(#instagram-gradient)" d="M34.017,41.99l-20,0.019c-4.4,0.004-8.003-3.592-8.008-7.992l-0.019-20c-0.004-4.4,3.592-8.003,7.992-8.008l20-0.019c4.4-0.004,8.003,3.592,8.008,7.992l0.019,20C42.014,38.383,38.417,41.986,34.017,41.99z"/>
          <path fill="#fff" d="M24,31c-3.859,0-7-3.14-7-7s3.141-7,7-7s7,3.14,7,7S27.859,31,24,31z M24,19c-2.757,0-5,2.243-5,5s2.243,5,5,5s5-2.243,5-5S26.757,19,24,19z"/>
          <circle cx="31.5" cy="16.5" r="1.5" fill="#fff"/>
          <path fill="#fff" d="M30,37H18c-3.859,0-7-3.14-7-7V18c0-3.86,3.141-7,7-7h12c3.859,0,7,3.14,7,7v12C37,33.86,33.859,37,30,37z M18,13c-2.757,0-5,2.243-5,5v12c0,2.757,2.243,5,5,5h12c2.757,0,5-2.243,5-5V18c0-2.757-2.243-5-5-5H18z"/>
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com',
      color: 'hover:bg-blue-600',
      description: 'Professional networking',
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12" fill="currentColor">
          <path fill="#0288D1" d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5V37z"/>
          <path fill="#FFF" d="M12 19H17V36H12zM14.485 17h-.028C12.965 17 12 15.888 12 14.499 12 13.08 12.995 12 14.514 12c1.521 0 2.458 1.08 2.486 2.499C17 15.887 16.035 17 14.485 17zM36 36h-5v-9.099c0-2.198-1.225-3.698-3.192-3.698-1.501 0-2.313 1.012-2.707 1.99C24.957 25.543 25 26.511 25 27v9h-5V19h5v2.616C25.721 20.5 26.85 19 29.738 19c3.578 0 6.261 2.25 6.261 7.274L36 36 36 36z"/>
        </svg>
      )
    },
    {
      name: 'Telegram',
      url: 'https://t.me/',
      color: 'hover:bg-sky-500',
      description: 'Messaging platform',
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12" fill="currentColor">
          <path fill="#29B6F6" d="M24 4A20 20 0 1 0 24 44A20 20 0 1 0 24 4Z"/>
          <path fill="#FFF" d="M33.95,15l-3.746,19.126c0,0-0.161,0.874-1.245,0.874c-0.576,0-0.873-0.274-0.873-0.274l-8.114-6.733 l-3.97-2.001l-5.095-1.355c0,0-0.907-0.262-0.907-1.012c0-0.625,0.933-0.923,0.933-0.923l21.316-8.468 c-0.001-0.001,0.651-0.235,1.126-0.234C33.667,14,34,14.125,34,14.5C34,14.75,33.95,15,33.95,15z"/>
          <path fill="#B0BEC5" d="M23,30.505l-3.426,3.374c0,0-0.149,0.115-0.348,0.12c-0.069,0.002-0.143-0.009-0.219-0.043 l0.964-5.965L23,30.505z"/>
          <path fill="#CFD8DC" d="M29.897,18.196c-0.169-0.22-0.481-0.26-0.701-0.093L16,26c0,0,2.106,5.892,2.427,6.912 c0.322,1.021,0.58,1.045,0.58,1.045l0.964-5.965l9.832-9.096C30.023,18.729,30.064,18.416,29.897,18.196z"/>
        </svg>
      )
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/',
      color: 'hover:bg-green-600',
      description: 'Messaging app',
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12" fill="currentColor">
          <path fill="#25D366" d="M24 4.02C12.984 4.02 4.02 12.984 4.02 24c0 3.514.908 6.958 2.639 10.005L4.02 43.98l10.228-2.64A19.98 19.98 0 0 0 24 43.98c11.016 0 19.98-8.964 19.98-19.98S35.016 4.02 24 4.02z"/>
          <path fill="#FFF" d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z"/>
          <path fill="#25D366" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z"/>
        </svg>
      )
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com',
      color: 'hover:bg-red-600',
      description: 'Video streaming',
      icon: (
        <svg viewBox="0 0 48 48" className="w-12 h-12" fill="currentColor">
          <path fill="#FF3D00" d="M43.2,33.9c-0.4,2.1-2.1,3.7-4.2,4c-3.3,0.5-8.8,1.1-15,1.1c-6.1,0-11.6-0.6-15-1.1c-2.1-0.3-3.8-1.9-4.2-4C4.4,31.6,4,28.2,4,24c0-4.2,0.4-7.6,0.8-9.9c0.4-2.1,2.1-3.7,4.2-4C12.3,9.6,17.8,9,24,9c6.2,0,11.6,0.6,15,1.1c2.1,0.3,3.8,1.9,4.2,4c0.4,2.3,0.9,5.7,0.9,9.9C44,28.2,43.6,31.6,43.2,33.9z"/>
          <path fill="#FFF" d="M20 31L20 17 32 24z"/>
        </svg>
      )
    }
  ]

  const { data: posts = [], isLoading } = useQuery<SocialMediaPost[]>({
    queryKey: ['/api/social-media'],
    refetchOnWindowFocus: false
  })

  const filteredPosts = posts.filter(post => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    const platformMatch = post.platform.toLowerCase().includes(query)
    const contentMatch = post.content.toLowerCase().includes(query)

    return platformMatch || contentMatch
  })

  const handleSocialClick = (url: string, platformName: string) => {
    if (platformName === 'Telegram') {
      // Try to open Telegram app directly
      const appUrl = 'tg://resolve'
      const webUrl = 'https://web.telegram.org'
      
      // Attempt to open the app
      const opened = window.open(appUrl, '_self')
      
      // If app doesn't open after a short delay, try web version
      setTimeout(() => {
        if (!opened || opened.closed) {
          window.open(webUrl, '_blank')
        }
      }, 1500)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Social Media Posts</CardTitle>
                <CardDescription>
                  Track your social media content and engagement
                </CardDescription>
              </div>
              <div className="flex gap-3 sm:gap-4 ml-4">
                <button
                  onClick={() => window.open('https://drive.google.com', '_blank')}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                  title="Open Google Drive"
                  data-testid="button-drive"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" 
                    alt="Google Drive" 
                    className="w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14"
                  />
                  <span className="text-xs md:text-sm font-medium">Drive</span>
                </button>
                <button
                  onClick={() => window.open('https://mail.google.com', '_blank')}
                  className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                  title="Open Gmail"
                  data-testid="button-gmail"
                >
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" 
                    alt="Gmail" 
                    className="w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14"
                  />
                  <span className="text-xs md:text-sm font-medium">Gmail</span>
                </button>
              </div>
            </div>

            {posts.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search posts by platform or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-posts"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Social Media Platform Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Quick Access</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {socialPlatforms.map((platform) => (
                  <div
                    key={platform.name}
                    onClick={() => handleSocialClick(platform.url, platform.name)}
                    className={`relative flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                      platform.color
                    } hover:scale-105 hover:shadow-xl hover:border-transparent group`}
                  >
                    <div className="transition-transform group-hover:scale-110 duration-300">
                      {platform.icon}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-base sm:text-lg">{platform.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                        {platform.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Posts Section */}
            {posts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Saved Posts</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground col-span-full">
                      <p>Loading posts...</p>
                    </div>
                  ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground col-span-full">
                      <p>No posts found matching "{searchQuery}"</p>
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={`relative flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    socialPlatforms.find(p => p.name === post.platform)?.color || 'hover:bg-gray-700'
                  } hover:scale-105 hover:shadow-xl hover:border-transparent group`}
                >
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSocialClick(post.url, post.platform)
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingPost(post)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Implement delete mutation here
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="transition-transform group-hover:scale-110 duration-300">
                    {socialPlatforms.find(p => p.name === post.platform)?.icon}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-base sm:text-lg">{post.platform}</div>
                    <div className="text-xs text-muted-foreground mt-1 hidden sm:block">
                      {post.content.length > 50 ? `${post.content.substring(0, 50)}...` : post.content}
                    </div>
                  </div>
                </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Edit Social Media Post</CardTitle>
              <CardDescription>Update the details of your social media post.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Platform
                  </label>
                  <Input
                    id="edit-platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    placeholder="e.g., Twitter, Facebook"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Content
                  </label>
                  <Textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What are you sharing?"
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="edit-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    URL (Optional)
                  </label>
                  <Input
                    id="edit-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Link to the post or relevant content"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
            <div className="p-4 sm:p-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingPost(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Implement save mutation here
                  setEditingPost(null)
                }}
              >
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}