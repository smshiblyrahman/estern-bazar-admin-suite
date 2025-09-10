import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER' | 'CALL_AGENT'
      status: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER' | 'CALL_AGENT'
    status: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER' | 'CALL_AGENT'
    status: string
  }
}
