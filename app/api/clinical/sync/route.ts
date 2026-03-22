import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic';

const SyncSchema = z.object({
  patientId: z.string().min(1),
  vitals: z.array(z.any()).optional(),
  conditions: z.array(z.any()).optional(),
  medications: z.array(z.any()).optional(),
  clinicalNotes: z.array(z.any()).optional(),
})

export async function GET() {
  headers() // Force dynamic runtime even harder
  return NextResponse.json({ status: 'Sync endpoint active' })
}

export async function POST(request: Request) {
  try {
    const rawData = await request.json()
    const validation = SyncSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid Request Schema', 
        details: validation.error.format() 
      }, { status: 400 })
    }

    const { patientId, vitals, conditions, medications, clinicalNotes } = validation.data

    // Use a transaction to ensure atomic synchronization
    await prisma.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // 1. Ensure patient exists
      await tx.patient.upsert({
        where: { id: patientId },
        update: {},
        create: {
          id: patientId,
          name: 'Anonymous Patient', // Default to anonymous if name not provided in sync
          healthId: `HID-${patientId}`,
        },
      })

      // 2. Sync Vitals
      if (vitals && Array.isArray(vitals)) {
        for (const v of vitals) {
          await tx.vital.create({
            data: {
              patientId,
              type: v.type,
              value: v.latestValue || v.value,
              unit: v.unit,
              timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
            },
          })
        }
      }

      // 3. Sync Conditions
      if (conditions && Array.isArray(conditions)) {
        for (const c of conditions) {
          await tx.condition.upsert({
            where: { id: c.id },
            update: {
              clinicalStatus: c.clinicalStatus || 'active',
            },
            create: {
              id: c.id,
              patientId,
              code: c.code || 'unknown',
              display: c.display || c.name || 'Unknown Condition',
              clinicalStatus: c.clinicalStatus || 'active',
              onsetDateTime: c.onsetDateTime || c.since,
            },
          })
        }
      }

      // 4. Sync Medications
      if (medications && medications.length > 0) {
        for (const med of medications) {
          await tx.medication.upsert({
            where: { id: med.id }, // Assuming med.id is stable
            update: {
              status: med.status,
              intent: med.intent,
              priority: med.priority,
              medicationReference: (med.medicationReference as any)?.display || 'Unknown', // eslint-disable-line @typescript-eslint/no-explicit-any
            },
            create: {
              id: med.id,
              patientId,
              status: med.status,
              intent: med.intent,
              priority: med.priority,
              medicationReference: (med.medicationReference as any)?.display || 'Unknown', // eslint-disable-line @typescript-eslint/no-explicit-any
            }
          })
        }
      }

      // 5. Sync Clinical Notes
      if (clinicalNotes && Array.isArray(clinicalNotes)) {
        for (const n of clinicalNotes) {
          await tx.clinicalNote.upsert({
            where: { id: n.id },
            update: { content: n.content },
            create: {
              id: n.id,
              patientId,
              doctorId: n.doctorId || 'doc-001',
              content: n.content,
              timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
            },
          })
        }
      }
    })

    return NextResponse.json({ success: true, message: 'Clinical data synchronized to PostgreSQL' })
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('PostgreSQL Sync Error:', error)
    return NextResponse.json({ error: 'Failed to sync clinical data', details: error.message }, { status: 500 })
  }
}
