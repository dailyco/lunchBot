import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";
import { TeamsType } from "./types.ts";
import { AD_RANDOM_CHANNEL_ID } from "../../constants.ts";

export const PostSummaryFunctionDefinition = DefineFunction({
  callback_id: "post_summary",
  title: "생성된 랜덤런치 조 메세지 전송",
  description: `참여한 사람들로 구성된 랜덤런치 조를 <#${AD_RANDOM_CHANNEL_ID}> 채널에 전송해요.`,
  source_file: "functions/post_summary/handler.ts",
  input_parameters: {
    properties: {
      teams: {
        type: Schema.types.array,
        items: {
          type: TeamsType,
        },
        description: "랜덤런치에 참여하는 사람들을 모아 랜덤으로 생성된 조",
      },
      message_ts: {
        type: Schema.types.string,
        description: "채널에 전송된 메세지의 타입 스탬프",
      },
    },
    required: ["teams", "message_ts"],
  },
  output_parameters: {
    properties: {
      message_ts: {
        type: Schema.types.string,
      },
    },
    required: ["message_ts"],
  },
});
