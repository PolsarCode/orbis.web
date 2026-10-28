import { appIcon } from "@/lib/app-icon";

const variants: Record<string, Parameters<typeof appIcon>[0]> = {
  "192": { size: 192, rounded: true },
  "512": { size: 512, rounded: true },
  maskable: { size: 512, glyphScale: 0.8 },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(variants).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  return appIcon(variants[(await params).variant]);
}
