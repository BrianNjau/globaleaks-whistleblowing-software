import { Component, OnInit, HostListener, inject } from "@angular/core";
import { HomeChartsComponent } from "./home-charts.component";
import { AppDataService } from "@app/app-data.service";
import { preferenceResolverModel } from "@app/models/resolvers/preference-resolver-model";
import { PreferenceResolver } from "@app/shared/resolvers/preference.resolver";
import { UtilsService } from "@app/shared/services/utils.service";
import { UserHomeComponent } from "@app/shared/partials/user-home/user-home.component";
import { RTipsResolver } from "@app/shared/resolvers/r-tips-resolver.service";
import { rtipResolverModel } from "@app/models/resolvers/rtips-resolver-model";
import { FormsModule } from "@angular/forms"; // Import FormsModule
import { NgClass } from "@angular/common"; // Import NgClass
import {
  IDropdownSettings,
  NgMultiSelectDropDownModule,
} from "ng-multiselect-dropdown"; // Import NgMultiSelectDropDownModule
import { SlicePipe, DatePipe } from "@angular/common"; // Import SlicePipe and DatePipe
import { TranslatorPipe } from "@app/shared/pipes/translate";
import { OrderByPipe } from "@app/shared/pipes/order-by.pipe"; // Import OrderByPipe
import {
  NgbDate,
  // NgbModal,
  NgbPagination,
  NgbPaginationPrevious,
  NgbPaginationNext,
  NgbPaginationFirst,
  NgbPaginationLast,
  NgbTooltipModule,
} from "@ng-bootstrap/ng-bootstrap";
import { DateRangeSelectorComponent } from "@app/shared/components/date-selector/date-selector.component"; // Import DateRangeSelectorComponent
import { TranslateService } from "@ngx-translate/core";
import { filter, orderBy } from "lodash-es";
import { YearlyReportIDPipe } from "@app/shared/pipes/yearly-report-id.pipe";
// import { YearlyReportIDPipe } from "@app/shared/pipes/yearly-report-id.pipe";

@Component({
  selector: "src-recipient-home",
  templateUrl: "./home.component.html",
  standalone: true,
  imports: [
    UserHomeComponent,
    FormsModule,
    NgClass,
    NgMultiSelectDropDownModule,
    NgbPagination,
    NgbPaginationPrevious,
    NgbPaginationNext,
    NgbPaginationFirst,
    NgbPaginationLast,
    NgbTooltipModule,
    SlicePipe,
    DatePipe,
    TranslatorPipe,
    OrderByPipe,
    DateRangeSelectorComponent,
    YearlyReportIDPipe,
    HomeChartsComponent,
  ],
})
export class HomeComponent implements OnInit {
  protected appDataService = inject(AppDataService);
  private utilsService = inject(UtilsService);
  private preference = inject(PreferenceResolver);
  protected RTips = inject(RTipsResolver);
  protected utils = inject(UtilsService);
  private translateService = inject(TranslateService);

