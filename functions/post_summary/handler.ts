import { SlackFunction } from "deno-slack-sdk/mod.ts";

import { buildTeamBlocks } from "./blocks.ts";
import { PostSummaryFunctionDefinition } from "./definition.ts";
import { AD_RANDOM_CHANNEL_ID, RANDOM_LUNCH } from "../../constants.ts";

import { sendTeamThreads } from "./interactivity_handler.ts";

/**
 * This is the handling code for PostSummaryFunction. It will:
 * 1. Post a message in thread to the draft announcement message
 * with a summary of announcement's sent
 * 2. Complete this function with either required outputs or an error
 */
export default SlackFunction(
  PostSummaryFunctionDefinition,
  async ({ inputs, client }) => {
    const blocks = buildTeamBlocks(inputs.teams);

    // 1. Post a message in thread to the draft announcement message
    const postResp = await client.chat.postMessage({
      channel: AD_RANDOM_CHANNEL_ID,
      thread_ts: inputs.message_ts || "",
      blocks,
      username: RANDOM_LUNCH,
      unfurl_links: false,
    });
    if (!postResp.ok) {
      const summaryTS = postResp ? postResp.ts : "n/a";
      const postSummaryErrorMsg = `Error posting announcement send summary: ${summaryTS} to channel: ${AD_RANDOM_CHANNEL_ID}. Contact the app maintainers with the following - (Error detail: ${postResp.error})`;
      console.log(postSummaryErrorMsg);
    }

    return { completed: false };
  }
).addBlockActionsHandler("send_teams_button", sendTeamThreads);
