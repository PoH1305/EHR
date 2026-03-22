export const runtime = 'edge'

import { AnomalyRequestSchema, type AnomalyResult } from '@/lib/types'

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

    // In development, perform basic statistical anomaly detection
    if (process.env.NODE_ENV === 'development') {
      const anomalies: AnomalyResult[] = []

      for (const series of vitals) {
        const values = series.readings.map((r) => r.value)
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(
          values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
        )

        for (const reading of series.readings) {
          const zScore = Math.abs((reading.value - mean) / (stdDev || 1))

          if (zScore > 2.5) {
            anomalies.push({
              vitalType: series.type,
              severity: zScore > 3.5 ? 'HIGH' : zScore > 3 ? 'MEDIUM' : 'LOW',
              description: `${series.type} reading of ${reading.value} ${series.unit} deviates significantly from average (${mean.toFixed(1)} ± ${stdDev.toFixed(1)})`,
              recommendation: `Consult your healthcare provider about the ${series.type} reading on ${new Date(reading.timestamp).toLocaleDateString()}`,
            })
          }
        }
      }

      return Response.json({ anomalies })
    }

    // Production: use AI for anomaly detection
    return Response.json({ anomalies: [] })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
