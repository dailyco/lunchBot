import { FOOD_ICONS } from "../../constants.ts";
import { Teams } from "./types.ts";
import {
  Block,
  ContextBlock,
  KnownBlock,
  MrkdwnElement,
  DividerBlock,
} from "https://cdn.skypack.dev/@slack/types?dts";

// There is a Slack API limit of 50 blocks in a single message payload
export const MAX_BLOCKS_LENGTH = 50;
export const SUCCESS_MATCHER = ":white_check_mark:";
export const ERROR_MATCHER = ":no_entry:";

export const buildTeamBlocks = (
  teams: Teams,
  edit?: boolean
): (KnownBlock | Block)[] => {
  const accessory =
    teams.length > 0
      ? {
          accessory: {
            type: "button",
            value: "send_teams",
            action_id: "send_teams_button",
            text: {
              type: "plain_text",
              text: "랜덤런치 조 스레드 전송",
            },
          },
        }
      : {};

  const field = {
    type: "section",
    fields:
      teams.length > 0
        ? teams.map((team, idx) => ({
            type: "mrkdwn",
            text: `*[${idx + 1}조] : * `.concat(`<@${team.join(">, <@")}>`),
          }))
        : [
            {
              type: "mrkdwn",
              text: "생성된 조가 없어요 :cryhappy:",
            },
          ],
  };

  if (edit) {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:lunch-train: 랜덤런치 조가 생성되었어요`,
        },
      },
      contextBlock(
        mrkdwnElement(`:check-green: 랜덤런치 조를 스레드로 전송했어요.`)
      ),
      dividerBlock(),
      field,
    ];
  }

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:lunch-train: 랜덤런치 조가 생성되었어요`,
      },
      ...accessory,
    },
    dividerBlock(),
    field,
  ];
};

export const buildThreadsBlocks = (
  teams: Teams
): Array<Array<KnownBlock | Block>> => {
  const shuffledIcons = shuffle(FOOD_ICONS);
  return teams.map((team, idx) => [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${shuffledIcons[idx]} 랜덤런치 ${idx + 1}조\n<@${team.join(
          ">, <@"
        )}>`,
      },
    },
  ]);
};

// Helpers
// deno-lint-ignore no-explicit-any
export function contextBlock(...elements: any): ContextBlock {
  return {
    type: "context",
    elements: elements,
  };
}

export function mrkdwnElement(text: string): MrkdwnElement {
  return {
    type: "mrkdwn",
    text: text,
  };
}

export function dividerBlock(): DividerBlock {
  return {
    type: "divider",
  };
}

export function truncationBlock(): KnownBlock {
  return contextBlock(mrkdwnElement(".... and more"));
}

function shuffle(array: any[] = []) {
  for (let index = array.length - 1; index > 0; index--) {
    const randomPosition = Math.floor(Math.random() * (index + 1));

    const temporary = array[index];
    array[index] = array[randomPosition];
    array[randomPosition] = temporary;
  }

  return array;
}
