import {
  Block,
  KnownBlock,
  ModalView,
} from "https://cdn.skypack.dev/@slack/types?dts";

import {
  contextBlock,
  mrkdwnElement,
  dividerBlock,
} from "../post_summary/blocks.ts";

import AttendanceDatastore from "../../datastores/attendances.ts";
import DefaultAttendanceDatastore from "../../datastores/default_attendances.ts";
import { ADS_MEMBERS_USER_GROUP_ID, SARAH_USER_ID } from "../../constants.ts";

export const buildAttendanceBlocks = (
  id: string,
  date: string,
  edit?: boolean
): (KnownBlock | Block)[] => {
  if (edit) {
    return [
      {
        type: "section",
        text: mrkdwnElement(
          ":rice: *광고실 랜덤런치가 돌아왔어요* :rice:\n이번주 목요일은 기다리던 광고실 랜덤런치 날이에요, 참여 여부를 알려주세요!"
        ),
      },
      contextBlock(
        mrkdwnElement(
          `:check-green: \`${date}\` 랜덤런치 조 생성이 완료되었어요.`
        )
      ),
    ];
  }

  return [
    {
      type: "section",
      text: mrkdwnElement(
        ":rice: *광고실 랜덤런치가 돌아왔어요* :rice:\n이번주 목요일은 기다리던 광고실 랜덤런치 날이에요, 참여 여부를 알려주세요!"
      ),
      accessory: {
        type: "button",
        style: "danger",
        value: "create_team",
        action_id: "create_team_button",
        text: {
          type: "plain_text",
          text: "랜덤런치 조 생성",
        },
        confirm: {
          title: {
            type: "plain_text",
            text: `[${date}] 랜덤런치 조를 생성할까요?`,
          },
          text: mrkdwnElement(
            `:lunch-train: 랜덤런치 조를 생성하면 더이상 참여여부를 변경할 수 없어요.\n\n생성 버튼을 클릭하면 메세지가 업데이트되고 생성된 조가 스레드 답글로 달리게 돼요.`
          ),
          confirm: {
            type: "plain_text",
            text: "생성",
          },
          deny: {
            type: "plain_text",
            text: "취소",
          },
        },
      },
    },
    dividerBlock(),
    {
      type: "section",
      text: mrkdwnElement(
        `@ads_members\n\`${date}\` 랜덤런치 참여여부를 알려주세요.`
      ),
    },
    {
      type: "actions",
      block_id: `${id}`,
      elements: [
        {
          type: "button",
          style: "primary",
          text: {
            type: "plain_text",
            text: "참여",
          },
          value: "attend",
          action_id: "attend_button",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "미참여",
          },
          value: "skip",
          action_id: "skip_button",
        },
        {
          type: "overflow",
          action_id: "setting_overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "기본 상태 설정하기",
              },
              value: "edit_status_option",
            },
            {
              text: {
                type: "plain_text",
                text: "현재 상황 보기",
              },
              value: "dashboard_option",
            },
          ],
        },
      ],
    },
  ];
};

export const buildEditModal = (): ModalView => {
  const blocks = [
    contextBlock(
      mrkdwnElement(
        "기본 상태를 설정하면 다음부터 자동으로 참여여부가 설정돼요."
      )
    ),
    {
      type: "section",
      block_id: "setting_status_block",
      text: mrkdwnElement("기본 상태"),
      accessory: {
        type: "static_select",
        action_id: "setting_status_select",
        placeholder: {
          type: "plain_text",
          text: "상태",
          emoji: true,
        },
        options: [
          {
            text: {
              type: "plain_text",
              text: "참여",
              emoji: true,
            },
            value: "attend",
          },
          {
            text: {
              type: "plain_text",
              text: "미참여",
              emoji: true,
            },
            value: "skip",
          },
        ],
      },
    },
  ];

  const view: ModalView = {
    type: "modal",
    callback_id: "edit_status_modal",
    title: {
      type: "plain_text",
      text: "기본 참석여부 설정",
    },
    submit: {
      type: "plain_text",
      text: "저장",
    },
    close: {
      type: "plain_text",
      text: "닫기",
    },
    blocks: blocks,
  };

  return view;
};

