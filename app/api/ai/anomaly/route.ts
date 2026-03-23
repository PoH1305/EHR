import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { AnomalyRequestSchema, type AnomalyResult } from '@/lib/types'

export const runtime = 'edge'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = AnomalyRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { vitals } = parsed.data

    // If no vitals, return empty
    if (!vitals || vitals.length === 0) {
      return Response.json({ anomalies: [] })
    }

    // Call Gemini for context-aware anomaly detection
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      system: 'You are a clinical anomaly detection AI. Analyze the provided vitals and identify any concerning patterns or significant deviations. Return only a JSON array of AnomalyResult objects. Each object should have: vitalType, severity (LOW, MEDIUM, HIGH), description, and recommendation.',
      prompt: `Analyze these vitals for anomalies:\n\n${JSON.stringify(vitals, null, 2)}`,
    })

    // Clean up response if AI included markdown blocks
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    
    try {
      const anomalies = JSON.parse(cleanedText) as AnomalyResult[]
      return Response.json({ anomalies })
    } catch (parseError) {
      console.error('AI Anomaly Parse Error:', parseError, 'Raw Text:', text)
      // Fallback to empty instead of crashing if AI misformats
      return Response.json({ anomalies: [] })
    }
    
  } catch (error) {
    console.error('AI Anomaly Error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
