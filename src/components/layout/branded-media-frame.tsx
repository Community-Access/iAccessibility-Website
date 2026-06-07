import { SITE_FALLBACK_IMAGE_URL } from "@/lib/branding";
import { cn } from "@/lib/utils";

type BrandedMediaFrameProps = {
  src?: string | null;
  alt?: string | null;
  decorative?: boolean;
  className?: string;
  imageClassName?: string;
  fallbackLabel?: string;
};

export function BrandedMediaFrame({
  src,
  alt,
  decorative,
  className,
  imageClassName,
  fallbackLabel = "iAccessibility"
}: BrandedMediaFrameProps) {
  const frameClass = cn(
    "relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#eaf2fb] via-white to-[#cfe1f4]",
    className
  );

  if (src) {
    return (
      <div className={frameClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ""}
          aria-hidden={decorative ? "true" : undefined}
          className={cn("h-full w-full object-contain p-3", imageClassName)}
        />
      </div>
    );
  }

  return (
    <div className={frameClass} aria-hidden="true">
      <span className="absolute -bottom-10 -right-4 select-none text-[8rem] font-black leading-none text-[#0066bf]/10 md:text-[10rem]">
        iA
      </span>
      <div className="relative z-10 flex flex-col items-center gap-3 px-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SITE_FALLBACK_IMAGE_URL}
          alt=""
          className="h-24 w-24 rounded-2xl object-contain drop-shadow-sm md:h-28 md:w-28"
        />
        <span className="text-xl font-bold tracking-normal text-[#035a9e]">
          {fallbackLabel}
        </span>
      </div>
    </div>
  );
}
