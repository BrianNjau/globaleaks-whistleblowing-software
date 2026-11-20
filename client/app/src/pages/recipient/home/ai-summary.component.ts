import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { TranslatorPipe } from "@app/shared/pipes/translate";

interface AiSummaryMetrics {
  avg_days_to_close: number | null;
  avg_days_open: number | null;
  oldest_open_days: number | null;
}

interface AiSummaryResponse {
  metrics: AiSummaryMetrics | null;
  bullets: string[];
  cases: number;
  generated_at: string | null;
  error: string | null;
}

const GENERIC_ERROR = "The summary could not be generated. Please try again later.";

const ERROR_MESSAGES: Record<string, string> = {
  no_cases: "There are no reports assigned to you to summarize.",
  not_configured: "The AI summary is not configured on this server.",
  anonymized_network: "The AI summary is unavailable while outgoing connections are routed through Tor.",
};

// Always shown first, in this order; a metric without data is left out
const METRIC_LABELS: [keyof AiSummaryMetrics, string][] = [
  ["avg_days_to_close", "Average time to close a case"],
  ["avg_days_open", "Average time open cases have been open"],
  ["oldest_open_days", "Oldest open case"],
];

@Component({
  selector: "src-recipient-ai-summary",
  templateUrl: "./ai-summary.component.html",
  standalone: true,
  imports: [DatePipe, TranslatorPipe],
})
export class AiSummaryComponent {
  private http = inject(HttpClient);

  loading = false;
  metrics: { label: string; days: number }[] = [];
  bullets: string[] = [];
  cases = 0;
  generatedAt: string | null = null;
  errorMessage = "";

  get hasContent(): boolean {
    return this.metrics.length > 0 || this.bullets.length > 0;
  }

  generate(): void {
    this.loading = true;
    this.errorMessage = "";

    this.http.get<AiSummaryResponse>("api/recipient/ai-summary").subscribe({
      next: (res) => {
        this.loading = false;
        const metrics = res.metrics;
        this.metrics = metrics
          ? METRIC_LABELS.filter(([key]) => metrics[key] !== null).map(([key, label]) => ({ label, days: metrics[key] as number }))
          : [];
        this.bullets = res.bullets;
        this.cases = res.cases;
        this.generatedAt = res.generated_at;
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
