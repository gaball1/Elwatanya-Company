// lib/signatures.ts
// Standalone in-memory signature registry for printed documents (BOQ estimates).
// Extracted from the legacy lib/boqStore.ts so client code no longer depends on it.

export interface DocSignature {
  id: string;
  name: string;
  title: string;
  date: string;
}

const signatures = new Map<string, DocSignature[]>();

export function getDocSignatures(docKey: string): DocSignature[] {
  return [...(signatures.get(docKey) || [])];
}

export function setDocSignatures(docKey: string, sigs: DocSignature[]): void {
  signatures.set(docKey, sigs);
}
