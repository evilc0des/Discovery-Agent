import { redirect } from 'next/navigation';
import { SessionStore } from '@/lib/session/store';

export const dynamic = 'force-dynamic';

export default async function SessionPage() {
  const store = new SessionStore();
  const session = await store.createSession();
  redirect(`/session/${session.sessionId}`);
}
