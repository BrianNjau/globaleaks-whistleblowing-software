import {Component, OnInit,HostListener, inject} from "@angular/core";
import {AppDataService} from "@app/app-data.service";
import {preferenceResolverModel} from "@app/models/resolvers/preference-resolver-model";
import {PreferenceResolver} from "@app/shared/resolvers/preference.resolver";
import {UtilsService} from "@app/shared/services/utils.service";
import {UserHomeComponent} from "@app/shared/partials/user-home/user-home.component";
import { RTipsResolver } from "@app/shared/resolvers/r-tips-resolver.service";
import { rtipResolverModel } from "@app/models/resolvers/rtips-resolver-model";
import { FormsModule } from "@angular/forms"; // Import FormsModule
import { NgClass } from "@angular/common"; // Import NgClass
import { IDropdownSettings,NgMultiSelectDropDownModule } from "ng-multiselect-dropdown"; // Import NgMultiSelectDropDownModule 
import { SlicePipe, DatePipe } from "@angular/common"; // Import SlicePipe and DatePipe
import {TranslatorPipe} from "@app/shared/pipes/translate";
import { OrderByPipe } from "@app/shared/pipes/order-by.pipe"; // Import OrderByPipe
import {NgbDate, NgbModal, NgbPagination, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationFirst, NgbPaginationLast, NgbTooltipModule} from "@ng-bootstrap/ng-bootstrap";
import { DateRangeSelectorComponent } from "@app/shared/components/date-selector/date-selector.component"; // Import DateRangeSelectorComponent
import {TranslateService} from "@ngx-translate/core";
import {filter, orderBy} from "lodash-es";

