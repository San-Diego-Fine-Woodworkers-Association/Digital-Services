import { NextRequest, NextResponse } from 'next/server'

const AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';

export async function requireMember(req: NextRequest) {
  try {
    // Call IdP session endpoint with incoming cookies
    const cookie = req.headers.get('cookie') || '';
    const res = await fetch(new URL('/api/auth/session', AUTH_URL).toString(), {
      headers: { cookie },
      credentials: 'include',
    });
    if (!res.ok) return NextResponse.redirect(`${AUTH_URL}/auth/signin`);
    const json = await res.json();
    const roles = json?.user?.roles || [];
    if (!roles.includes('member'))
      return NextResponse.redirect(`${AUTH_URL}/auth/signin`);
    return null;
  } catch (_e) {
    return NextResponse.redirect(`${AUTH_URL}/auth/signin`);
  }
}

export async function requireVolunteer(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const res = await fetch(new URL('/api/auth/session', AUTH_URL).toString(), {
      headers: { cookie },
      credentials: 'include',
    });
    if (!res.ok) return NextResponse.redirect(`${AUTH_URL}/auth/signin`);
    const json = await res.json();
    const roles = json?.user?.roles || [];
    if (!roles.includes('volunteer'))
      return NextResponse.redirect(`${AUTH_URL}/unauthorized`);
    return null;
  } catch (_e) {
    return NextResponse.redirect(`${AUTH_URL}/auth/signin`);
  }
}

export default {
  requireMember,
  requireVolunteer,
};
