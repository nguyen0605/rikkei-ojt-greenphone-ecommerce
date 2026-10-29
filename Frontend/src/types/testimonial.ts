/**
 * Testimonial & Trust feature types
 */

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  content: string;
  date: string;
}

export interface TrustFeature {
  id: string;
  icon: string; // lucide icon name
  title: string;
  description: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  image: string;
  description: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}
