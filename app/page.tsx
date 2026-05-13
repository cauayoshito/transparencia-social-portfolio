import { redirect } from 'next/navigation';

export default function Home() {
  // Always redirect root to the login page
  redirect('/login');
}