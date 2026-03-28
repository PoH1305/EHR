import { NextResponse } from 'next/server'

// Standard Data Categories based on Step 3
const CATEGORIES = [
  'personal_info',
  'diagnosis_history',
  'medications',
  'allergies',
  'lab_reports',
  'radiology_reports',
  'vital_signs',
  'doctor_notes'
]

// Fallback rules for high reliability (Step 11)
const FALLBACK_RULES: Record<string, any> = {
  'Cardiologist': {
    'Routine Checkup': {
      allowed_sections: ['vital_signs', 'medications', 'lab_reports'],
      permission_type: 'view',
      time_duration_hours: 24
    },
    'Emergency': {
      allowed_sections: ['vital_signs', 'allergies', 'medications', 'diagnosis_history'],
      permission_type: 'view',
      time_duration_hours: 48
    }
  },
  'Emergency Doctor': {
    'Emergency': {
      allowed_sections: ['vital_signs', 'allergies', 'medications', 'diagnosis_history', 'personal_info'],
      permission_type: 'view',
      time_duration_hours: 72
    }
  },
  'Default': {
    allowed_sections: ['vital_signs', 'medications'],
    permission_type: 'view',
    time_duration_hours: 24
  }
}

export async function POST(req: Request) {
  try {
    const { role, reason } = await req.json()

    if (!role || !reason) {
      return NextResponse.json({ error: 'Role and Reason required' }, { status: 400 })
    }

    console.log(`[AI-Minimization] Suggesting for Role: ${role}, Reason: ${reason}`)

    // Log the request (Step 12)
    // In a real app, this would go to a persistent log table
    
    // AI Integration (Step 10)
    // Note: In this implementation, we prioritize the fallbacks for the specific requested roles,
    // but we can easily bridge to OpenAI/Gemini here.
    
    let suggestion = FALLBACK_RULES[role]?.[reason] || FALLBACK_RULES[role]?.['Default'] || FALLBACK_RULES['Default']

    // Simulate AI smart logic if not found in explicit hardcoded rules
    if (!FALLBACK_RULES[role]?.[reason]) {
      // Dynamic logic for roles not in static map
      if (role === 'Radiologist') {
        suggestion = {
          allowed_sections: ['radiology_reports', 'diagnosis_history'],
          permission_type: 'view',
          time_duration_hours: 48
        }
      } else if (reason.includes('Surgery')) {
        suggestion = {
          allowed_sections: ['lab_reports', 'vital_signs', 'allergies', 'medications', 'diagnosis_history'],
          permission_type: 'download',
          time_duration_hours: 168 // 1 week
        }
      }
    }

    return NextResponse.json({
      role,
      reason,
      suggestion,
      isAiGenerated: false, // Flag to indicate if LLM was used or fallback
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[AI-Minimization] Error:', error.message)
    return NextResponse.json({ 
      role: 'unknown',
      reason: 'unknown',
      suggestion: FALLBACK_RULES['Default'],
      error: error.message 
    })
  }
}
