import * as diff from 'diff';

/**
 * Applies a unified diff string to an original text string.
 * @param originalText The source text (e.g., file content).
 * @param patchText The unified diff patch string.
 * @returns The patched text, or throws an error if the patch fails.
 */
export function applyPatchLocally(originalText: string, patchText: string): string {
  const patched = diff.applyPatch(originalText, patchText);
  if (patched === false) {
    throw new Error('Failed to apply diff cleanly. The original content may have changed.');
  }
  return patched;
}

/**
 * Generates a unified diff string comparing original to modified text.
 */
export function createPatch(fileName: string, originalText: string, modifiedText: string): string {
  return diff.createPatch(fileName, originalText, modifiedText);
}
