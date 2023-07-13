import { DefineType, Schema } from "deno-slack-sdk/mod.ts";

export const TeamsType = DefineType({
  name: "Teams",
  type: Schema.types.array,
  items: {
    type: Schema.slack.types.user_id,
  },
});

export type Teams = Array<Array<string>>;
