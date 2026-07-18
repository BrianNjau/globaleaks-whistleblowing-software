import {Component, Input, OnChanges} from "@angular/core";
import {NgClass, NgStyle} from "@angular/common";
import {rtipResolverModel} from "@app/models/resolvers/rtips-resolver-model";

export interface ChartSlice {
  label: string;
  count: number;
  pct: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

export interface ChartBar {
  label: string;
  count: number;
  pct: number;
  muted: boolean;
}

const DONUT_R = 32;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

const STATUS_COLORS: Record<string, string> = {
  opened: "#1a7f5a",
  new:    "#2a5fc4",
  closed: "#8a95a3",
};

const PRIORITY_ORDER = ["High", "Medium", "Low", "None", ""];
const PRIORITY_COLORS: Record<string, string> = {
  High:   "#c0293a",
  Medium: "#b45309",
  Low:    "#2a5fc4",
  None:   "#9ca3af",
  "":     "#9ca3af",
};

const BAR_COLOR = "#2a5fc4";

@Component({
  selector: "src-recipient-home-charts",
  templateUrl: "./home-charts.component.html",
  standalone: true,
  imports: [NgClass, NgStyle],
})
export class HomeChartsComponent implements OnChanges {
  @Input() tips: rtipResolverModel[] = [];

  chartsVisible = true;

  statTotal = 0;
  statOpen = 0;
  statHighPriority = 0;

  issueTypeBars: ChartBar[] = [];
  siteBars: ChartBar[] = [];
  outcomeBars: ChartBar[] = [];
  investigatorBars: ChartBar[] = [];
  substantiatedBars: ChartBar[] = [];

  statusSlices: ChartSlice[] = [];
  prioritySlices: ChartSlice[] = [];

  hasData = false;

  ngOnChanges(): void {
    this.compute();
  }

  toggleCharts(): void {
    this.chartsVisible = !this.chartsVisible;
  }

  private compute(): void {
    const tips = this.tips ?? [];
    this.hasData = tips.length > 0;

    this.statTotal = tips.length;
    this.statOpen = tips.filter(t => t.status !== "closed").length;
    this.statHighPriority = tips.filter(t => t.label3 === "High").length;

    this.issueTypeBars    = this.countByField(tips, "label2");
    this.siteBars         = this.countByField(tips, "label1");
    this.outcomeBars      = this.countByField(tips, "label5");
    this.investigatorBars = this.countByField(tips, "label6");
    this.substantiatedBars = this.countByField(tips, "label4");

    this.statusSlices   = this.buildStatusSlices(tips);
    this.prioritySlices = this.buildPrioritySlices(tips);
  }

  private countByField(tips: rtipResolverModel[], field: keyof rtipResolverModel, top = 6): ChartBar[] {
    const counts: Record<string, number> = {};
    for (const tip of tips) {
      const raw = (tip[field] as string) ?? "";
      const key = raw.trim() === "" ? "(unset)" : raw.trim();
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const sorted = Object.entries(counts).sort((a, b) => {
      if (a[0] === "(unset)") return 1;
      if (b[0] === "(unset)") return -1;
      return b[1] - a[1];
    });

    const total = tips.length || 1;
    const topEntries = sorted.slice(0, top);
    const rest = sorted.slice(top);

    const bars: ChartBar[] = topEntries.map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
      muted: label === "(unset)",
    }));

    if (rest.length > 0) {
      const otherCount = rest.reduce((s, [, c]) => s + c, 0);
      bars.push({ label: "Other", count: otherCount, pct: Math.round((otherCount / total) * 100), muted: false });
    }

    return bars;
  }

  private buildStatusSlices(tips: rtipResolverModel[]): ChartSlice[] {
    const order = ["opened", "new", "closed"];
    const counts: Record<string, number> = { opened: 0, new: 0, closed: 0 };
    for (const tip of tips) {
      const s = tip.status ?? "new";
      if (s in counts) counts[s]++;
      else counts["new"]++;
    }

    return this.buildSlices(
      order.map(k => [k === "opened" ? "Opened" : k === "new" ? "New" : "Closed", counts[k]] as [string, number]),
      order.map(k => STATUS_COLORS[k]),
    );
  }

  private buildPrioritySlices(tips: rtipResolverModel[]): ChartSlice[] {
    const counts: Record<string, number> = {};
    for (const tip of tips) {
      const k = (tip.label3 ?? "").trim() || "";
      const key = PRIORITY_ORDER.includes(k) ? k : "None";
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const entries: [string, number][] = PRIORITY_ORDER.filter(k => k !== "")
      .map(k => [k, counts[k] ?? 0]);

    const displayLabels = ["High", "Medium", "Low", "None"];
    return this.buildSlices(
      entries.filter(([, c]) => c > 0).map(([k, c]) => [displayLabels[PRIORITY_ORDER.indexOf(k)] ?? k, c] as [string, number]),
      entries.filter(([, c]) => c > 0).map(([k]) => PRIORITY_COLORS[k] ?? "#9ca3af"),
    );
  }

  private buildSlices(entries: [string, number][], colors: string[]): ChartSlice[] {
    const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
    const slices: ChartSlice[] = [];
    let offsetAngle = 0;

    for (let i = 0; i < entries.length; i++) {
      const [label, count] = entries[i];
      const pct = count / total;
      const arc = pct * DONUT_CIRC;
      const gap = DONUT_CIRC - arc;
      const dashOffset = DONUT_CIRC * 0.25 - offsetAngle;

      slices.push({
        label,
        count,
        pct: Math.round(pct * 100),
        color: colors[i] ?? "#9ca3af",
        dashArray: `${arc.toFixed(2)} ${gap.toFixed(2)}`,
        dashOffset,
      });

      offsetAngle += arc;
    }
    return slices;
  }

  get barColor(): string { return BAR_COLOR; }
}
