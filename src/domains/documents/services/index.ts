/**
 * Document Services Index
 *
 * Barrel file for exporting all document services
 */

export {
  DocumentStorageService,
  type DocumentStorageEnv,
} from "./document-storage.service";

export { searchApplicantDocuments } from "./document-search.service";

export {
  DocumentGenerationService,
  type AiEnv,
} from "./document-generation.service";

export {
  DocumentProcessingService,
  type DocumentPatch,
  type ProcessingEnv,
} from "./document-processing.service";