  preferenceData: preferenceResolverModel;
  selectedTips: string[] = [];
  filteredTips: rtipResolverModel[];
  currentPage: number = 1;
  itemsPerPage: number = 20;
  reportDateFilter: [number, number] | null = null;
  updateDateFilter: [number, number] | null = null;
  expiryDateFilter: [number, number] | null = null;
  reportDateModel: { fromDate: NgbDate | null; toDate: NgbDate | null } | null =
    null;
  updateDateModel: { fromDate: NgbDate | null; toDate: NgbDate | null } | null =
    null;
  expiryDateModel: { fromDate: NgbDate | null; toDate: NgbDate | null } | null =
    null;
  dropdownStatusModel: { id: number; label: string }[] = [];
  dropdownStatusData: { id: number; label: string }[] = [];
  dropdownContextModel: { id: number; label: string }[] = [];
  dropdownContextData: { id: number; label: string }[] = [];
  dropdownLabel1Model: { id: number; label: string }[] = [];
  dropdownLabel1Data: { id: number; label: string }[] = [];
  dropdownLabel2Model: { id: number; label: string }[] = [];
  dropdownLabel2Data: { id: number; label: string }[] = [];
  dropdownLabel3Model: { id: number; label: string }[] = [];
  dropdownLabel3Data: { id: number; label: string }[] = [];
  dropdownLabel4Model: { id: number; label: string }[] = [];
  dropdownLabel4Data: { id: number; label: string }[] = [];
  dropdownLabel5Model: { id: number; label: string }[] = [];
  dropdownLabel5Data: { id: number; label: string }[] = [];
  dropdownLabel6Model: { id: number; label: string }[] = [];
  dropdownLabel6Data: { id: number; label: string }[] = [];
  dropdownLabel7Model: { id: number; label: string }[] = [];
  dropdownLabel7Data: { id: number; label: string }[] = [];
  dropdownLabel8Model: { id: number; label: string }[] = [];
  dropdownLabel8Data: { id: number; label: string }[] = [];
  dropdownScoreModel: { id: number; label: string }[] = [];
  dropdownScoreData: { id: number; label: string }[] = [];
  sortKey: string = "creation_date";
  sortReverse: boolean = true;
  channelDropdownVisible: boolean = false;
  label1DropdownVisible: boolean = false;
  label2DropdownVisible: boolean = false;
  label3DropdownVisible: boolean = false;
  label4DropdownVisible: boolean = false;
  label5DropdownVisible: boolean = false;
  label6DropdownVisible: boolean = false;
  label7DropdownVisible: boolean = false;
  label8DropdownVisible: boolean = false;
  statusDropdownVisible: boolean = false;
  scoreDropdownVisible: boolean = false;
  index: number;
  date: { year: number; month: number };
  reportDatePicker: boolean = false;
  lastUpdatePicker: boolean = false;
  expirationDatePicker: boolean = false;
  dropdownSettings: IDropdownSettings = {
    idField: "id",
    textField: "label",
    itemsShowLimit: 5,
    allowSearchFilter: true,
    selectAllText: this.translateService.instant("Select all"),
    unSelectAllText: this.translateService.instant("Deselect all"),
    searchPlaceholderText: this.translateService.instant("Search"),
  };

