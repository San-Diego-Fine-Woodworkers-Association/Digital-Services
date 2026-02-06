// @ts-nocheck
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body || {}
    if (username === 'admin' && password === 'admin') {
      // Dev-only user payload
      const user = {
        id: 'dev-admin',
        email: 'admin@local',
        name: 'Admin (dev)',
        roles: ['member', 'volunteer'],
      }
      return NextResponse.json({ ok: true, user })
    }
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (_err) {
    return NextResponse.json(
      { error: 'Bad request' },
      { status: 400 }
    )
  }
}
