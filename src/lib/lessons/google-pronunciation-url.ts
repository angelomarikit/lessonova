/** Google search link teachers can share for American English pronunciation help. */
export function googlePronunciationSearchUrl(wordOrPhrase: string): string {
  const query = `how to pronounce ${wordOrPhrase.trim()}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
