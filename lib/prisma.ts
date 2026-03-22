import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton> // eslint-disable-line no-var
}

const getPrisma = () => {
  if (globalThis.prisma) return globalThis.prisma
  const p = prismaClientSingleton()
  if (process.env.NODE_ENV !== 'production') globalThis.prisma = p
  return p
}

// Lazy-load Prisma to prevent initialization during Next.js build time
const prismaProxy = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    const instance = getPrisma()
    const value = (instance as any)[prop] // eslint-disable-line @typescript-eslint/no-explicit-any
    
    // If it's a function (like $transaction), bind it to the instance
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    
    return value
  }
})

export default prismaProxy
