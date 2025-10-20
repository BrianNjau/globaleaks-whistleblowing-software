import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'yearlyReportID',
  standalone: true,
  pure: false // Set to false to recalculate when data changes
})
export class YearlyReportIDPipe implements PipeTransform {
  
  transform(progressive: number, creationDate: string | Date, allTips?: any[]): string {
    if (!progressive || !creationDate) {
      return String(progressive || '');
    }
    
    const date = new Date(creationDate);
    const year = date.getFullYear();
    
    // If we have access to all tips, calculate the year-specific sequence
    if (allTips && allTips.length > 0) {
      // Get all tips from the same year, sorted by progressive ID
      const tipsInSameYear = allTips
        .filter(tip => new Date(tip.creation_date).getFullYear() === year)
        .sort((a, b) => a.progressive - b.progressive);
      
      // Find the position of this tip in the year's sequence
      const yearSequence = tipsInSameYear.findIndex(tip => tip.progressive === progressive) + 1;
      
      // Return formatted ID if we found the tip, otherwise fallback
      if (yearSequence > 0) {
        return `${yearSequence}Y${year}`;
      }
    }
    
    // Fallback: just use the progressive number directly
    // This might be used when we don't have access to all tips
    return `${progressive}Y${year}`;
  }
  
  /**
   * Reverse transformation: Convert display format back to backend ID
   * Useful for search functionality
   * @param formattedId - The formatted ID like "5Y2025"
   * @param allTips - All tips data to find the correct backend ID
   */
  reverseTransform(formattedId: string, allTips: any[]): number | null {
    const match = formattedId.match(/^(\d+)Y(\d{4})$/);
    if (!match) {
      return null;
    }
    
    const [, sequence, year] = match;
    const yearNum = parseInt(year);
    const seqNum = parseInt(sequence);
    
    // Get all tips from the specified year, sorted by progressive ID
    const tipsInYear = allTips
      .filter(tip => new Date(tip.creation_date).getFullYear() === yearNum)
      .sort((a, b) => a.progressive - b.progressive);
    
    // Return the backend ID of the tip at the specified sequence position
    if (tipsInYear[seqNum - 1]) {
      return tipsInYear[seqNum - 1].progressive;
    }
    
    return null;
  }
}