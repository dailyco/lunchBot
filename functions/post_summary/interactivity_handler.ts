import { BlockActionHandler } from "deno-slack-sdk/functions/interactivity/types.ts";

import { PostSummaryFunctionDefinition as PostSummaryFunction } from "./definition.ts";
import { buildTeamBlocks, buildThreadsBlocks } from "./blocks.ts";

import { AD_RANDOM_CHANNEL_ID, RANDOM_LUNCH } from "../../constants.ts";
import { ChatPostMessageParams } from "../create_attendance/types.ts";

export const sendTeamThreads: BlockActionHandler<
  typeof PostSummaryFunction.definition
> = async ({ inputs, body, client }) => {
  const blockses = buildThreadsBlocks(inputs.teams);

  const results = await Promise.all(
    blockses.map(async (blocks) => {
      const params: ChatPostMessageParams = {
        channel: AD_RANDOM_CHANNEL_ID, // #ad-random 채널
        blocks,
        username: RANDOM_LUNCH,
        text: "랜덤런치에서 먹을 메뉴를 정해주세요!",
      };
      const response = await client.chat.postMessage(params);
      if (!response.ok) {
        const postMessageError = ` 메세지를 보내는 과정에서 에러가 발생했어요 - (상세 에러: ${response.error})`;
        console.log(postMessageError);
        return { error: postMessageError };
      }
      return response;
    })
  );

  // 수정 메세지 생성 & 기존 메세지 업데이트
  const blocks = buildTeamBlocks(inputs.teams, true);
  const response = await client.chat.update({
    channel: AD_RANDOM_CHANNEL_ID, // #ad-random 채널
    blocks,
    ts: body.message?.ts,
    icon_emoji: ":daangni-sandwich:", // @TODO: 추후에 삭제
    username: RANDOM_LUNCH,
  });

  if (!response.ok) {
    const updateChatError = `기존 메세지를 수정하는 과정에서 오류가 발생했어요. [ts: ${body.message?.ts}, channel: ${AD_RANDOM_CHANNEL_ID}] - (상세: ${response.error})`;
    console.log(updateChatError);
  }

  // Build function outputs
  const outputs = {
    message_ts: response.ts,
  };

  // 현재 스텝 완료
  const complete = await client.functions.completeSuccess({
    function_execution_id: body.function_data.execution_id,
    outputs,
  });
  if (!complete.ok) {
    console.log("Error completing function", complete);

    await client.functions.completeError({
      function_execution_id: body.function_data.execution_id,
      error: "Error completing function",
    });
  }
};
