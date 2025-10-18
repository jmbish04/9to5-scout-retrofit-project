/**
 * Email route handlers - Centralized email processing endpoints
 *
 * Note: Most email processing is now handled by EmailProcessorAgent.
 * Only management and test endpoints remain.
 */

export {
  handleEmailConfigsGet,
  handleEmailConfigsPut,
  handleEmailInsightsSend,
  handleEmailLogsGet,
} from "./management";
