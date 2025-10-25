
import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Loader2, Plus, Copy, ThumbsUp, ThumbsDown, Share2, RotateCw, X, Paperclip } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  imageUrl?: string
}

interface ChatHistory {
  id: string
  title: string
  messages: Message[]
  lastUpdated: Date
}

// Mock chatbot responses - no API needed!
const getMockResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase()
  
  // Job search related
  if (message.includes('job') || message.includes('career') || message.includes('interview')) {
    return "I can help you with job searching! Here are some tips:\n\n1. Update your resume regularly\n2. Customize your cover letter for each application\n3. Practice common interview questions\n4. Network on LinkedIn\n5. Follow up after applications\n\nWhat specific aspect would you like help with?"
  }
  
  // Resume help
  if (message.includes('resume') || message.includes('cv')) {
    return "For a strong resume:\n\n• Use action verbs (achieved, developed, led)\n• Quantify your accomplishments with numbers\n• Keep it to 1-2 pages\n• Include relevant skills and keywords\n• Proofread carefully\n\nWould you like specific resume section advice?"
  }
  
  // Interview prep
  if (message.includes('interview')) {
    return "Interview preparation tips:\n\n1. Research the company thoroughly\n2. Prepare STAR method examples\n3. Practice common questions\n4. Prepare questions to ask them\n5. Dress appropriately\n6. Arrive 10-15 minutes early\n\nNeed help with specific interview questions?"
  }
  
  // Cover letter
  if (message.includes('cover letter')) {
    return "Cover letter structure:\n\n1. Opening: Mention the position\n2. Why you're interested in the company\n3. Your relevant qualifications\n4. How you can add value\n5. Strong closing with call to action\n\nWant a sample cover letter template?"
  }
  
  // LinkedIn
  if (message.includes('linkedin')) {
    return "LinkedIn optimization:\n\n• Professional headshot photo\n• Compelling headline\n• Detailed experience section\n• Skills endorsements\n• Regular engagement with content\n• Connect with industry professionals\n\nWhat part of your LinkedIn needs work?"
  }
  
  // Networking
  if (message.includes('network')) {
    return "Networking strategies:\n\n1. Attend industry events\n2. Join professional groups\n3. Reach out to alumni\n4. Conduct informational interviews\n5. Maintain relationships\n6. Offer help to others\n\nHow can I help with your networking?"
  }
  
  // Salary negotiation
  if (message.includes('salary') || message.includes('negotiate')) {
    return "Salary negotiation tips:\n\n1. Research market rates\n2. Know your worth\n3. Wait for them to make first offer\n4. Consider total compensation\n5. Be confident but flexible\n6. Get it in writing\n\nNeed specific negotiation strategies?"
  }
  
  // Code/programming help
  if (message.includes('code') || message.includes('debug') || message.includes('programming')) {
    return "I can help with coding concepts! Here are some general tips:\n\n• Break problems into smaller parts\n• Use console.log/print for debugging\n• Read error messages carefully\n• Check documentation\n• Test incrementally\n\nWhat coding topic do you need help with?"
  }
  
  // Learning
  if (message.includes('learn') || message.includes('study')) {
    return "Learning strategies:\n\n1. Set specific goals\n2. Practice regularly\n3. Build projects\n4. Join communities\n5. Teach others what you learn\n6. Stay consistent\n\nWhat would you like to learn?"
  }
  
  // Greetings
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm here to help you with job searching, career advice, interview preparation, and general questions. What can I assist you with today?"
  }
  
  // Thanks
  if (message.includes('thank')) {
    return "You're welcome! Feel free to ask if you need anything else. Good luck with your job search! 🎉"
  }
  
  // Default response
  return "I'm here to help with:\n\n• Job search strategies\n• Resume and cover letter tips\n• Interview preparation\n• LinkedIn optimization\n• Networking advice\n• Salary negotiation\n• General career guidance\n\nWhat would you like to know more about?"
}