@Component({
    selector: "src-recipient-home",
    templateUrl: "./home.component.html",
    standalone: true,
    imports: [UserHomeComponent,
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
    DateRangeSelectorComponent
    ]
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
  reportDateModel: { fromDate: NgbDate | null; toDate: NgbDate | null; } | null = null;
  updateDateModel: { fromDate: NgbDate | null; toDate: NgbDate | null; } | null = null;
  expiryDateModel: { fromDate: NgbDate | null; toDate: NgbDate | null; } | null = null;
  dropdownStatusModel: { id: number; label: string; }[] = [];
  dropdownStatusData: { id: number; label: string; }[] = [];
  dropdownContextModel: { id: number; label: string; }[] = [];
  dropdownContextData: { id: number; label: string; }[] = [];
  dropdownLabel1Model: { id: number; label: string; }[] = [];
  dropdownLabel1Data: { id: number; label: string; }[] = [];
  dropdownLabel2Model: { id: number; label: string; }[] = [];
  dropdownLabel2Data: { id: number; label: string; }[] = [];
  dropdownLabel3Model: { id: number; label: string; }[] = [];
  dropdownLabel3Data: { id: number; label: string; }[] = [];
  dropdownLabel4Model: { id: number; label: string; }[] = [];
  dropdownLabel4Data: { id: number; label: string; }[] = [];
  dropdownLabel5Model: { id: number; label: string; }[] = [];
  dropdownLabel5Data: { id: number; label: string; }[] = [];
  dropdownLabel6Model: { id: number; label: string; }[] = [];
  dropdownLabel6Data: { id: number; label: string; }[] = [];
  dropdownScoreModel: { id: number; label: string; }[] = [];
  dropdownScoreData: { id: number; label: string; }[] = [];
  sortKey: string = "creation_date";
  sortReverse: boolean = true;
  channelDropdownVisible: boolean = false;
  label1DropdownVisible: boolean = false;
  label2DropdownVisible: boolean = false;
  label3DropdownVisible: boolean = false;
  label4DropdownVisible: boolean = false;
  label5DropdownVisible: boolean = false;
  label6DropdownVisible: boolean = false;
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
    searchPlaceholderText: this.translateService.instant("Search")
  };

 ngOnInit(): void {
    if (this.preference.dataModel) {
      this.preferenceData = this.preference.dataModel;
    }
    if (this.RTips.dataModel) {
      this.filteredTips = this.RTips.dataModel;
      console.log("RTips.dataModel:", this.RTips.dataModel);
      this.processTips();
    }
    if (this.appDataService.public.node.user_privacy_policy_text && this.preferenceData.accepted_privacy_policy === "1970-01-01T00:00:00Z") {
     this.utilsService.acceptPrivacyPolicyDialog().subscribe();
    }
  }
  selectAll() {
    this.selectedTips = [];
    this.filteredTips.forEach(tip => {
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
    const uniqueKeys: string[] = [];

    for (const tip of this.RTips.dataModel) {
      tip.context = this.appDataService.contexts_by_id[tip.context_id];
      tip.context_name = tip.context.name;
      tip.submissionStatusStr = this.utils.getSubmissionStatusText(tip.status, tip.substatus, this.appDataService.submissionStatuses);
      if (!uniqueKeys.includes(tip.submissionStatusStr)) {
        uniqueKeys.push(tip.submissionStatusStr);
        this.dropdownStatusData.push({id: this.dropdownStatusData.length + 1, label: tip.submissionStatusStr});
      }
      if (!uniqueKeys.includes(tip.context_name)) {
        uniqueKeys.push(tip.context_name);
        this.dropdownContextData.push({id: this.dropdownContextData.length + 1, label: tip.context_name});
      }
      if (!uniqueKeys.includes(tip.label1)) {
        uniqueKeys.push(tip.label1);
        this.dropdownLabel1Data.push({id: this.dropdownLabel1Data.length + 1, label: tip.label1});
      }
      if (!uniqueKeys.includes(tip.label2)) {
        uniqueKeys.push(tip.label2);
        this.dropdownLabel2Data.push({id: this.dropdownLabel2Data.length + 1, label: tip.label2});
      }
      if (!uniqueKeys.includes(tip.label3)) {
        uniqueKeys.push(tip.label3);
        this.dropdownLabel3Data.push({id: this.dropdownLabel3Data.length + 1, label: tip.label3});
      }
      if (!uniqueKeys.includes(tip.label4)) {
        uniqueKeys.push(tip.label4);
        this.dropdownLabel4Data.push({id: this.dropdownLabel4Data.length + 1, label: tip.label4});
      }
      if (!uniqueKeys.includes(tip.label5)) {
        uniqueKeys.push(tip.label5);
        this.dropdownLabel5Data.push({id: this.dropdownLabel5Data.length + 1, label: tip.label5});
      }
      if (!uniqueKeys.includes(tip.label6)) {
        uniqueKeys.push(tip.label6);
        this.dropdownLabel6Data.push({id: this.dropdownLabel6Data.length + 1, label: tip.label6});
      }

      const scoreLabel = this.maskScore(tip.score);

      if (!uniqueKeys.includes(scoreLabel)) {
        uniqueKeys.push(scoreLabel);
        this.dropdownScoreData.push({id: this.dropdownScoreData.length + 1, label: scoreLabel});
      }
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
  //review this
  onChanged(model: { id: number; label: string; }[], type: string) {
    this.processTips();
    if (model.length > 0 && type === "Score") {
      this.dropdownLabel1Model = [];
      this.dropdownContextModel = [];
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = model;
    }
    if (model.length > 0 && type === "Status") {
      this.dropdownLabel1Model = [];
      this.dropdownContextModel = [];
      this.dropdownScoreModel = [];
      this.dropdownStatusModel = model;
    }
    if (model.length > 0 && type === "Context") {
      this.dropdownLabel1Model = [];
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = [];
      this.dropdownContextModel = model;
      this.dropdownLabel1Model = [];
      this.dropdownLabel2Model = [];
      this.dropdownLabel3Model = [];
      this.dropdownLabel4Model = [];
      this.dropdownLabel5Model = [];
      this.dropdownLabel6Model = [];
    }
    if (model.length > 0 && type === "Label1") {
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = [];
      this.dropdownContextModel = [];
      this.dropdownLabel1Model = model;
      this.dropdownLabel2Model = [];
      this.dropdownLabel3Model = [];
      this.dropdownLabel4Model = [];
      this.dropdownLabel5Model = [];
      this.dropdownLabel6Model = [];
    }
    if (model.length > 0 && type === "Label2") {
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = [];
      this.dropdownContextModel = [];
      this.dropdownLabel1Model = [];
      this.dropdownLabel2Model = model;
      this.dropdownLabel3Model = [];
      this.dropdownLabel4Model = [];
      this.dropdownLabel5Model = [];
      this.dropdownLabel6Model = [];
    }
    if (model.length > 0 && type === "Label3") {
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = [];
      this.dropdownContextModel = [];
      this.dropdownLabel1Model = [];
      this.dropdownLabel2Model = [];
      this.dropdownLabel3Model = model;
      this.dropdownLabel4Model = [];
      this.dropdownLabel5Model = [];
      this.dropdownLabel6Model = [];
    }
    if (model.length > 0 && type === "Label4") {
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = [];
      this.dropdownContextModel = [];
      this.dropdownLabel1Model = [];
      this.dropdownLabel2Model = [];
      this.dropdownLabel3Model = [];
      this.dropdownLabel4Model = model;
      this.dropdownLabel5Model = [];
      this.dropdownLabel6Model = [];
    }
    if (model.length > 0 && type === "Label5") {
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = [];
      this.dropdownContextModel = [];
      this.dropdownLabel1Model = [];
      this.dropdownLabel2Model = [];
      this.dropdownLabel3Model = [];
      this.dropdownLabel4Model = [];
      this.dropdownLabel5Model = model;
      this.dropdownLabel6Model = [];
    }
    if (model.length > 0 && type === "Label6") {
      this.dropdownStatusModel = [];
      this.dropdownScoreModel = [];
      this.dropdownContextModel = [];
      this.dropdownLabel1Model = [];
      this.dropdownLabel2Model = [];
      this.dropdownLabel3Model = [];
      this.dropdownLabel4Model = [];
      this.dropdownLabel5Model = [];
      this.dropdownLabel6Model = model;
    }
    this.applyFilter();
  }
  //

  checkFilter(filter: { id: number; label: string; }[]) {
    return filter.length > 0;
  };

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

    onSearchChange(search: string | number | undefined) {
      search = String(search);
  
      if (typeof search !== "undefined") {
        this.currentPage = 1;
        this.filteredTips = this.RTips.dataModel;
        this.processTips();
  
        this.filteredTips = orderBy(filter(this.filteredTips, (tip) => {
          return this.utils.searchInObject(tip, search);
        }), "update_date");
      }
    }
  
    orderbyCast(data: rtipResolverModel[]): rtipResolverModel[] {
      return data;
    }


    onReportFilterChange(event: { fromDate: string | null; toDate: string | null }) {
      this.processTips();
      const {fromDate, toDate} = event;
      if (!fromDate && !toDate) {
        this.reportDateFilter = null;
        this.closeAllDatePickers();
      }
      if (fromDate && toDate) {
        this.reportDateFilter = [new Date(fromDate).getTime(), new Date(toDate).getTime()];
      }
      this.applyFilter();
    }

    onUpdateFilterChange(event: { fromDate: string | null; toDate: string | null }) {
      this.processTips();
      const {fromDate, toDate} = event;
      if (!fromDate && !toDate) {
        this.updateDateFilter = null;
        this.closeAllDatePickers();
      }
      if (fromDate && toDate) {
        this.updateDateFilter = [new Date(fromDate).getTime(), new Date(toDate).getTime()];
      }
      this.applyFilter();
    }

    onExpiryFilterChange(event: { fromDate: string | null; toDate: string | null }) {
      this.processTips();
      const {fromDate, toDate} = event;
      if (!fromDate && !toDate) {
        this.expiryDateFilter = null;
        this.closeAllDatePickers();
      }
      if (fromDate && toDate) {
        this.expiryDateFilter = [new Date(fromDate).getTime(), new Date(toDate).getTime()];
      }
      this.applyFilter();
    }

    applyFilter() {
      this.filteredTips = this.utils.getStaticFilter(this.RTips.dataModel, this.dropdownStatusModel, "submissionStatusStr", this.translateService);
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownContextModel, "context_name", this.translateService);
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownScoreModel, "score", this.translateService);
      this.filteredTips = this.utils.getDateFilter(this.filteredTips, this.reportDateFilter, this.updateDateFilter, this.expiryDateFilter);
      // Apply label filters
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownLabel1Model, "label1", this.translateService);
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownLabel2Model, "label2", this.translateService);
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownLabel3Model, "label3", this.translateService);
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownLabel4Model, "label4", this.translateService);
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownLabel5Model, "label5", this.translateService);
      this.filteredTips = this.utils.getStaticFilter(this.filteredTips, this.dropdownLabel6Model, "label6", this.translateService);
    }

      @HostListener("document:click", ["$event"])
      onClick(event: MouseEvent) {
        const clickedElement = event.target as HTMLElement;
        const isContainerClicked = clickedElement.classList.contains("ngb-datepicker-container") || clickedElement.classList.contains("dropdown-multi-select-container") ||
          clickedElement.closest(".ngb-datepicker-container") !== null || clickedElement.closest(".dropdown-multi-select-container") !== null;
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
      }

}
