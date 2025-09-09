import { redirect } from 'next/navigation';

export default function CallAgentPage() {
  redirect('/call-agent/queue');
}
