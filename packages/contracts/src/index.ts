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
