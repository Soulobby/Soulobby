import knex from "knex";
import { DATABASE_URL } from "./utility/configuration.js";

export const enum Table {
	CasesDiscord = "cases_discord",
	CorruptedEggs = "corrupted_eggs",
	FriendsList = "friends_list",
	IgnoreList = "ignore_list",
	Messages = "messages",
	Reports = "reports",
	Requests = "requests",
	Rotations = "rotations",
	UserData = "user_data",
}

export default knex({
	client: "pg",
	connection: DATABASE_URL,
	pool: { min: 0 },
});
