import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { TranslatorPipe } from "@app/shared/pipes/translate";

interface AiSummaryMetrics {
  avg_days_unopened: number | null;
  avg_days_open: number | null;
  oldest_open_days: number | null;
  avg_days_to_close: number | null;
  important: number;
  unread_updates: number;
  no_update_30_days: number;
}

interface AiSummaryResponse {
  metrics: AiSummaryMetrics | null;
  cases: number;
  error: string | null;
}

const GENERIC_ERROR = "The summary could not be generated. Please try again later.";

const ERROR_MESSAGES: Record<string, string> = {
  no_cases: "There are no reports assigned to you to summarize.",
};

// Shown in this order; a duration without data is left out
const METRICS: [keyof AiSummaryMetrics, string, boolean][] = [
  ["avg_days_unopened", "Average time new cases remain unopened", true],
  ["avg_days_open", "Average time open cases remain in open status", true],
  ["oldest_open_days", "Oldest open case", true],
  ["avg_days_to_close", "Average time to close cases", true],
  ["important", "Cases marked important", false],
  ["unread_updates", "Cases with unread updates", false],
  ["no_update_30_days", "Cases with no updates for more than 30 days", false],
];

@Component({
  selector: "src-recipient-ai-summary",
  templateUrl: "./ai-summary.component.html",
  standalone: true,
  imports: [TranslatorPipe],
})
export class AiSummaryComponent {
  private http = inject(HttpClient);

  loading = false;
  metrics: { label: string; value: number; isDays: boolean }[] = [];
  errorMessage = "";

  get hasContent(): boolean {
    return this.metrics.length > 0;
  }

  generate(): void {
    this.loading = true;
    this.errorMessage = "";

    this.http.get<AiSummaryResponse>("api/recipient/ai-summary").subscribe({
      next: (res) => {
        this.loading = false;
        const metrics = res.metrics;
        this.metrics = metrics
          ? METRICS.filter(([key]) => metrics[key] !== null)
                   .map(([key, label, isDays]) => ({ label, value: metrics[key] as number, isDays }))
          : [];
        if (res.error) {
          this.errorMessage = ERROR_MESSAGES[res.error] ?? GENERIC_ERROR;
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = GENERIC_ERROR;
      },
    });
  }
}
