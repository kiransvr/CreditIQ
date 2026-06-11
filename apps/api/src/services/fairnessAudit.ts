export type FairnessDimension = "gender" | "location" | "age";

export interface FairnessApplicant {
  applicantId?: string;
  score: number;
  gender: string;
  location: string;
  age?: number;
  ageBand?: string;
  balanceProfile: string;
  depositBehaviorProfile: string;
}

export interface FairnessAuditInput {
  retrainingRunId: string;
  modelVersion: string;
  applicants: FairnessApplicant[];
}

interface NormalizedApplicant {
  score: number;
  gender: "male" | "female";
  location: "urban" | "rural";
  ageBand: "under_30" | "30_plus";
  profileKey: string;
}

interface GroupStats {
  count: number;
  meanScore: number;
}

export interface PairProfileResult {
  controlProfile: string;
  groupA: GroupStats;
  groupB: GroupStats;
  gapPercent: number;
}

export interface PairAuditResult {
  dimension: FairnessDimension;
  groupAName: string;
  groupBName: string;
  comparedProfiles: number;
  excludedProfiles: number;
  groupAOverallMeanScore: number;
  groupBOverallMeanScore: number;
  gapPercent: number;
  thresholdPercent: number;
  withinThreshold: boolean;
  profileResults: PairProfileResult[];
}

export interface FairnessAuditResult {
  retrainingRunId: string;
  modelVersion: string;
  executedAt: string;
  thresholdPercent: number;
  overallStatus: "pass" | "fail";
  reweightingRequired: boolean;
  pairAudits: PairAuditResult[];
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toGapPercent(meanA: number, meanB: number): number {
  const denominator = Math.max(Math.abs(meanA), Math.abs(meanB), 1);
  return (Math.abs(meanA - meanB) / denominator) * 100;
}

function normalizeGender(value: string): "male" | "female" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "male" || normalized === "m") {
    return "male";
  }
  return "female";
}

function normalizeLocation(value: string): "urban" | "rural" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "urban" || normalized === "city") {
    return "urban";
  }
  return "rural";
}

function normalizeAgeBand(age: number | undefined, ageBand: string | undefined): "under_30" | "30_plus" {
  if (typeof age === "number" && Number.isFinite(age)) {
    return age < 30 ? "under_30" : "30_plus";
  }

  const normalizedBand = (ageBand ?? "").trim().toLowerCase();
  if (normalizedBand.includes("under") || normalizedBand.includes("<30") || normalizedBand.includes("u30")) {
    return "under_30";
  }

  return "30_plus";
}

function normalizeApplicants(applicants: FairnessApplicant[]): NormalizedApplicant[] {
  return applicants.map((applicant) => ({
    score: applicant.score,
    gender: normalizeGender(applicant.gender),
    location: normalizeLocation(applicant.location),
    ageBand: normalizeAgeBand(applicant.age, applicant.ageBand),
    profileKey: `${applicant.balanceProfile.trim().toLowerCase()}|${applicant.depositBehaviorProfile.trim().toLowerCase()}`
  }));
}

function computePairAudit(
  applicants: NormalizedApplicant[],
  dimension: FairnessDimension,
  thresholdPercent: number
): PairAuditResult {
  const profileMap = new Map<string, { groupA: number[]; groupB: number[] }>();

  applicants.forEach((applicant) => {
    const current = profileMap.get(applicant.profileKey) ?? { groupA: [], groupB: [] };

    const groupKey = dimension === "gender"
      ? applicant.gender
      : dimension === "location"
        ? applicant.location
        : applicant.ageBand;

    if (groupKey === "male" || groupKey === "urban" || groupKey === "under_30") {
      current.groupA.push(applicant.score);
    } else {
      current.groupB.push(applicant.score);
    }

    profileMap.set(applicant.profileKey, current);
  });

  const profileResults: PairProfileResult[] = [];
  let excludedProfiles = 0;
  const allGroupAScores: number[] = [];
  const allGroupBScores: number[] = [];

  profileMap.forEach((groups, profileKey) => {
    if (groups.groupA.length === 0 || groups.groupB.length === 0) {
      excludedProfiles += 1;
      return;
    }

    const meanA = average(groups.groupA);
    const meanB = average(groups.groupB);
    const gapPercent = toGapPercent(meanA, meanB);

    allGroupAScores.push(...groups.groupA);
    allGroupBScores.push(...groups.groupB);

    profileResults.push({
      controlProfile: profileKey,
      groupA: {
        count: groups.groupA.length,
        meanScore: Math.round(meanA * 100) / 100
      },
      groupB: {
        count: groups.groupB.length,
        meanScore: Math.round(meanB * 100) / 100
      },
      gapPercent: Math.round(gapPercent * 100) / 100
    });
  });

  const overallMeanA = average(allGroupAScores);
  const overallMeanB = average(allGroupBScores);
  const overallGapPercent = toGapPercent(overallMeanA, overallMeanB);
  const withinThreshold = overallGapPercent <= thresholdPercent;

  const naming = dimension === "gender"
    ? { groupAName: "Male", groupBName: "Female" }
    : dimension === "location"
      ? { groupAName: "Urban", groupBName: "Rural" }
      : { groupAName: "Under 30", groupBName: "30+" };

  return {
    dimension,
    groupAName: naming.groupAName,
    groupBName: naming.groupBName,
    comparedProfiles: profileResults.length,
    excludedProfiles,
    groupAOverallMeanScore: Math.round(overallMeanA * 100) / 100,
    groupBOverallMeanScore: Math.round(overallMeanB * 100) / 100,
    gapPercent: Math.round(overallGapPercent * 100) / 100,
    thresholdPercent,
    withinThreshold,
    profileResults
  };
}

export function runFairnessAudit(input: FairnessAuditInput): FairnessAuditResult {
  const thresholdPercent = 8;
  const normalizedApplicants = normalizeApplicants(input.applicants);

  const pairAudits: PairAuditResult[] = [
    computePairAudit(normalizedApplicants, "gender", thresholdPercent),
    computePairAudit(normalizedApplicants, "location", thresholdPercent),
    computePairAudit(normalizedApplicants, "age", thresholdPercent)
  ];

  const reweightingRequired = pairAudits.some((pair) => !pair.withinThreshold);

  return {
    retrainingRunId: input.retrainingRunId,
    modelVersion: input.modelVersion,
    executedAt: new Date().toISOString(),
    thresholdPercent,
    overallStatus: reweightingRequired ? "fail" : "pass",
    reweightingRequired,
    pairAudits
  };
}
