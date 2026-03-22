// In a production app, use Redis or a Database. 
// For this prototype, we use a global Map to persist codes across API calls.
const globalOtpStore = global as unknown as { otpStore?: Map<string, { code: string; expires: number }> }

if (!globalOtpStore.otpStore) {
  globalOtpStore.otpStore = new Map()
}

export const otpStore = globalOtpStore.otpStore
