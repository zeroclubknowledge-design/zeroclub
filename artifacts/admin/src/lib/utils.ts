import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(priceCents: number): string {
  if (priceCents === 0) return "Free";
  return `₦${(priceCents / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export const TRACKS = [
  { value: "product_design", label: "Product Design" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "full_stack", label: "Full Stack" },
  { value: "growth", label: "Growth" },
  { value: "branding", label: "Branding" },
  { value: "mentorship", label: "Mentorship" },
  { value: "vibe_coding", label: "Vibe Coding" },
  { value: "video_editing", label: "Video Editing" },
  { value: "motion_design", label: "Motion Design" },
];

export const DIFFICULTIES = [
  { value: "beginner", label: "Beginner", color: "#10B981" },
  { value: "intermediate", label: "Intermediate", color: "#F59E0B" },
  { value: "advanced", label: "Advanced", color: "#EF4444" },
];

export const DELIVERY_MEDIUMS = [
  { value: "video", label: "Video" },
  { value: "live", label: "Live" },
  { value: "text", label: "Text" },
  { value: "hybrid", label: "Hybrid" },
];
