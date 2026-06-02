interface Buffer extends Uint8Array {
  readonly length: number;
  toString(encoding?: string): string;
}

declare const Buffer: {
  from(input: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer;
  isBuffer(value: unknown): value is Buffer;
};

declare const process: {
  env: Record<string, string | undefined>;
};