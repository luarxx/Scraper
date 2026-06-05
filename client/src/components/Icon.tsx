import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ icon: IconComp, size = 18, strokeWidth = 2, className, style }: IconProps) {
  return <IconComp size={size} strokeWidth={strokeWidth} className={className} style={style} />;
}
