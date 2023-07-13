import {
  BlockActionHandler,
  ViewSubmissionHandler,
} from "deno-slack-sdk/functions/interactivity/types.ts";

import { CreateAttendanceFunctionDefinition as CreateAttendanceFunction } from "./definition.ts";
import {
  buildAttendanceBlocks,
  buildDashboardBlocks,
  buildEditModal,
  buildTempDashboarText,
} from "./blocks.ts";

import AttendanceDatastore from "../../datastores/attendances.ts";
import DefaultAttendanceDatastore from "../../datastores/default_attendances.ts";
import {
  ADS_MEMBERS_USER_GROUP_ID,
  AD_RANDOM_CHANNEL_ID,
  CJ_USER_ID,
  RANDOM_LUNCH,
} from "../../constants.ts";
import { ChatPostMessageParams } from "./types.ts";
import { mrkdwnElement } from "../post_summary/blocks.ts";

export const updateAttendanceStatus: BlockActionHandler<
  typeof CreateAttendanceFunction.definition
> = async ({ inputs, body, action, client }) => {
  // 광고실 멤버가 맞는지 확인
  if (!(await isAuth(client, body.user.id))) {
    return;
  }

  // 랜덤런치 참여여부에 대한 데이터스토어 업데이트
  const putResp = await client.apps.datastore.update({
    datastore: AttendanceDatastore.name,
    item: {
      user_id: body.user.id,
      status: action.value,
      lunch_date: inputs.date,
    },
  });

  if (!putResp.ok) {
    const updateAttendanceError = `attendances datastore를 업데이트하는 과정에서 에러가 발생했어요. [user_id: ${body.user.id}] - (상세 에러: ${putResp.error})`;
    console.log(updateAttendanceError);
    return;
  }

  // const params: ChatPostMessageParams = {
  //   channel: AD_RANDOM_CHANNEL_ID, // #ad-random 채널
  //   thread_ts: body.message.ts || undefined,
  //   blocks: [
  //     {
  //       type: "section",
  //       text: mrkdwnElement(
  //         `<@${body.user.id}>\n이번주 랜덤런치 \`${
  //           { attend: "참여", skip: "미참여" }[action.value]
  //         }\` : 정상적으로 반영되었어요 :thank-bow:`
  //       ),
  //     },
  //   ],
  //   username: RANDOM_LUNCH,
  //   text: "선택이 정상적으로 반영되었어요",
  // };

  // const response = await client.chat.postMessage(params);
  // if (!response.ok) {
  //   const postMessageError = ` 메세지를 보내는 과정에서 에러가 발생했어요 - (상세 에러: ${response.error})`;
  //   console.log(postMessageError);
  //   return { error: postMessageError };
  // }

  sendEphemeralMessage(
    client,
    body.user.id,
    `<@${body.user.id}>\n이번주 랜덤런치 \`${
      { attend: "참여", skip: "미참여" }[action.value]
    }\` : 정상적으로 반영되었어요 :thank-bow:`,
    body.message?.ts || undefined
  );
};

export const openOverflowView: BlockActionHandler<
  typeof CreateAttendanceFunction.definition
> = async ({ inputs, body, action, client }) => {
  // 광고실 멤버가 맞는지 확인
  if (!(await isAuth(client, body.user.id))) {
    return;
  }

  // 기본상태 설정 모달 뷰 생성 및 열기
  if (action.selected_option.value == "edit_status_option") {
    const editModalView = buildEditModal();
    const viewsOpenResp = await client.views.open({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view: editModalView,
    });

    if (!viewsOpenResp.ok) {
      const DefaultAttendanceOpenError = `기본 상태 설정 모달을 여는 과정에서 에러가 발생했어요. - (상세 에러: ${viewsOpenResp.error}`;
      console.log(DefaultAttendanceOpenError);
    }
  }

  // 현재 상황 메세지로 확인
  if (action.selected_option.value === "dashboard_option") {
    if (!isAllow(client, body.user.id, inputs.create_by)) {
      return;
    }

    const tempDashboardText = await buildTempDashboarText(client, inputs.date);
    sendEphemeralMessage(
      client,
      body.user.id,
      tempDashboardText,
      body.message?.ts
    );

    // const blocks = await buildDashboardBlocks(client, inputs.date);
    // const params: ChatPostMessageParams = {
    //   channel: AD_RANDOM_CHANNEL_ID, // #ad-random 채널
    //   thread_ts: body.message.ts,
    //   blocks,
    //   username: RANDOM_LUNCH,
    //   text: "광고실 랜덤런치 참여현황이에요.",
    // };

    // const response = await client.chat.postMessage(params);
    // if (!response.ok) {
    //   const postMessageError = ` 메세지를 보내는 과정에서 에러가 발생했어요 - (상세 에러: ${response.error})`;
    //   console.log(postMessageError);
    //   return { error: postMessageError };
    // }
  }
};

export const editDefaultAttendanceStatus: ViewSubmissionHandler<
  typeof CreateAttendanceFunction.definition
> = async ({ inputs, view, client, body }) => {
  // 광고실 멤버가 맞는지 확인
  if (!(await isAuth(client, body.user.id))) {
    return;
  }

  // 기본상태에 대한 데이터스토어 업데이트
  const status =
    view.state.values.setting_status_block.setting_status_select.selected_option
      .value;
  const putResp = await client.apps.datastore.update({
    datastore: DefaultAttendanceDatastore.name,
    item: {
      user_id: body.user.id,
      status,
    },
  });

  if (!putResp.ok) {
    const updateDefaultAttendanceError = `default attendances datastore를 업데이트하는 과정에서 에러가 발생했어요. [user_id: ${body.user.id}] - (상세 에러: ${putResp.error})`;
    console.log(updateDefaultAttendanceError);
    return;
  }
};

