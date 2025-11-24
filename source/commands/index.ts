import ban from "./chat-inputs/ban.js";
import case_chat_input from "./chat-inputs/case.js";
import custom_status from "./chat-inputs/custom-status.js";
import data from "./chat-inputs/data.js";
import egg from "./chat-inputs/egg.js";
import friend from "./chat-inputs/friend.js";
import ignore from "./chat-inputs/ignore.js";
import information from "./chat-inputs/information.js";
import kick from "./chat-inputs/kick.js";
import lookup from "./chat-inputs/lookup.js";
import purge from "./chat-inputs/purge.js";
import quest from "./chat-inputs/quest.js";
import reputation from "./chat-inputs/reputation.js";
import request from "./chat-inputs/request.js";
import snowflake from "./chat-inputs/snowflake.js";
import time_out from "./chat-inputs/time-out.js";
import unban from "./chat-inputs/unban.js";
import request_info from "./user-context-menus/request-info.js";
import user_info from "./user-context-menus/user-info.js";

export const CHAT_INPUT_COMMANDS = [
	ban,
	case_chat_input,
	custom_status,
	data,
	egg,
	friend,
	ignore,
	information,
	kick,
	lookup,
	purge,
	quest,
	reputation,
	request,
	snowflake,
	time_out,
	unban,
] as const;

export const USER_CONTEXT_MENU_COMMANDS = [request_info, user_info] as const;

export const AUTOCOMPLETE_COMMANDS = CHAT_INPUT_COMMANDS.filter(
	(command) => "autocomplete" in command,
);
