
import { useState } from 'react'
import { Upload, Download, FileText, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'

interface ResumeTemplate {
  id: string
  name: string
  description: string
  previewUrl: string
  downloadUrl: string
  tags: string[]
}

export function ResumesTab() {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [scoreDetails, setScoreDetails] = useState<any>(null)

  const resumeTemplates: ResumeTemplate[] = [
    {
      id: 'jake-resume',
      name: "Jake's Resume (Anonymous)",
      description: 'Clean, ATS-friendly LaTeX template perfect for software engineers',
      previewUrl: 'https://www.overleaf.com/latex/templates/jakes-resume-anonymous/cstpnrbkhndnso',
      downloadUrl: 'https://www.overleaf.com/latex/templates/jakes-resume-anonymous/cstpnrbkhndnso',
      tags: ['Software Engineer', 'Clean', 'ATS-Friendly']
    },
    {
      id: 'modern-deedy',
      name: 'Deedy Resume',
      description: 'Modern two-column design popular among tech professionals',
      previewUrl: 'https://www.overleaf.com/latex/templates/deedy-cv/bjryvfsjdyxz',
      downloadUrl: 'https://www.overleaf.com/latex/templates/deedy-cv/bjryvfsjdyxz',
      tags: ['Modern', 'Two-Column', 'Tech']
    },
    {
      id: 'awesome-cv',
      name: 'Awesome CV',
      description: 'Professional LaTeX template with elegant design',
      previewUrl: 'https://www.overleaf.com/latex/templates/awesome-cv/dfnvtnhzhhbm',
      downloadUrl: 'https://www.overleaf.com/latex/templates/awesome-cv/dfnvtnhzhhbm',
      tags: ['Professional', 'Elegant', 'Detailed']
    },
    {
      id: 'sb2nov',
      name: 'SB2Nov Resume',
      description: 'Minimalist single-page resume for software developers',
      previewUrl: 'https://www.overleaf.com/latex/templates/software-engineer-resume/gqxmqsvsbdjf',
      downloadUrl: 'https://www.overleaf.com/latex/templates/software-engineer-resume/gqxmqsvsbdjf',
      tags: ['Minimalist', 'Single-Page', 'Developer']
    },
    {
      id: 'faangpath',
      name: 'FAANGPath Resume',
      description: 'Optimized for FAANG applications with skills matrix',
      previewUrl: 'https://www.overleaf.com/latex/templates/faangpath-simple-template/npsfpdqnxmbc',
      downloadUrl: 'https://www.overleaf.com/latex/templates/faangpath-simple-template/npsfpdqnxmbc',
      tags: ['FAANG', 'Skills Matrix', 'Technical']
    }
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file)
        toast({
          title: 'Resume Uploaded',
          description: `${file.name} is ready for analysis`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: 'Please upload a PDF file',
        })
      }
    }
  }

  const analyzeResume = async () => {
    if (!selectedFile || !jobDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please upload a resume and provide a job description',
      })
      return
    }

    setIsAnalyzing(true)

    try {
      // Create form data
      const formData = new FormData()
      formData.append('resume', selectedFile)
      formData.append('jobDescription', jobDescription)

      // Call API endpoint
      const response = await fetch('/api/resume/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      
      setAtsScore(result.score)
      setScoreDetails(result.details)

      toast({
        title: 'Analysis Complete',
        description: `Your resume scored ${result.score}% for this role`,
      })
    } catch (error) {
      console.error('Analysis error:', error)
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Unable to analyze resume. Please try again.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Fair Match'
    return 'Needs Improvement'
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
      {/* ATS Score Checker Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Resume ATS Checker
              </CardTitle>
              <CardDescription>
                Get your resume scored according to job description using AI
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Resume (PDF)</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : 'Click to upload resume'}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Job Description</label>
              <Textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>

          <Button
            onClick={analyzeResume}
            disabled={!selectedFile || !jobDescription.trim() || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
          </Button>

          {atsScore !== null && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">ATS Score</h3>
                <div className={`text-5xl font-bold ${getScoreColor(atsScore)}`}>
                  {atsScore}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {getScoreLabel(atsScore)}
                </p>
                <Progress value={atsScore} className="mt-4" />
              </div>

              {scoreDetails && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Analysis Details:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-background rounded">
                      <span>Keywords Match:</span>
                      <Badge variant={scoreDetails.keywordMatch >= 70 ? 'default' : 'secondary'}>
                        {scoreDetails.keywordMatch}%
                      </Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-background rounded">
                      <span>Skills Alignment:</span>
                      <Badge variant={scoreDetails.skillsMatch >= 70 ? 'default' : 'secondary'}>
                        {scoreDetails.skillsMatch}%
                      </Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-background rounded">
                      <span>Experience Match:</span>
                      <Badge variant={scoreDetails.experienceMatch >= 70 ? 'default' : 'secondary'}>
                        {scoreDetails.experienceMatch}%
                      </Badge>
                    </div>
                    <div className="flex justify-between p-2 bg-background rounded">
                      <span>Format Score:</span>
                      <Badge variant={scoreDetails.formatScore >= 70 ? 'default' : 'secondary'}>
                        {scoreDetails.formatScore}%
                      </Badge>
                    </div>
                  </div>
                  
                  {scoreDetails.suggestions && scoreDetails.suggestions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm mb-2">Suggestions:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {scoreDetails.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Professional Resume Templates
          </CardTitle>
          <CardDescription>
            Choose from 5 ATS-optimized templates for software jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumeTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(template.previewUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(template.downloadUrl, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
