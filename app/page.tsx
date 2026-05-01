import { redirect } from 'next/navigation';

export default function Home() {
  // Langsung arahkan (redirect) pengunjung utama ke sistem Login / Dashboard.
  redirect('/login');
}
