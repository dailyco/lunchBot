import { SlackFunction } from "deno-slack-sdk/mod.ts";

import { CreateAttendanceFunctionDefinition } from "./definition.ts";
import { buildAttendanceBlocks } from "./blocks.ts";
import {
  updateAttendanceStatus,
  openOverflowView,
  createRandomLunchTeam,
  editDefaultAttendanceStatus,
} from "./interactivity_handler.ts";
import { ChatPostMessageParams, DraftStatus } from "./types.ts";
import { AD_RANDOM_CHANNEL_ID, RANDOM_LUNCH } from "../../constants.ts";

/**
 * CreateAttendanceFunction 핸들링
 * 1. 랜덤런치 참여여부 조사 메세지를 생성하고 #ad-random 채널에 전송
 * 2. 유저의 참여여부를 데이터스토어에 저장하고 수정 가능
 * 3. 유저의 기본 참여여부를 데이터에 저장하고 수정할 수 있도록 뷰를 열어줌
 * 4. 유저 인터렉션이 끝날 때까지 함수는 정지 (랜덤런치 조를 생성할 때까지)
 */
export default SlackFunction(
  CreateAttendanceFunctionDefinition,
  async ({ inputs, client }) => {
    // 랜덤런치 참여여부 조사 메세지를 생성하고 #ad-random 채널에 전송
    const id = crypto.randomUUID();
    const blocks = buildAttendanceBlocks(id, inputs.date);

    const params: ChatPostMessageParams = {
      channel: AD_RANDOM_CHANNEL_ID, // #ad-random 채널
      blocks,
      icon_emoji: ":daangni-sandwich:", // @TODO: 추후에 삭제
      username: RANDOM_LUNCH,
      text: "이번주 광고실 랜덤런치에 참여하세요.",
    };

    const response = await client.chat.postMessage(params);
    if (!response.ok) {
      const postMessageError = `#ad-random 채널에 메세지를 보내는 과정에서 에러가 발생했어요 - (상세 에러: ${response.error})`;
      console.log(postMessageError);
      return { error: postMessageError };
    }

    // 해당 스텝은 랜덤런치 조를 생성할 때까지 끝난 것이 아니기 때문에 completed: false를 반환
    return { completed: false };
  }
)
  .addBlockActionsHandler("attend_button", updateAttendanceStatus)
  .addBlockActionsHandler("skip_button", updateAttendanceStatus)
  .addBlockActionsHandler("setting_overflow", openOverflowView)
  .addBlockActionsHandler("create_team_button", createRandomLunchTeam)
  .addViewSubmissionHandler("edit_status_modal", editDefaultAttendanceStatus);
