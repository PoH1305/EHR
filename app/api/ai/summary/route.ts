import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { SummaryRequestSchema } from '@/lib/types'

export const runtime = 'edge'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = SummaryRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { records } = parsed.data
    
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: 'You are a compassionate health summary AI. Summarize in plain English for a patient. Never use medical jargon without explanation. Highlight anything requiring urgent attention. Use well-formatted markdown. End with: "This is not a medical diagnosis."',
      prompt: `Summarize these health records for the patient:\n\n${JSON.stringify(records.entry, null, 2)}`,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('AI Summary Error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