export const buildDashboardBlocks = async (
  client,
  date: string
): Promise<(KnownBlock | Block)[]> => {
  const errorBlocks = [
    {
      type: "section",
      text: mrkdwnElement(
        ":warning: *랜덤런치 참여여부를 가져오는 과정에서 에러가 발생했어요.*"
      ),
    },
  ];
  // 유저의 기본 랜덤런치 참여여부 데이터 가져오기
  const defaultAttendances = await client.apps.datastore.query({
    datastore: DefaultAttendanceDatastore.name,
  });
  if (!defaultAttendances.ok) {
    const getDefaultAttendancesError = `default attendances datastore 데이터를 가져오는 과정에서 에러가 발생했어요. [all data] - (상세 에러: ${defaultAttendances.error})`;
    console.log(getDefaultAttendancesError);
    return errorBlocks;
  }

  // 유저의 이번주 랜덤런치 참여여부 데이터 가져오기
  const attendances = await client.apps.datastore.query({
    datastore: AttendanceDatastore.name,
    expression: "#lunch_date = :date",
    expression_attributes: { "#lunch_date": "lunch_date" },
    expression_values: { ":date": date },
  });
  if (!attendances.ok) {
    const getAttendancesError = `attendances datastore 데이터를 가져오는 과정에서 에러가 발생했어요. [lunch_date: ${date}] - (상세 에러: ${attendances.error})`;
    console.log(getAttendancesError);
    return errorBlocks;
  }

  // 광고실 멤버 리스트 데이터 가져오기
  const adsMembers = await client.usergroups.users.list({
    usergroup: ADS_MEMBERS_USER_GROUP_ID,
  });
  if (!adsMembers.ok) {
    const getUserlistError = `@ads-member 유저그룹의 유저 리스트를 가지고 오는 과정에서 에러가 발생했어요. (상세 에러: ${adsMembers.error})`;
    console.log(getUserlistError);
    return errorBlocks;
  }

  const dashboard = adsMembers.users.map((user) => ({
    user,
    status:
      attendances.items.find(({ user_id }) => user_id === user)?.status ||
      defaultAttendances.items.find(({ user_id }) => user_id === user)
        ?.status ||
      undefined,
  }));
  const attends = dashboard.filter(({ status }) => status === "attend");
  const skips = dashboard.filter(({ status }) => status === "skip");
  const yets = dashboard.filter(({ status }) => status === undefined);

  return [
    {
      type: "section",
      text: mrkdwnElement(
        `:google-document: *광고실 랜덤런치 참여 현황* \n\n*광고실 전체 인원*: ${adsMembers.users.length} 명`
      ),
      fields: [
        {
          type: "mrkdwn",
          text: `*참여*: ${attends.length} 명`,
        },
        {
          type: "mrkdwn",
          text: `*미참여*: ${skips.length} 명`,
        },
        {
          type: "mrkdwn",
          text: `*[참여자] : * `.concat(
            `<@${attends.map(({ user }) => user).join(">, <@")}>`
          ),
        },
        {
          type: "mrkdwn",
          text: `*[미참여자] : * `.concat(
            `<@${skips.map(({ user }) => user).join(">, <@")}>`
          ),
        },
      ],
    },
    contextBlock(mrkdwnElement(`:loading: ${yets.length}명 미정`)),
  ];
};

export const buildTempDashboarText = async (
  client,
  date: string
): Promise<string> => {
  const errorText =
    ":warning: *랜덤런치 참여여부를 가져오는 과정에서 에러가 발생했어요.*";
  // 유저의 기본 랜덤런치 참여여부 데이터 가져오기
  const defaultAttendances = await client.apps.datastore.query({
    datastore: DefaultAttendanceDatastore.name,
  });
  if (!defaultAttendances.ok) {
    const getDefaultAttendancesError = `default attendances datastore 데이터를 가져오는 과정에서 에러가 발생했어요. [all data] - (상세 에러: ${defaultAttendances.error})`;
    console.log(getDefaultAttendancesError);
    return errorText;
  }

  // 유저의 이번주 랜덤런치 참여여부 데이터 가져오기
  const attendances = await client.apps.datastore.query({
    datastore: AttendanceDatastore.name,
    expression: "#lunch_date = :date",
    expression_attributes: { "#lunch_date": "lunch_date" },
    expression_values: { ":date": date },
  });
  if (!attendances.ok) {
    const getAttendancesError = `attendances datastore 데이터를 가져오는 과정에서 에러가 발생했어요. [lunch_date: ${date}] - (상세 에러: ${attendances.error})`;
    console.log(getAttendancesError);
    return errorText;
  }

  // 광고실 멤버 리스트 데이터 가져오기
  const adsMembers = await client.usergroups.users.list({
    usergroup: ADS_MEMBERS_USER_GROUP_ID,
  });
  if (!adsMembers.ok) {
    const getUserlistError = `@ads-member 유저그룹의 유저 리스트를 가지고 오는 과정에서 에러가 발생했어요. (상세 에러: ${adsMembers.error})`;
    console.log(getUserlistError);
    return errorText;
  }

  const dashboard = adsMembers.users.map((user) => ({
    user,
    status:
      attendances.items.find(({ user_id }) => user_id === user)?.status ||
      defaultAttendances.items.find(({ user_id }) => user_id === user)
        ?.status ||
      undefined,
  }));
  const attends = dashboard.filter(({ status }) => status === "attend");
  const skips = dashboard.filter(({ status }) => status === "skip");
  const yets = dashboard.filter(({ status }) => status === undefined);

  return `:data-daangni: *광고실 랜덤런치 참여 현황* \n\n*광고실 전체 인원*: ${
    adsMembers.users.length
  } 명\n*참여*: ${attends.length} 명\n*미참여*: ${
    skips.length
  } 명\n\n*[참여자] : * <@${attends
    .map(({ user }) => user)
    .join(">, <@")}>\n*[미참여자] : * <@${skips
    .map(({ user }) => user)
    .join(">, <@")}>\n\n:loading: ${yets.length}명 미정`;
};
