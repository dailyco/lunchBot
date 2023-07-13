import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export default DefineDatastore({
  name: "attendances",
  primary_key: "user_id",
  attributes: {
    user_id: {
      type: Schema.slack.types.user_id,
    },
    status: {
      type: Schema.types.string, // possible statuses are attend, skip
    },
    lunch_date: {
      type: Schema.types.string,
    },
  },
});