export function ChatGPTTab() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>(Date.now().toString())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleNewChat = () => {
    if (messages.length > 0) {
      const chatTitle = messages[0]?.content.slice(0, 30) + '...' || 'New conversation'
      const chatToSave: ChatHistory = {
        id: currentChatId || Date.now().toString(),
        title: chatTitle,
        messages: messages,
        lastUpdated: new Date()
      }
      
      setChatHistory(prev => {
        const existing = prev.find(c => c.id === chatToSave.id)
        if (existing) {
          return prev.map(c => c.id === chatToSave.id ? chatToSave : c)
        }
        return [chatToSave, ...prev]
      })
    }
    
    const newChatId = Date.now().toString()
    setCurrentChatId(newChatId)
    setMessages([])
    setInput('')
    setUploadedImage(null)
  }
  
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const chatTitle = messages[0]?.content.slice(0, 30) + '...' || 'New conversation'
      const chatToSave: ChatHistory = {
        id: currentChatId,
        title: chatTitle,
        messages: messages,
        lastUpdated: new Date()
      }
      
      setChatHistory(prev => {
        const existing = prev.find(c => c.id === currentChatId)
        if (existing) {
          return prev.map(c => c.id === currentChatId ? chatToSave : c)
        }
        return [chatToSave, ...prev]
      })
    }
  }, [messages, currentChatId])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB',
        })
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: 'Copied to clipboard',
      description: 'Message copied successfully',
    })
  }

  const handleShareMessage = (content: string) => {
    if (navigator.share) {
      navigator.share({
        text: content
      }).catch(() => {
        handleCopyMessage(content)
      })
    } else {
      handleCopyMessage(content)
      toast({
        title: 'Link copied',
        description: 'Message copied to clipboard',
      })
    }
  }

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (messageIndex < 1) return
    
    const userMessagesBefore = messages.slice(0, messageIndex)
    const lastUserMessage = userMessagesBefore[userMessagesBefore.length - 1]
    
    setMessages(prev => [...prev.slice(0, messageIndex), ...prev.slice(messageIndex + 1)])
    setIsLoading(true)
    
    setTimeout(() => {
      const responseText = getMockResponse(lastUserMessage?.content || '')
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev.slice(0, messageIndex), assistantMessage, ...prev.slice(messageIndex)])
      setIsLoading(false)
    }, 500)
  }

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImage) || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim() || '[Image uploaded]',
      timestamp: new Date(),
      imageUrl: uploadedImage || undefined
    }

    setMessages(prev => [...prev, userMessage])
    const messageToRespond = input.trim()
    setInput('')
    setUploadedImage(null)
    setIsLoading(true)

    // Simulate thinking time
    setTimeout(() => {
      const responseText = uploadedImage 
        ? "I can see you've uploaded an image! While I can't actually analyze images in this demo version, I'm here to help with job search advice, interview tips, resume help, and career guidance. How can I assist you today?"
        : getMockResponse(messageToRespond)
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 800)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-background">
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-2">
          <Button 
            onClick={handleNewChat} 
            className="w-full justify-start gap-3 hover-elevate active-elevate-2"
            variant="ghost"
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {chatHistory.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-2 py-1">Recent</p>
                {chatHistory.slice(0, 10).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setMessages(chat.messages)
                      setCurrentChatId(chat.id)
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors line-clamp-1"
                    data-testid={`button-chat-${chat.id}`}
                  >
                    {chat.title}
                  </button>
                ))}
              </div>
            )}
            
            {messages.length > 0 && (
              <button className="w-full text-left px-3 py-2 text-sm rounded-md bg-accent line-clamp-1">
                {messages[0]?.content.slice(0, 35)}...
              </button>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col relative">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center max-w-3xl w-full">
              <h1 className="text-3xl md:text-4xl font-semibold mb-12">What can I help with?</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card 
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => setInput("Help me with my job search")}
                  data-testid="card-suggest-job"
                >
                  <p className="text-sm font-medium">Job search help</p>
                  <p className="text-xs text-muted-foreground mt-1">Get tips for finding your next role</p>
                </Card>
                <Card 
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => setInput("How do I prepare for an interview?")}
                  data-testid="card-suggest-interview"
                >
                  <p className="text-sm font-medium">Interview prep</p>
                  <p className="text-xs text-muted-foreground mt-1">Practice and preparation strategies</p>
                </Card>
                <Card 
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => setInput("Review my resume")}
                  data-testid="card-suggest-resume"
                >
                  <p className="text-sm font-medium">Resume tips</p>
                  <p className="text-xs text-muted-foreground mt-1">Improve your resume</p>
                </Card>
                <Card 
                  className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => setInput("Help with LinkedIn")}
                  data-testid="card-suggest-linkedin"
                >
                  <p className="text-sm font-medium">LinkedIn advice</p>
                  <p className="text-xs text-muted-foreground mt-1">Optimize your profile</p>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto py-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`px-4 py-6 ${message.role === 'assistant' ? 'bg-muted/30' : ''}`}
                >
                  <div className="max-w-3xl mx-auto">
                    <div className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-green-600 text-white'
                      }`}>
                        {message.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className={`flex-1 space-y-3 min-w-0 ${message.role === 'user' ? 'text-right' : ''}`}>
                        <div className="font-semibold text-sm">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        {message.imageUrl && (
                          <img 
                            src={message.imageUrl} 
                            alt="Uploaded" 
                            className={`max-w-xs rounded-lg border ${message.role === 'user' ? 'ml-auto' : ''}`}
                          />
                        )}
                        <div className={`text-sm whitespace-pre-wrap leading-relaxed ${message.role === 'user' ? 'text-left inline-block' : ''}`}>
                          {message.content}
                        </div>
                        
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1 mt-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyMessage(message.content)}
                              data-testid={`button-copy-${index}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              data-testid={`button-like-${index}`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              data-testid={`button-dislike-${index}`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleShareMessage(message.content)}
                              data-testid={`button-share-${index}`}
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRegenerateResponse(index)}
                              data-testid={`button-regenerate-${index}`}
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="px-4 py-6 bg-muted/30">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">
                        AI
                      </div>
                      <div className="flex-1">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t bg-background p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
            {uploadedImage && (
              <div className="mb-3 relative inline-block">
                <img 
                  src={uploadedImage} 
                  alt="Upload preview" 
                  className="max-h-32 rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => setUploadedImage(null)}
                  data-testid="button-remove-image"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            <div className="relative flex items-center gap-2 bg-muted/50 rounded-3xl border shadow-sm">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                data-testid="button-upload-image"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything about job search, interviews, resumes..."
                disabled={isLoading}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-3"
                data-testid="input-chat"
              />
              <Button 
                onClick={handleSend} 
                disabled={isLoading || (!input.trim() && !uploadedImage)}
                size="icon"
                className="mr-2 h-8 w-8 rounded-full"
                data-testid="button-send"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <p className="text-xs text-muted-foreground">
                This is a demo chatbot with pre-programmed responses - no API needed!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
