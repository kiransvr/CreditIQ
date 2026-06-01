export interface UploadAcceptedResponse {
  uploadId: string;
  status: "received";
  receivedAt: string;
  fileName: string;
  institutionId: string;
  templateVersion: string;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  traceId?: string;
}

export interface UploadRecommendation {
  decision: "proceed" | "lower_loan" | "manual_review" | "reject";
  suggestedAmount: number;
  score: number;
  riskCategory: "low" | "medium" | "high" | "very_high";
  reasons: string[];
  explanation: {
    baseScore: number;
    components: Array<{
      key: string;
      label: string;
      impact: number;
      detail: string;
    }>;
    policyNotes: string[];
  };
}
