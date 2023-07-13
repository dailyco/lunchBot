import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CreateAttendanceFunctionDefinition } from "../functions/create_attendance/definition.ts";
import { PostSummaryFunctionDefinition } from "../functions/post_summary/definition.ts";
import { AD_RANDOM_CHANNEL_ID } from "../constants.ts";

const CreateRandomLunchWorkflow = DefineWorkflow({
  callback_id: "create_random_lunch",
  title: "광고실 랜덤런치 관리",
  description:
    "랜덤런치 참여여부를 조사하고, 참여자를 모아 적절하게 조를 나눠요.",
  input_parameters: {
    properties: {
      created_by: {
        type: Schema.slack.types.user_id,
      },
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
    },
    required: ["created_by", "interactivity"],
  },
});

// 1단계: 랜덤런치 참여여부 조사 메세지를 전송하기위한 폼 열기
const formStep = CreateRandomLunchWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "랜덤런치 참여조사 메세지 전송",
    description: `<#${AD_RANDOM_CHANNEL_ID}> 채널에 랜덤런치 참여여부를 조사하는 메세지를 전송해요.`,
    interactivity: CreateRandomLunchWorkflow.inputs.interactivity,
    submit_label: "Send",
    fields: {
      elements: [
        {
          name: "date",
          title: "랜덤런치 날짜",
          type: Schema.slack.types.date,
          description: "랜덤런치의 날짜를 선택해주세요.",
        },
      ],
      required: ["date"],
    },
  }
);

// 2단계: 랜덤런치 참석여부 조사 메세지 전송
const attendanceStep = CreateRandomLunchWorkflow.addStep(
  CreateAttendanceFunctionDefinition,
  {
    create_by: CreateRandomLunchWorkflow.inputs.created_by,
    date: formStep.outputs.fields.date,
  }
);

// // 3단계: 생성된 조 스레드로 메세지 전송
CreateRandomLunchWorkflow.addStep(PostSummaryFunctionDefinition, {
  teams: attendanceStep.outputs.teams,
  message_ts: attendanceStep.outputs.message_ts,
});

export default CreateRandomLunchWorkflow;
