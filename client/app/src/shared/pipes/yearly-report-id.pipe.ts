import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "yearlyReportID",
  standalone: true,
  pure: true,
})
export class YearlyReportIDPipe implements PipeTransform {
  transform(
    yearlySequence: number,
    creationDate: string | Date,
    contextId?: string,
    contexts?: any[]
  ): string {
    if (!creationDate) {
      return String(yearlySequence || "");
    }

    const tipDate = new Date(creationDate);
    const tipYear = tipDate.getFullYear();

    // Check if this is a Conflict of Interest report
    if (contextId && contexts) {
      const context = contexts.find((ctx) => ctx.id === contextId);
      if (
        context &&
        context.name.toLowerCase().includes("conflict of interest")
      ) {
        const yearSuffix = String(tipYear).slice(-2);
        return `${yearlySequence}COI${yearSuffix}`;
      }
    }

    return `${yearlySequence}Y${tipYear}`;
  }
}
