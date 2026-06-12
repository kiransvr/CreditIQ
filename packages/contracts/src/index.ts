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
  customerScores: Array<{
    row: number;
    customerId: string;
    customerName?: string;
    score: number;
    riskCategory: "low" | "medium" | "high" | "very_high";
    confidence: number;
    manualReviewRequired: boolean;
    decision: "proceed" | "lower_loan" | "manual_review" | "reject";
    suggestedAmount: number;
    reasons: string[];
  }>;
  explanation: {
    baseScore: number;
    components: Array<{
      key: string;
      label: string;
      impact: number;
      detail: string;
    }>;
    policyNotes: string[];
    marketAdjustment?: {
      source: "database" | "in_memory_default";
      effectiveFrom: string;
      effectiveTo: string | null;
      inflationPercent: number;
      devaluationPercent: number;
      factor: number;
      rawScore: number;
      adjustedScore: number;
    };
  };
}
