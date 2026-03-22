export const runtime = 'edge'

import { SearchRequestSchema, type SearchResult } from '@/lib/types'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json()
    const parsed = SearchRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { query, records } = parsed.data

    // Extract entries from records FHIR bundle
    const entries = records.entry as Array<{ resource: Record<string, unknown> }> | undefined
    const results: SearchResult[] = (entries ?? [])
      .filter((entry) => {
        const resource = entry.resource
        const text = JSON.stringify(resource).toLowerCase()
        return text.includes(query.toLowerCase())
      })
      .slice(0, 10)
      .map((entry, index) => ({
        resourceId: (entry.resource['id'] as string) ?? `resource-${index}`,
        resourceType: (entry.resource['resourceType'] as string) ?? 'Unknown',
        relevance: 1 - index * 0.1,
        snippet: truncateText(JSON.stringify(entry.resource), 120),
      }))

    return Response.json({ results })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}
