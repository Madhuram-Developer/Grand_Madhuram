"use client";
// Client wrapper so next/image can take a loader function (functions can't cross the server→client boundary).
import Image, { type ImageLoader, type ImageProps } from "next/image";
import { cloudinaryUrl, isCloudinary, media } from "@/lib/media";

/** Cloudinary's CDN resizes/converts directly, skipping the extra hop through Next's image optimizer. */
const cloudinaryLoader: ImageLoader = ({ src, width, quality }) => cloudinaryUrl(src, width, quality);

/** All site images: stored path → full URL via media(); Cloudinary → CDN loader, local files → Next optimizer, others as-is. */
export function Img(props: ImageProps & { src: string }) {
  const src = media(props.src);
  if (isCloudinary(src)) return <Image {...props} src={src} alt={props.alt} loader={cloudinaryLoader} />;
  return <Image {...props} src={src} alt={props.alt} unoptimized={!src.startsWith("/") && !src.startsWith("https://picsum.photos/")} />;
}
