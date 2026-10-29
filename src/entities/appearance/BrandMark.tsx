import { useAppearanceQuery } from "@entities/appearance/api";
import { BrandLogo } from "@shared/ui/BrandLogo";

export function BrandMark({ className }: { className?: string }) {
  const logoUrl = useAppearanceQuery().data?.logoUrl;
  if (logoUrl) return <img src={logoUrl} alt="" className={`object-contain ${className ?? ""}`} />;
  return <BrandLogo className={className} />;
}
