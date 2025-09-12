import { Data } from "@app/models/receiver/receiver-tip-data";

export interface rtipResolverModel {
  submissionStatusStr: string;
  context_name: string;
  context?: any;
  id: string;
  itip_id: string;
  creation_date: string;
  access_date: string;
  last_access: string;
  update_date: string;
  expiration_date: string;
  reminder_date: string;
  progressive: number;
  subscription: number;
  important: boolean;
  label: string;
  // Add label properties
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
  updated: boolean;
  context_id: string;
  tor: boolean;
  questionnaire: any;
  answers: Answers;
  score: number;
  status: string;
  substatus: string;
  file_count: number;
  receiver_count: number;
  comment_count: number;
  accessible: boolean;
  data: Data;
}

export interface Answers {
  [key: string]: {
    required_status: boolean;
    value: string;
  }[];
}