export const createRandomLunchTeam: BlockActionHandler<
  typeof CreateAttendanceFunction.definition
> = async ({ inputs, body, action, client }) => {
  // 권한이 있는 멤버인지 확인
  if (!isAllow(client, body.user.id, inputs.create_by)) {
    return;
  }

  // 유저의 기본 랜덤런치 참여여부 데이터 가져오기
  const defaultAttendances = await client.apps.datastore.query({
    datastore: DefaultAttendanceDatastore.name,
  });
  if (!defaultAttendances.ok) {
    const getDefaultAttendancesError = `default attendances datastore 데이터를 가져오는 과정에서 에러가 발생했어요. [all data] - (상세 에러: ${defaultAttendances.error})`;
    console.log(getDefaultAttendancesError);
    return;
  }

  // 유저의 이번주 랜덤런치 참여여부 데이터 가져오기
  const attendances = await client.apps.datastore.query({
    datastore: AttendanceDatastore.name,
    expression: "#lunch_date = :date",
    expression_attributes: { "#lunch_date": "lunch_date" },
    expression_values: { ":date": inputs.date },
  });
  if (!attendances.ok) {
    const getAttendancesError = `attendances datastore 데이터를 가져오는 과정에서 에러가 발생했어요. [lunch_date: ${inputs.date}] - (상세 에러: ${attendances.error})`;
    console.log(getAttendancesError);
    return;
  }

  // 광고실 멤버 리스트 데이터 가져오기
  const adsMembers = await client.usergroups.users.list({
    usergroup: ADS_MEMBERS_USER_GROUP_ID,
  });
  if (!adsMembers.ok) {
    const getUserlistError = `@ads-member 유저그룹의 유저 리스트를 가지고 오는 과정에서 에러가 발생했어요. (상세 에러: ${adsMembers.error})`;
    console.log(getUserlistError);
    return;
  }

  const attendMembers = adsMembers.users.filter(
    (user) =>
      (attendances.items.find(({ user_id }) => user_id === user)?.status ||
        defaultAttendances.items.find(({ user_id }) => user_id === user)
          ?.status ||
        "skip") === "attend"
  );

  const randomTeams = chunk(shuffle(attendMembers), 4);

  // 수정 메세지 생성 & 기존 메세지 업데이트
  const blocks = buildAttendanceBlocks(action.block_id, inputs.date, true);
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
    teams: randomTeams,
  };

  // 현재 스텝 완료 > 다음 스텝으로 넘어가기
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

// Helper
const isAdsMember = async (client, user_id) => {
  const response = await client.usergroups.users.list({
    usergroup: ADS_MEMBERS_USER_GROUP_ID,
  });
  if (!response.ok) {
    const getUserlistError = `@ads-member 유저그룹의 유저 리스트를 가지고 오는 과정에서 에러가 발생했어요. (상세 에러: ${response.error})`;
    console.log(getUserlistError);
    return false;
  }

  return response.users.includes(user_id);
};

const sendEphemeralMessage = async (
  client,
  user_id,
  message,
  thread_ts?: string
) => {
  const response = await client.chat.postEphemeral({
    channel: AD_RANDOM_CHANNEL_ID,
    user: user_id,
    username: RANDOM_LUNCH,
    text: message,
    thread_ts,
  });

  if (!response.ok) {
    const postEphemeralError = `#ad-random 채널에 ephemeral message를 보내는 과정에서 에러가 발생했어요. -  (상세 에러: ${response.error})`;
    console.log(postEphemeralError);
    return;
  }
};

const isAuth = async (client, user_id) => {
  const isMember = await isAdsMember(client, user_id);

  if (isMember) return true;

  console.log("랜덤런치는 광고실 멤버만 참여할 수 있어요.");
  sendEphemeralMessage(
    client,
    user_id,
    `:shushing_face: *이 메세지는 당신에게만 보여지는 메세지에요*\n\n랜덤런치는 광고실 멤버만 참여할 수 있어요, \`@ads-members\` 그룹에 속해있는지 확인해주세요.\n만약 \`@ads-members\`그룹에 추가되어야한다면 <@${CJ_USER_ID}>에게 문의주세요!`
  );
  return false;
};

const isAllow = (client, user_id, created_by: string) => {
  const isMember = created_by === user_id;

  if (isMember) return true;

  console.log("워크플로우를 실행한 멤버만 가능한 액션이에요.");
  sendEphemeralMessage(
    client,
    user_id,
    `:shushing_face: *이 메세지는 당신에게만 보여지는 메세지에요*\n\n워크플로우를 실행한 멤버만 가능한 액션이에요!`
  );
  return false;
};

function shuffle(array = []) {
  for (let index = array.length - 1; index > 0; index--) {
    const randomPosition = Math.floor(Math.random() * (index + 1));

    const temporary = array[index];
    array[index] = array[randomPosition];
    array[randomPosition] = temporary;
  }

  return array;
}

function chunk(array: string[] = [], size = 1) {
  const arr: string[][] = [];

  for (let i = 0; i < array.length; i += size) {
    arr.push(array.slice(i, i + size));
  }

  return arr;
}
