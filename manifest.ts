import { Manifest } from "deno-slack-sdk/mod.ts";
import AttendanceDatastore from "./datastores/attendances.ts";
import DefaultAttendanceDatastore from "./datastores/default_attendances.ts";
import { TeamsType } from "./functions/post_summary/types.ts";
import CreateRandomLunchWorkflow from "./workflows/create_random_lunch.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/future/manifest
 */
export default Manifest({
  name: "ads-bot",
  description: "광고실 문화 담당",
  icon: "assets/sandwich_daangni.jpg",
  types: [TeamsType],
  datastores: [AttendanceDatastore, DefaultAttendanceDatastore],
  functions: [],
  workflows: [CreateRandomLunchWorkflow],
  outgoingDomains: ["cdn.skypack.dev"],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "chat:write.customize",
    "usergroups:read",
    "datastore:read",
    "datastore:write",
  ],
});
