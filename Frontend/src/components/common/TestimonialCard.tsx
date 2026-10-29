import { Star, Quote } from 'lucide-react';
import type { Testimonial } from '@/types';

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <Quote className="absolute right-4 top-4 h-8 w-8 text-green-100" />

      <div className="mb-4 flex items-center gap-3">
        <img
          src={testimonial.avatar}
          alt={testimonial.name}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {testimonial.name}
          </h4>
          <div className="mt-1 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < testimonial.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-gray-600">
        "{testimonial.content}"
      </p>
    </div>
  );
}
