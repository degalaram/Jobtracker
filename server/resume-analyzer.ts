
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface ResumeAnalysisResult {
  score: number
  details: {
    keywordMatch: number
    skillsMatch: number
    experienceMatch: number
    formatScore: number
    suggestions: string[]
  }
}

export async function analyzeResumeWithAI(
  resumeText: string,
  jobDescription: string
): Promise<ResumeAnalysisResult> {
  const prompt = `You are an expert ATS (Applicant Tracking System) and recruiting AI. Analyze the following resume against the job description and provide a detailed scoring.

Job Description:
${jobDescription}

Resume Content:
${resumeText}

Please analyze and provide:
1. Overall ATS score (0-100)
2. Keyword match percentage (0-100)
3. Skills alignment percentage (0-100)
4. Experience match percentage (0-100)
5. Format/structure score (0-100)
6. Top 5 specific suggestions to improve the resume for this role

Respond ONLY with valid JSON in this exact format:
{
  "score": <number>,
  "keywordMatch": <number>,
  "skillsMatch": <number>,
  "experienceMatch": <number>,
  "formatScore": <number>,
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid AI response format')
    }

    const analysis = JSON.parse(jsonMatch[0])

    return {
      score: analysis.score || 0,
      details: {
        keywordMatch: analysis.keywordMatch || 0,
        skillsMatch: analysis.skillsMatch || 0,
        experienceMatch: analysis.experienceMatch || 0,
        formatScore: analysis.formatScore || 0,
        suggestions: analysis.suggestions || [],
      },
    }
  } catch (error) {
    console.error('AI analysis error:', error)
    throw new Error('Failed to analyze resume with AI')
  }
}
