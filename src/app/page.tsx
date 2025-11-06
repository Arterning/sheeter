import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';

export default async function Home() {
  const session = await getCurrentUser();

  if (session?.user) {
    redirect('/sheets');
  } else {
    redirect('/auth');
  }
}
