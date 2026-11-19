import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DatePipe } from "@angular/common";
import { TranslatorPipe } from "@app/shared/pipes/translate";

interface AiSummaryResponse {
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

@Component({
  selector: "src-recipient-ai-summary",
  templateUrl: "./ai-summary.component.html",
  standalone: true,
  imports: [DatePipe, TranslatorPipe],
})
export class AiSummaryComponent {
  private http = inject(HttpClient);

  loading = false;
  bullets: string[] = [];
  cases = 0;
  generatedAt: string | null = null;
  errorMessage = "";

  generate(): void {
    this.loading = true;
    this.errorMessage = "";

    this.http.get<AiSummaryResponse>("api/recipient/ai-summary").subscribe({
      next: (res) => {
        this.loading = false;
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
