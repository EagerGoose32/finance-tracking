import { CONCEPT_TAG_CANDIDATES } from "../scoring/xbrlConceptMap";

/**
 * We only persist XBRL facts for tags our scoring/diffing code actually
 * understands, rather than the full XBRL universe (hundreds of tags per
 * filing) — keeps storage lean for the MVP.
 */
export const RELEVANT_TAGS = new Set(Object.values(CONCEPT_TAG_CANDIDATES).flat());
