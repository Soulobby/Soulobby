import type { Snowflake } from "discord.js";
import pg, { Table } from "../pg.js";

interface UserDataPacket {
	user_id: Snowflake;
	request_override: boolean;
	trash: boolean;
}

interface UserDataData {
	userId: Snowflake;
	requestOverride: boolean;
	trash: boolean;
}

type UserDataEditData = Pick<UserDataData, "requestOverride">;

export default class UserData {
	public readonly userId: UserDataData["userId"];

	public readonly requestOverride: UserDataData["requestOverride"];

	public constructor(data: UserDataPacket) {
		this.userId = data.user_id;
		this.requestOverride = data.request_override;
	}

	public static async fetch(userId: UserDataData["userId"]) {
		const [packet] = await pg<UserDataPacket>(Table.UserData)
			.select("*")
			.where({ user_id: userId });

		if (!packet) {
			throw new Error("No user data found.");
		}

		return new UserData(packet);
	}

	public static async edit(userId: UserDataData["userId"], { requestOverride }: UserDataEditData) {
		const [packet] = await pg<UserDataPacket>(Table.UserData)
			.insert({ user_id: userId, request_override: requestOverride })
			.onConflict("user_id")
			.merge(["request_override"])
			.returning("*");

		return new UserData(packet);
	}
}
