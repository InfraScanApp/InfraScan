import { initializeTaskManager } from "@_koii/task-manager";
import { setup } from "./task/0-setup";
import { task } from "./task/1-task";
import { submission } from "./task/2-submission";
import { audit } from "./task/3-audit";
import { distribution, generateAndSubmitDistributionList, distributionListAudit } from "./task/4-distribution";
import { routes } from "./task/5-routes";
import { getExpectedRewardPerNode, getExpectedRewardPerNodeInBaseUnits, getTaskRewardInfo } from "./task/reward";

// Export reward functions for desktop node interface
export { getExpectedRewardPerNode, getExpectedRewardPerNodeInBaseUnits, getTaskRewardInfo };

// Export distribution functions for Koii framework
export { generateAndSubmitDistributionList, distributionListAudit };

initializeTaskManager({
  setup,
  task,
  submission,
  audit,
  distribution,
  routes,
});
