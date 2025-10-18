/**
 * Document Services Index
 *
 * Barrel file for exporting all document services
 */

export {
  DocumentStorageService,
  createDocumentStorageService,
} from "./document-storage.service";

export {
  DocumentSearchService,
  createDocumentSearchService,
} from "./document-search.service";

export {
  DocumentGenerationService,
  createDocumentGenerationService,
} from "./document-generation.service";

export {
  DocumentProcessingService,
  createDocumentProcessingService,
  type ApplyPatchResult,
} from "./document-processing.service";
