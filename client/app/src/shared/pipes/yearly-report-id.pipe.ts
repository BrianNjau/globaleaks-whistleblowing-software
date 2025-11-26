import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "yearlyReportID",
  standalone: true,
  pure: false,
})
export class YearlyReportIDPipe implements PipeTransform {
  transform(
    progressive: number,
    creationDate: string | Date,
    allTips?: any[],
    contextId?: string,
    contexts?: any[]
  ): string {
    if (!progressive || !creationDate) {
      return String(progressive || "");
    }

    const tipDate = new Date(creationDate);
    const tipYear = tipDate.getFullYear();
    const yearSuffix = String(tipYear).slice(-2); // Get last 2 digits for COI format

    // Check if this is a Conflict of Interest report
    let isConflictOfInterest = false;
    if (contextId && contexts) {
      const context = contexts.find((ctx) => ctx.id === contextId);
      if (
        context &&
        context.name.toLowerCase().includes("conflict of interest")
      ) {
        isConflictOfInterest = true;
      }
    }

    // For Conflict of Interest reports, use special COI format
    if (isConflictOfInterest && allTips) {
      const coiTipsInYear = allTips
        .filter((tip) => {
          const tipContext = contexts?.find((ctx) => ctx.id === tip.context_id);
          return (
            tipContext &&
            tipContext.name.toLowerCase().includes("conflict of interest") &&
            new Date(tip.creation_date).getFullYear() === tipYear
          );
        })
        .sort((a, b) => a.progressive - b.progressive);

      const coiSequence =
        coiTipsInYear.findIndex((tip) => tip.progressive === progressive) + 1;

      if (coiSequence > 0) {
        return `${coiSequence}COI${yearSuffix}`;
      }
      // Fallback for COI
      return `${progressive}COI${yearSuffix}`;
    }

    // Regular format for non-COI reports
    const BASE_YEAR = 2025;

    // For 2025, the progressive ID is already the correct yearly sequence
    if (tipYear === BASE_YEAR) {
      return `${progressive}Y${tipYear}`;
    }

    // For years after 2025, we need to calculate the yearly sequence
    if (tipYear > BASE_YEAR && allTips && allTips.length > 0) {
      // Get all tips from the same year
      const tipsInSameYear = allTips
        .filter((tip) => new Date(tip.creation_date).getFullYear() === tipYear)
        .sort((a, b) => {
          // Sort by progressive ID to maintain consistent ordering
          return a.progressive - b.progressive;
        });

      // Find the position of this tip in the year's sequence
      const yearSequence =
        tipsInSameYear.findIndex((tip) => tip.progressive === progressive) + 1;

      if (yearSequence > 0) {
        return `${yearSequence}Y${tipYear}`;
      }
    }

    // Fallback: If we don't have allTips or for any other case
    // For 2026+, this might show incorrect sequence numbers without allTips
    if (tipYear > BASE_YEAR) {
      // We can't calculate the correct sequence without all tips
      // But we can at least show the year
      return `${progressive}Y${tipYear}`;
    }

    // For any reports before 2025 (shouldn't exist based on your description)
    return `${progressive}Y${tipYear}`;
  }

  /**
   * Reverse transformation: Convert display format back to backend progressive ID
   * Useful for search functionality
   */
  reverseTransform(formattedId: string, allTips: any[]): number | null {
    // Check if it's the new format (e.g., "5Y2025")
    const match = formattedId.match(/^(\d+)Y(\d{4})$/);
    if (!match) {
      // Might be just a plain number (old format)
      const id = parseInt(formattedId);
      return isNaN(id) ? null : id;
    }

    const [, sequence, year] = match;
    const yearNum = parseInt(year);
    const seqNum = parseInt(sequence);
    const BASE_YEAR = 2025;

    // For 2025, the sequence number IS the progressive ID
    if (yearNum === BASE_YEAR) {
      return seqNum;
    }

    // For years after 2025, we need to find the actual progressive ID
    if (yearNum > BASE_YEAR && allTips) {
      const tipsInYear = allTips
        .filter((tip) => new Date(tip.creation_date).getFullYear() === yearNum)
        .sort((a, b) => a.progressive - b.progressive);

      // Return the backend progressive ID of the tip at the specified sequence position
      if (tipsInYear[seqNum - 1]) {
        return tipsInYear[seqNum - 1].progressive;
      }
    }

    return null;
  }
}
