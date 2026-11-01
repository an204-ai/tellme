'use client';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { faqs, faqSchema } from '@/lib/content';
export function FAQ() {
  // Local content is immediately available offline; Query owns the reusable content cache.
  const { data = faqs } = useQuery({ queryKey: ['landing-faq'], queryFn: async () => faqSchema.parse(faqs), initialData: faqs });
  return <section className="faq-section section-shell"><h2>Bạn hỏi,<br />Tellme kể.</h2><div>{data.map((item) => <details key={item.question}><summary>{item.question}<Plus size={21} /></summary><p>{item.answer}</p></details>)}</div></section>;
}
