export const runtime = 'edge'

import { SummaryRequestSchema } from '@/lib/types'

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

    // In development, return a mock streaming response
    if (process.env.NODE_ENV === 'development') {
      const mockSummary = `## Health Summary for Patient

Based on your recent health records, here is an overview:

**Active Conditions:**
- Essential Hypertension (I10) — Being managed with Amlodipine 5mg daily
- Type 2 Diabetes Mellitus (E11) — Controlled with Metformin 500mg twice daily
- Generalized Anxiety Disorder (F41.1) — Treated with Escitalopram 10mg
- Migraine (G43.0) — Sumatriptan available for acute episodes

**Key Observations:**
- Your blood pressure has been trending slightly upward over the past 2 weeks. Consider discussing this with your cardiologist.
- A heart rate spike to 142 bpm was recorded recently. If you experienced palpitations, please inform your doctor.
- Your glucose reading of 148 mg/dL exceeded the normal fasting range. Monitor closely.

**Allergies to Note:**
- ⚠️ **Penicillin** — Severe (Anaphylaxis risk)
- Sulfa Drugs — Moderate (Rash)
- Latex — Mild (Contact Dermatitis)

**Recommendations:**
1. Schedule a follow-up with your cardiologist for blood pressure review
2. Continue blood glucose monitoring and share readings at your next endocrine visit
3. Keep emergency medications accessible for migraine episodes

---
*This is not a medical diagnosis. Always consult your healthcare provider for medical advice.*`

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const words = mockSummary.split(' ')
          let index = 0

          const interval = setInterval(() => {
            if (index < words.length) {
              const word = words[index]! + (index < words.length - 1 ? ' ' : '')
              controller.enqueue(encoder.encode(`0:${JSON.stringify(word)}\n`))
              index++
            } else {
              clearInterval(interval)
              controller.close()
            }
          }, 30)
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Production: call Google Gemini API directly (streaming, Free Tier)
    const apiKey = process.env.GEMINI_API_KEY ?? ''
    if (!apiKey) {
      return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
    }

    const geminiPayload = {
      contents: [{
        role: 'user',
        parts: [{
          text: `Summarize these health records for the patient:\n\n${JSON.stringify(records.entry, null, 2)}`
        }]
      }],
      systemInstruction: {
        role: 'user',
        parts: [{
          text: 'You are a compassionate health summary AI. Summarize in plain English for a patient. Never use medical jargon without explanation. Highlight anything requiring urgent attention. Use well-formatted markdown. End with: "This is not a medical diagnosis."'
        }]
      },
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.2, // Keep it deterministic and factual for health records
      }
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiPayload),
      }
    )

    if (!geminiResponse.ok || !geminiResponse.body) {
      return Response.json({ error: `Gemini API error: ${geminiResponse.status}` }, { status: 502 })
    }

    // Transform Gemini SSE stream into our simplified format
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiResponse.body!.getReader()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6)
                if (!dataStr) continue
                try {
                  const data = JSON.parse(dataStr) as { candidates: { content: { parts: { text: string }[] } }[] }
                  const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text
                  
                  if (textChunk) {
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(textChunk)}\n`))
                  }
                } catch { /* skip malformed events */ }
              }
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
