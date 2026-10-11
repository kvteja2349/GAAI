/**
 * GAAI Server-Side Line Counter and Normalizer
 * Standardizes line counting across streamed and completed responses.
 * 1 credit authorizes up to 500 lines of output.
 */

export interface LineCountResult {
  totalLines: number;
  normalizedText: string;
}

export interface LineChunkExtraction {
  chunkText: string;
  linesCount: number;
  hasMore: boolean;
  remainingText: string;
}

export class LineCounter {
  public static readonly MAX_LINES_PER_CREDIT = 500;

  /**
   * Normalizes newlines to \n and cleans excessive trailing empty spaces while preserving formatting
   */
  public static normalize(text: string): string {
    if (!text) return '';
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Counts the number of lines according to server standard
   */
  public static countLines(text: string): number {
    const normalized = this.normalize(text);
    if (normalized.length === 0) return 0;
    const lines = normalized.split('\n');
    return lines.length;
  }

  /**
   * Slices text up to maxLines, returning the allowed slice and any overflow
   */
  public static extractUpTo(text: string, maxLines: number = LineCounter.MAX_LINES_PER_CREDIT): LineChunkExtraction {
    const normalized = this.normalize(text);
    if (normalized.length === 0) {
      return { chunkText: '', linesCount: 0, hasMore: false, remainingText: '' };
    }

    const lines = normalized.split('\n');
    if (lines.length <= maxLines) {
      return {
        chunkText: normalized,
        linesCount: lines.length,
        hasMore: false,
        remainingText: ''
      };
    }

    const allowedLines = lines.slice(0, maxLines);
    const overflowLines = lines.slice(maxLines);

    return {
      chunkText: allowedLines.join('\n'),
      linesCount: allowedLines.length,
      hasMore: true,
      remainingText: overflowLines.join('\n')
    };
  }
}