  ngOnInit(): void {
    if (this.preference.dataModel) {
      this.preferenceData = this.preference.dataModel;
    }
    if (this.RTips.dataModel) {
      this.filteredTips = this.RTips.dataModel;
      this.processTips();
      this.initDropdownData();

      // Pre-select all channels except Conflict of Interest
      const conflictContext = this.appDataService.public.contexts.find(
        (context) => context.name.toLowerCase().includes("conflict of interest")
      );

      if (conflictContext) {
        this.dropdownContextModel = this.dropdownContextData.filter(
          (item) => !item.label.toLowerCase().includes("conflict of interest")
        );

        if (this.dropdownContextModel.length > 0) {
          this.applyFilter();
        }
      }
    }
    if (
      this.appDataService.public.node.user_privacy_policy_text &&
      this.preferenceData.accepted_privacy_policy === "1970-01-01T00:00:00Z"
    ) {
      this.utilsService.acceptPrivacyPolicyDialog().subscribe();
    }
  }
  selectAll() {
    this.selectedTips = [];
    this.filteredTips.forEach((tip) => {
      if (tip.accessible) {
        this.selectedTips.push(tip.id);
      }
    });
  }
  deselectAll() {
    this.selectedTips = [];
  }
  reload() {
    this.RTips.reload();
  }
  tipSwitch(id: string): void {
    this.index = this.selectedTips.indexOf(id);
    if (this.index > -1) {
      this.selectedTips.splice(this.index, 1);
    } else {
      this.selectedTips.push(id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedTips.indexOf(id) !== -1;
  }
  processTips() {
    for (const tip of this.RTips.dataModel) {
      tip.context = this.appDataService.contexts_by_id[tip.context_id];
      tip.context_name = tip.context.name;
      tip.submissionStatusStr = this.utils.getSubmissionStatusText(
        tip.status,
        tip.substatus,
        this.appDataService.submissionStatuses
      );
    }
  }

  private initDropdownData() {
    const seen = new Set<string>();
    let statusId = 1, contextId = 1, l1Id = 1, l2Id = 1, l3Id = 1,
        l4Id = 1, l5Id = 1, l6Id = 1, l7Id = 1, l8Id = 1, scoreId = 1;

    const addIfNew = (key: string, push: () => void) => {
      if (!seen.has(key)) { seen.add(key); push(); }
    };

    for (const tip of this.RTips.dataModel) {
      addIfNew("status:" + tip.submissionStatusStr, () =>
        this.dropdownStatusData.push({ id: statusId++, label: tip.submissionStatusStr }));
      addIfNew("ctx:" + tip.context_name, () =>
        this.dropdownContextData.push({ id: contextId++, label: tip.context_name }));
      addIfNew("l1:" + tip.label1, () =>
        this.dropdownLabel1Data.push({ id: l1Id++, label: tip.label1 }));
      addIfNew("l2:" + tip.label2, () =>
        this.dropdownLabel2Data.push({ id: l2Id++, label: tip.label2 }));
      addIfNew("l3:" + tip.label3, () =>
        this.dropdownLabel3Data.push({ id: l3Id++, label: tip.label3 }));
      addIfNew("l4:" + tip.label4, () =>
        this.dropdownLabel4Data.push({ id: l4Id++, label: tip.label4 }));
      addIfNew("l5:" + tip.label5, () =>
        this.dropdownLabel5Data.push({ id: l5Id++, label: tip.label5 }));
      addIfNew("l6:" + tip.label6, () =>
        this.dropdownLabel6Data.push({ id: l6Id++, label: tip.label6 }));
      addIfNew("l7:" + tip.label7, () =>
        this.dropdownLabel7Data.push({ id: l7Id++, label: tip.label7 }));
      addIfNew("l8:" + tip.label8, () =>
        this.dropdownLabel8Data.push({ id: l8Id++, label: tip.label8 }));
      const scoreLabel = this.maskScore(tip.score);
      addIfNew("score:" + scoreLabel, () =>
        this.dropdownScoreData.push({ id: scoreId++, label: scoreLabel }));
    }
  }
  maskScore(score: number) {
    if (score === 1) {
      return this.translateService.instant("Low");
    } else if (score === 2) {
      return this.translateService.instant("Medium");
    } else if (score === 3) {
      return this.translateService.instant("High");
    } else {
      return this.translateService.instant("None");
    }
  }
  onChanged() {
    this.applyFilter();
  }

  checkFilter(filter: { id: number; label: string }[]) {
    return filter.length > 0;
  }

  toggleChannelDropdown() {
    this.channelDropdownVisible = !this.channelDropdownVisible;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel1Dropdown() {
    this.label1DropdownVisible = !this.label1DropdownVisible;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel2Dropdown() {
    this.label2DropdownVisible = !this.label2DropdownVisible;
    this.label1DropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel3Dropdown() {
    this.label3DropdownVisible = !this.label3DropdownVisible;
    this.label2DropdownVisible = false;
    this.label1DropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel4Dropdown() {
    this.label4DropdownVisible = !this.label4DropdownVisible;
    this.label3DropdownVisible = false;
    this.label2DropdownVisible = false;
    this.label1DropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel5Dropdown() {
    this.label5DropdownVisible = !this.label5DropdownVisible;
    this.label4DropdownVisible = false;
    this.label3DropdownVisible = false;
    this.label2DropdownVisible = false;
    this.label1DropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel6Dropdown() {
    this.label6DropdownVisible = !this.label6DropdownVisible;
    this.label5DropdownVisible = false;
    this.label4DropdownVisible = false;
    this.label3DropdownVisible = false;
    this.label2DropdownVisible = false;
    this.label1DropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel7Dropdown() {
    this.label7DropdownVisible = !this.label7DropdownVisible;
    this.label6DropdownVisible = false;
    this.label5DropdownVisible = false;
    this.label4DropdownVisible = false;
    this.label3DropdownVisible = false;
    this.label2DropdownVisible = false;
    this.label1DropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }
  toggleLabel8Dropdown() {
    this.label8DropdownVisible = !this.label8DropdownVisible;
    this.label7DropdownVisible = false;
    this.label6DropdownVisible = false;
    this.label5DropdownVisible = false;
    this.label4DropdownVisible = false;
    this.label3DropdownVisible = false;
    this.label2DropdownVisible = false;
    this.label1DropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.scoreDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
  }

  onSearchChange(search: string | number | undefined) {
    search = String(search);

    if (typeof search !== "undefined") {
      this.currentPage = 1;
      this.filteredTips = this.RTips.dataModel;

      this.filteredTips = orderBy(
        filter(this.filteredTips, (tip) => {
          return this.utils.searchInObject(tip, search);
        }),
        "update_date"
      );
    }
  }

  orderbyCast(data: rtipResolverModel[]): rtipResolverModel[] {
    return data;
  }

  onReportFilterChange(event: {
    fromDate: string | null;
    toDate: string | null;
  }) {
    const { fromDate, toDate } = event;
    if (!fromDate && !toDate) {
      this.reportDateFilter = null;
      this.closeAllDatePickers();
    }
    if (fromDate && toDate) {
      this.reportDateFilter = [
        new Date(fromDate).getTime(),
        new Date(toDate).getTime(),
      ];
    }
    this.applyFilter();
  }

  onUpdateFilterChange(event: {
    fromDate: string | null;
    toDate: string | null;
  }) {
    const { fromDate, toDate } = event;
    if (!fromDate && !toDate) {
      this.updateDateFilter = null;
      this.closeAllDatePickers();
    }
    if (fromDate && toDate) {
      this.updateDateFilter = [
        new Date(fromDate).getTime(),
        new Date(toDate).getTime(),
      ];
    }
    this.applyFilter();
  }

  onExpiryFilterChange(event: {
    fromDate: string | null;
    toDate: string | null;
  }) {
    const { fromDate, toDate } = event;
    if (!fromDate && !toDate) {
      this.expiryDateFilter = null;
      this.closeAllDatePickers();
    }
    if (fromDate && toDate) {
      this.expiryDateFilter = [
        new Date(fromDate).getTime(),
        new Date(toDate).getTime(),
      ];
    }
    this.applyFilter();
  }

  applyFilter() {
    this.filteredTips = this.utils.getStaticFilter(
      this.RTips.dataModel,
      this.dropdownStatusModel,
      "submissionStatusStr",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownContextModel,
      "context_name",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownScoreModel,
      "score",
      this.translateService
    );
    this.filteredTips = this.utils.getDateFilter(
      this.filteredTips,
      this.reportDateFilter,
      this.updateDateFilter,
      this.expiryDateFilter
    );
    // Apply label filters
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel1Model,
      "label1",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel2Model,
      "label2",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel3Model,
      "label3",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel4Model,
      "label4",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel5Model,
      "label5",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel6Model,
      "label6",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel7Model,
      "label7",
      this.translateService
    );
    this.filteredTips = this.utils.getStaticFilter(
      this.filteredTips,
      this.dropdownLabel8Model,
      "label8",
      this.translateService
    );
  }

  @HostListener("document:click", ["$event"])
  onClick(event: MouseEvent) {
    const clickedElement = event.target as HTMLElement;
    const isContainerClicked =
      clickedElement.classList.contains("ngb-datepicker-container") ||
      clickedElement.classList.contains("dropdown-multi-select-container") ||
      clickedElement.closest(".ngb-datepicker-container") !== null ||
      clickedElement.closest(".dropdown-multi-select-container") !== null;
    if (!isContainerClicked) {
      this.closeAllDatePickers();
    }
  }

  closeAllDatePickers() {
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
    this.scoreDropdownVisible = false;
    this.channelDropdownVisible = false;
    this.statusDropdownVisible = false;
    this.reportDatePicker = false;
    this.lastUpdatePicker = false;
    this.expirationDatePicker = false;
    this.label1DropdownVisible = false;
    this.label2DropdownVisible = false;
    this.label3DropdownVisible = false;
    this.label4DropdownVisible = false;
    this.label5DropdownVisible = false;
    this.label6DropdownVisible = false;
    this.label7DropdownVisible = false;
    this.label8DropdownVisible = false;
  }
}
