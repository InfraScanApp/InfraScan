// Define the percentage by which to slash the stake of submitters who submitted incorrect values
// 0.7 = 70%
import { Submitter, DistributionList } from "@_koii/task-manager";

const SLASH_PERCENT = 0.7;
// 💰 Maximum reward per valid submitter (3 SONO = 3 * 10^9)
const MAX_REWARD_PER_NODE = 3 * 1_000_000_000;

export async function distribution(
  submitters: Submitter[],
  bounty: number,
  roundNumber: number,
): Promise<DistributionList> {
  /**
   * Generate the reward list for a given round
   * This function should return an object with the public keys of the submitters as keys
   * and the reward amount as values
   */
  console.log(`MAKE DISTRIBUTION LIST FOR ROUND ${roundNumber}`);
  const distributionList: DistributionList = {};
  const approvedSubmitters: string[] = [];

  console.log("Maximum BOUNTY", bounty);

  // ⛔ Handle submitters
  for (const submitter of submitters) {
    if (submitter.votes === 0) {
      // No reward for neutral votes
      distributionList[submitter.publicKey] = 0;
    } else if (submitter.votes < 0) {
      // Slash the stake for invalid submission
      const slashedStake = Math.floor(submitter.stake * SLASH_PERCENT);
      distributionList[submitter.publicKey] = -slashedStake;
      console.log("CANDIDATE STAKE SLASHED", submitter.publicKey, slashedStake);
    } else {
      // Valid submission
      approvedSubmitters.push(submitter.publicKey);
    }
  }

  if (approvedSubmitters.length === 0) {
    console.log("NO NODES TO REWARD");
    return distributionList;
  }

  // 💰 Calculate reward per approved submitter
  let perNodeReward = Math.floor(bounty / approvedSubmitters.length);

  // 🧯 Cap the reward to the maximum allowed
  if (perNodeReward > MAX_REWARD_PER_NODE) {
    perNodeReward = MAX_REWARD_PER_NODE;
    console.log(`PER NODE REWARD CAPPED TO MAX: ${perNodeReward}`);
  } else {
    console.log(`REWARD PER NODE (dynamic): ${perNodeReward} for ${approvedSubmitters.length} nodes`);
  }

  // 💸 Assign reward to each valid submitter
  approvedSubmitters.forEach((candidate) => {
    distributionList[candidate] = perNodeReward;
  });

  return distributionList;
}
