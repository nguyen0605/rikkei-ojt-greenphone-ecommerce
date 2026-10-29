/**
 * Returns an optimized image URL by appending Pexels resize/compress params.
 * For non-Pexels URLs (Cloudinary, SVG, etc.) the URL is returned as-is.
 *
 * @param url  - raw image URL
 * @param opts - { width, height } (defaults to 400x400 square)
 */
export function getOptimizedImageUrl(
  url: string,
  opts?: { width?: number; height?: number },
): string {
  if (!url) return '';

  const w = opts?.width ?? 400;
  const h = opts?.height ?? w;

  // Pexels: append auto=compress + resize + crop params
  if (url.includes('pexels.com')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}auto=compress&w=${w}&h=${h}&fit=crop`;
  }

  return url;
}
