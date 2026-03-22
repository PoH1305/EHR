// This route MUST use Node.js runtime — pdf-parse requires Node.js fs API
export const runtime = 'nodejs'

import { FHIRBundleSchema } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return Response.json(
        { error: 'No file provided. Upload a PDF file.' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.includes('pdf') && !file.name?.endsWith('.pdf')) {
      return Response.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Dynamic import to isolate pdf-parse (prevents import-time fs issues)
    const pdfParse = (await import('pdf-parse')).default
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfData = await pdfParse(buffer)

    const extractedText = pdfData.text

    if (!extractedText || extractedText.trim().length === 0) {
      return Response.json(
        { error: 'Could not extract text from PDF' },
        { status: 422 }
      )
    }

    // Always use AI extraction for production-readiness
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'AI Extraction service not configured (Missing API Key)' },
        { status: 501 }
      )
    }

    // Production: send to Claude for FHIR extraction
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: 'Extract structured FHIR R4 resources from this lab report. Return as FHIR Bundle JSON. Only return valid JSON.',
        messages: [
          { role: 'user', content: `Extract FHIR R4 resources from this lab report:\n\n${extractedText}` },
        ],
      }),
    })

    if (!response.ok) {
      return Response.json(
        { error: `AI extraction failed: ${response.status}` },
        { status: 502 }
      )
    }

    const aiResponse = (await response.json()) as { content: Array<{ text: string }> }
    const jsonText = aiResponse.content[0]?.text ?? '{}'

    try {
      const parsed: unknown = JSON.parse(jsonText)
      const validated = FHIRBundleSchema.parse(parsed)

      return Response.json({
        bundle: validated,
        extractedCount: validated.entry?.length ?? 0,
      })
    } catch {
      return Response.json(
        { error: 'AI returned invalid FHIR Bundle JSON' },
        { status: 422 }
      )
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
