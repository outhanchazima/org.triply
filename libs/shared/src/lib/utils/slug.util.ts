/**
 * Convert a free-form string into a URL-safe slug.
 *
 * Strips non-word characters, collapses whitespace into single hyphens,
 * and removes leading / trailing hyphens.
 *
 * @param text - The input string to slugify.
 * @returns A lowercase, hyphen-delimited slug.
 *
 * @example
 * ```ts
 * slugify('Nairobi to Lilongwe!');  // "nairobi-to-lilongwe"
 * slugify('  Hello   World  ');     // "hello-world"
 * ```
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
