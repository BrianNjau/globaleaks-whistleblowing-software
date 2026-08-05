import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { NgStyle, NgClass } from "@angular/common";
import { rtipResolverModel } from "@app/models/resolvers/rtips-resolver-model";

const DONUT_R = 32;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

const STATUS_COLORS: Record<string, string> = {
  opened: "#1a7f5a",
  new: "#2a5fc4",
  closed: "#8a95a3",
};

const GENDER_COLORS: Record<string, string> = {
  Male: "#2a5fc4",
  Female: "#c0293a",
  Other: "#b45309",
  "": "#9ca3af",
};

const SGBV_COLORS: Record<string, string> = {
  Yes: "#c0293a",
  No: "#1a7f5a",
  Unknown: "#9ca3af",
  "": "#9ca3af",
};

const BAR_COLOR = "#2a5fc4";
const PALETTE = [
  "#2a5fc4", "#1a7f5a", "#c0293a", "#b45309", "#7c3aed", "#0891b2",
  "#059669", "#dc2626", "#d97706", "#6d28d9",
];

interface BarEntry {
  label: string;
  count: number;
  pct: number;
  muted: boolean;
}

interface DonutSlice {
  label: string;
  count: number;
  color: string;
  dasharray: string;
  dashoffset: number;
}

@Component({
  selector: "src-recipient-home-charts",
  templateUrl: "./home-charts.component.html",
  standalone: true,
  imports: [NgStyle, NgClass],
})
export class HomeChartsComponent implements OnChanges {
  @Input() tips: rtipResolverModel[] = [];

  chartsVisible = true;
  hasData = false;

  statTotal = 0;
  statOpen = 0;
  statNew = 0;

  intakeMethodBars: BarEntry[] = [];
  siteBars: BarEntry[] = [];
  caseCategoryBars: BarEntry[] = [];
  subCategoryBars: BarEntry[] = [];
  investigatorBars: BarEntry[] = [];

  statusSlices: DonutSlice[] = [];
  genderSlices: DonutSlice[] = [];
  sgbvSlices: DonutSlice[] = [];
  ageSlices: DonutSlice[] = [];

  donutR = DONUT_R;
  donutCirc = DONUT_CIRC;
  barColor = BAR_COLOR;

  ngOnChanges(_changes: SimpleChanges) {
    this.compute();
  }

  toggleCharts() {
    this.chartsVisible = !this.chartsVisible;
  }

  private countByField(
    tips: rtipResolverModel[],
    field: keyof rtipResolverModel,
    top = 6
  ): BarEntry[] {
    const counts = new Map<string, number>();
    for (const tip of tips) {
      const val = String(tip[field] ?? "");
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const shown = sorted.slice(0, top);
    const otherCount = sorted.slice(top).reduce((s, e) => s + e[1], 0);
    if (otherCount > 0) shown.push(["Other", otherCount]);
    const max = shown[0]?.[1] ?? 1;
    return shown.map(([label, count]) => ({
      label: label || "(unset)",
      count,
      pct: Math.round((count / max) * 100),
      muted: label === "",
    }));
  }

  private buildSlices(
    tips: rtipResolverModel[],
    field: keyof rtipResolverModel,
    colorMap: Record<string, string>
  ): DonutSlice[] {
    const counts = new Map<string, number>();
    for (const tip of tips) {
      const val = String(tip[field] ?? "");
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    const total = tips.length || 1;
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const slices: DonutSlice[] = [];
    let offset = 0;
    entries.forEach(([label, count], i) => {
      const arc = (count / total) * DONUT_CIRC;
      const color =
        colorMap[label] ?? PALETTE[i % PALETTE.length];
      slices.push({
        label: label || "(unset)",
        count,
        color,
        dasharray: `${arc} ${DONUT_CIRC - arc}`,
        dashoffset: DONUT_CIRC - offset,
      });
      offset += arc;
    });
    return slices;
  }

  private compute() {
    const tips = this.tips ?? [];
    this.hasData = tips.length > 0;

    this.statTotal = tips.length;
    this.statOpen = tips.filter((t) => t.status !== "closed").length;
    this.statNew = tips.filter((t) => t.status === "new").length;

    this.intakeMethodBars = this.countByField(tips, "label1");
    this.siteBars = this.countByField(tips, "label2");
    this.caseCategoryBars = this.countByField(tips, "label3");
    this.subCategoryBars = this.countByField(tips, "label4");
    this.investigatorBars = this.countByField(tips, "label6");

    this.statusSlices = this.buildSlices(tips, "status", STATUS_COLORS);
    this.genderSlices = this.buildSlices(tips, "label5", GENDER_COLORS);
    this.sgbvSlices = this.buildSlices(tips, "label7", SGBV_COLORS);
    this.ageSlices = this.buildSlices(tips, "label8", {});
  }
}
