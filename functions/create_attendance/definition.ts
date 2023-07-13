import { DefineFunction, DefineType, Schema } from "deno-slack-sdk/mod.ts";
import { AD_RANDOM_CHANNEL_ID } from "../../constants.ts";
import { TeamsType } from "../post_summary/types.ts";

export const CreateAttendanceFunctionDefinition = DefineFunction({
  callback_id: "create_attendance",
  title: "랜덤런치 참여여부 조사 메세지 생성",
  description: `랜덤런치 참여여부를 조사하는 메세지를 생성하고 <#${AD_RANDOM_CHANNEL_ID}> 채널에 전송해요.`,
  source_file: "functions/create_attendance/handler.ts",
  input_parameters: {
    properties: {
      create_by: {
        type: Schema.types.string,
        description: "랜덤런치 참여여부 조사 메세지를 생성한 사람의 ID",
      },
      date: {
        type: Schema.types.string,
        description: "랜덤런치 날짜",
      },
      icon: {
        type: Schema.types.string,
        description: "(optional) 메세지의 커스텀 아이콘",
      },
      username: {
        type: Schema.types.string,
        description: "(optional) 메세지의 커스텀 유저네임",
      },
    },
    required: ["create_by", "date"],
  },
  output_parameters: {
    properties: {
      message_ts: {
        type: Schema.types.string,
        description: "채널에 전송된 메세지의 타입 스탬프",
      },
      teams: {
        type: Schema.types.array,
        items: {
          type: TeamsType,
        },
        description: "랜덤런치에 참여하는 사람들을 모아 랜덤으로 생성된 조",
      },
    },
    required: ["message_ts", "teams"],
  },
});
