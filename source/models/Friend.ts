import {
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	Collection,
	DiscordAPIError,
	EmbedBuilder,
	Locale,
	messageLink,
	RESTJSONErrorCodes,
	type Snowflake,
	TimestampStyles,
	userMention,
} from "discord.js";
import pg, { Table } from "../pg.js";
import {
	CAPTAIN_ROLE_ID,
	EX_FRIENDS_LIST_CHANNEL_ID,
	EX_RANK_ROLE_ID,
	FRIENDS_LIST_CHANNEL_ID,
	FRIENDS_LIST1_MESSAGE_ID,
	GENERAL_ROLE_ID,
	GUILD_ID,
	QUEUE_HELPER_ROLE_ID,
	RANK_ROLE_ID,
	SMILEY_ROLE_ID,
	STAR_RANK_ROLE_ID,
} from "../utility/configuration.js";
import { MAXIMUM_RSN_LENGTH, RANK_VALUES, Rank } from "../utility/constants.js";
import { time } from "../utility/functions.js";
import Base from "./Base.js";

export interface FriendPacket {
	id: number;
	user_id: Snowflake | null;
	main_id: number | null;
	alt_id: number[];
	initial_RSN: string;
	current_RSN: string;
	derank_timestamp: "??" | string | null;
	reason: string | null;
	history: FriendHistory[];
	message_id: Snowflake | null;
}

interface FriendData {
	id: number;
	userId: Snowflake | null;
	mainId: number | null;
	altId: number[];
	initialRSN: string;
	currentRSN: string;
	derankTimestamp: "??" | number | null;
	reason: string | null;
	history: FriendHistory[];
	messageId: Snowflake | null;
}

interface FriendHistory {
	date?: number;
	rank: Rank;
}

type FriendPatchData = Omit<FriendPacket, "id" | "initial_RSN">;

type FriendCreateData = Omit<
	FriendPacket,
	"id" | "alt_id" | "derank_timestamp" | "reason" | "message_id"
>;

type FriendAlterRankData = Pick<FriendPacket, "history">;

type FriendEditData = Pick<
	FriendPacket,
	"user_id" | "main_id" | "alt_id" | "current_RSN" | "derank_timestamp" | "reason"
>;

interface FriendRemoveData {
	derank_timestamp: string;
	reason: string;
}

export function isRank(rank: string): rank is Rank {
	return RANK_VALUES.includes(rank as Rank);
}

export default class Friend extends Base {
	public static readonly cache = new Collection<number, Friend>();

	public readonly id: FriendData["id"];

	public userId!: FriendData["userId"];

	public mainId!: FriendData["mainId"];

	public altId!: FriendData["altId"];

	public readonly initialRSN: FriendData["initialRSN"];

	public currentRSN!: FriendData["currentRSN"];

	public derankTimestamp: FriendData["derankTimestamp"];

	public reason!: FriendData["reason"];

	public history!: FriendData["history"];

	public messageId: FriendData["messageId"];

	public constructor(client: Client, data: FriendPacket) {
		super(client);
		this.id = data.id;
		this.initialRSN = data.initial_RSN;

		this.derankTimestamp =
			data.derank_timestamp === null
				? null
				: data.derank_timestamp === "??"
					? "??"
					: Number(data.derank_timestamp);

		this.messageId = data.message_id;
		this.patch(data);
	}

	private patch(data: FriendPatchData) {
		this.userId = data.user_id;
		this.mainId = data.main_id;
		this.altId = data.alt_id;
		this.currentRSN = data.current_RSN;

		this.derankTimestamp =
			data.derank_timestamp === null
				? null
				: data.derank_timestamp === "??"
					? "??"
					: Number(data.derank_timestamp);

		this.reason = data.reason;
		this.history = data.history;
		this.messageId = data.message_id;
	}

	public static async create(
		interaction: ChatInputCommandInteraction<"cached">,
		data: FriendCreateData,
	) {
		const [packet] = await pg<FriendPacket>(Table.FriendsList)
			// @ts-expect-error Apparently, you must JSON.stringify() arrays. TypeScript does not like this.
			.insert({ ...data, history: JSON.stringify(data.history) })
			.returning("*");

		const friend = new this(interaction.client, packet);

		if (friend.main) {
			await friend.main.edit({
				user_id: friend.main.userId,
				main_id: friend.main.mainId,
				alt_id: [...friend.main.altId, friend.id],
				current_RSN: friend.main.currentRSN,
				derank_timestamp:
					typeof friend.main.derankTimestamp === "number"
						? String(friend.main.derankTimestamp)
						: friend.main.derankTimestamp,
				reason: friend.main.reason,
			});
		}

		this.cache.set(friend.id, friend);
		await friend.updateRoles();
		await this.updateFriends(interaction.client);

		await interaction.editReply({
			allowedMentions: { parse: [] },
			content: `Successfully created \`${friend.RSN}\`${friend.userId ? ` (${userMention(friend.userId)})` : ""} as a ${
				friend.rank
			}!`,
		});
	}

	public async alterRank(
		interaction: ChatInputCommandInteraction<"cached">,
		data: FriendAlterRankData,
	) {
		if (!this.isAdded()) {
			throw new Error("Attempted to alter the rank of an account that is not added.");
		}

		const [packet] = await pg<FriendPacket>(Table.FriendsList)
			// @ts-expect-error Apparently, you must JSON.stringify() arrays. TypeScript does not like this.
			.update({ ...data, history: JSON.stringify(data.history) })
			.where({ id: this.id })
			.returning("*");

		const previousRank = this.rank;
		this.patch(packet);
		await this.updateRoles();
		await Friend.updateFriends(interaction.client);

		await interaction.editReply(
			`Successfully altered the rank of \`${this.RSN}\` from \`${previousRank}\` to \`${this.rank}\`.`,
		);
	}

	public async edit(
		data: FriendEditData,
		interaction: ChatInputCommandInteraction<"cached"> | null = null,
	) {
		const [packet] = await pg<FriendPacket>(Table.FriendsList)
			// @ts-expect-error Apparently, you must JSON.stringify() arrays. TypeScript does not like this.
			.update({ ...data, alt_id: JSON.stringify(data.alt_id) })
			.where({ id: this.id })
			.returning("*");

		let editMessage = `Successfully edited the data of ${
			this.isAdded()
				? `\`${this.RSN}\``
				: `[\`${this.RSN}\`](<${messageLink(this.exFriendsList.id, this.messageId!, GUILD_ID)}>)`
		}.`;

		let updateFriendsList = false;
		let updateExFriendsList = false;
		let updateAllRoles = false;

		if (this.userId !== data.user_id) {
			editMessage += `\nUser ${this.userId === null ? "is now" : `altered from ${userMention(this.userId)} to`} ${
				data.user_id === null ? "nothing" : userMention(data.user_id)
			}.`;

			if (this.userId) {
				this.client.guild.members
					.fetch(this.userId)
					.then(async (guildMember) =>
						guildMember.roles.remove([
							GENERAL_ROLE_ID,
							CAPTAIN_ROLE_ID,
							STAR_RANK_ROLE_ID,
							RANK_ROLE_ID,
							SMILEY_ROLE_ID,
							EX_RANK_ROLE_ID,
						]),
					)
					.catch(() => null);
			}

			if (this.isAdded()) {
				updateFriendsList = true;
			} else {
				updateExFriendsList = true;
			}

			if (data.user_id !== null) {
				updateAllRoles = true;
			}
		}

		if (this.mainId !== data.main_id) {
			editMessage += `\nMain account ${this.main === null ? "is now" : `altered from \`${this.main.RSN}\` to`} `;

			await this.main?.edit({
				user_id: this.main.userId,
				main_id: this.main.mainId,
				alt_id: this.main.altId.filter((altNo) => altNo !== this.id),
				current_RSN: this.main.currentRSN,
				derank_timestamp:
					typeof this.main.derankTimestamp === "number"
						? String(this.main.derankTimestamp)
						: this.main.derankTimestamp,
				reason: this.main.reason,
			});

			const main = data.main_id ? Friend.cache.get(data.main_id) : null;

			if (main) {
				await main.edit({
					user_id: main.userId,
					main_id: main.mainId,
					alt_id: [...main.altId, this.id],
					current_RSN: main.currentRSN,
					derank_timestamp:
						typeof main.derankTimestamp === "number"
							? String(main.derankTimestamp)
							: main.derankTimestamp,
					reason: main.reason,
				});

				editMessage += `\`${main.RSN}\`.`;
			} else {
				editMessage += "nothing.";
			}
		}

		if (this.altId.length !== data.alt_id.length) {
			editMessage += `\nAlternative accounts altered from \`${this.altId.join(" & ")}\` to \`${data.alt_id.join(
				" & ",
			)}\`.`;

			if (this.isAdded()) {
				updateFriendsList = true;
			}
		}

		if (this.currentRSN !== data.current_RSN) {
			editMessage += `\nCurrent RSN altered from \`${this.currentRSN}\` to \`${data.current_RSN}\`.`;

			if (this.isAdded()) {
				updateFriendsList = true;
			} else {
				updateExFriendsList = true;
			}
		}

		if (this.derankTimestamp !== data.derank_timestamp) {
			editMessage += `\nDerank timestamp altered from \`${this.derankTimestamp}\` to \`${data.derank_timestamp}\`.`;
			updateExFriendsList = true;
		}

		if (this.reason !== data.reason) {
			editMessage += `\nReason altered from \`${this.reason}\` to \`${data.reason}\`.`;
			updateExFriendsList = true;
		}

		this.patch(packet);

		if (updateFriendsList) {
			await Friend.updateFriends(this.client);
		}

		if (updateExFriendsList) {
			await this.updateExFL();
		}

		if (updateAllRoles) {
			await this.updateRoles();
		}

		await interaction?.editReply({ allowedMentions: { parse: [] }, content: editMessage });
	}

	public async remove(interaction: ChatInputCommandInteraction<"cached">, data: FriendRemoveData) {
		const [packet] = await pg<FriendPacket>(Table.FriendsList)
			.update(data)
			.where({ id: this.id })
			.returning("*");

		this.patch(packet);

		const { id: messageId } = await this.exFriendsList.send({
			embeds: [await this.exFriendEmbed()],
		});

		const [packet2] = await pg<FriendPacket>(Table.FriendsList)
			.update({ message_id: messageId })
			.where({ id: this.id })
			.returning("*");
		this.patch(packet2);

		await this.updateRoles();
		await Friend.updateFriends(interaction.client);
		await interaction.editReply(`Successfully deranked \`${this.RSN}\`.`);
	}

	public async updateRoles() {
		if (this.userId === null) {
			return;
		}

		try {
			const guildMember = await this.client.guild.members.fetch(this.userId);
			const roles = new Set(guildMember.roles.cache.keys());

			switch (this.rank) {
				case Rank.General: {
					roles.add(GENERAL_ROLE_ID);
					roles.add(STAR_RANK_ROLE_ID);
					roles.add(RANK_ROLE_ID);
					roles.delete(SMILEY_ROLE_ID);
					roles.delete(EX_RANK_ROLE_ID);
					break;
				}
				case Rank.Captain: {
					roles.delete(GENERAL_ROLE_ID);
					roles.add(CAPTAIN_ROLE_ID);
					roles.add(STAR_RANK_ROLE_ID);
					roles.add(RANK_ROLE_ID);
					roles.delete(SMILEY_ROLE_ID);
					roles.delete(EX_RANK_ROLE_ID);
					break;
				}
				case Rank.Lieutenant: {
					roles.delete(GENERAL_ROLE_ID);
					roles.delete(CAPTAIN_ROLE_ID);
					roles.add(STAR_RANK_ROLE_ID);
					roles.add(RANK_ROLE_ID);
					roles.delete(SMILEY_ROLE_ID);
					roles.delete(EX_RANK_ROLE_ID);
					break;
				}
				case Rank.Sergeant:
				case Rank.Corporal:
				case Rank.Recruit: {
					roles.delete(GENERAL_ROLE_ID);
					roles.delete(CAPTAIN_ROLE_ID);
					roles.delete(STAR_RANK_ROLE_ID);
					roles.add(RANK_ROLE_ID);
					roles.delete(SMILEY_ROLE_ID);
					roles.delete(EX_RANK_ROLE_ID);
					break;
				}
				case Rank.Smiley: {
					roles.delete(GENERAL_ROLE_ID);
					roles.delete(STAR_RANK_ROLE_ID);
					roles.delete(CAPTAIN_ROLE_ID);
					roles.delete(RANK_ROLE_ID);
					roles.delete(QUEUE_HELPER_ROLE_ID);
					roles.add(SMILEY_ROLE_ID);

					if (this.isExRank()) {
						roles.add(EX_RANK_ROLE_ID);
					}

					break;
				}
				case null: {
					roles.delete(GENERAL_ROLE_ID);
					roles.delete(CAPTAIN_ROLE_ID);
					roles.delete(STAR_RANK_ROLE_ID);
					roles.delete(RANK_ROLE_ID);
					roles.delete(QUEUE_HELPER_ROLE_ID);
					roles.delete(SMILEY_ROLE_ID);

					if (this.isExRank()) {
						roles.add(EX_RANK_ROLE_ID);
					}

					break;
				}
			}

			await guildMember.roles.set([...roles.values()]);
		} catch (error) {
			if (error instanceof DiscordAPIError) {
				if (error.code === RESTJSONErrorCodes.MissingPermissions) {
					void this.client.log(
						`Attempted to update the roles of \`${this.RSN}\` (${userMention(
							this.userId,
						)}), but lacked permissions to do so.`,
					);

					return;
				}

				if (error.code === RESTJSONErrorCodes.UnknownMember) {
					void this.client.log(
						`Attempted to update the roles of \`${this.RSN}\` (${userMention(
							this.userId,
						)}), but cannot find them in this server.`,
					);

					return;
				}
			}

			void this.client.log({
				content: `Encountered an error whilst updating the roles of \`${this.RSN}\` (${userMention(this.userId)}).`,
				error,
			});
		}
	}

	public isAdded(): this is this & {
		derankTimestamp: null;
		messageId: null;
		readonly rank: Rank;
		reason: null;
	} {
		return !this.derankTimestamp;
	}

	public isRanked(): this is this & {
		derankTimestamp: null;
		messageId: null;
		readonly rank: Rank;
		reason: null;
	} {
		return this.rank !== null && this.rank !== "Smiley";
	}

	public isExRank(): this is this {
		return this.history.some(({ rank }) => rank !== "Smiley") && !this.isRanked();
	}

	public isRemoved(): this is this & {
		derankTimestamp: number | "??";
		messageId: Snowflake;
		readonly rank: null;
		reason: string;
	} {
		return Boolean(this.derankTimestamp);
	}

	public static async updateFriends(client: Client) {
		const generals = this.friendSort(this.cache.filter(({ rank }) => rank === "General"));
		const captains = this.friendSort(this.cache.filter(({ rank }) => rank === "Captain"));
		const lieutenants = this.friendSort(this.cache.filter(({ rank }) => rank === "Lieutenant"));
		const sergeants = this.friendSort(this.cache.filter(({ rank }) => rank === "Sergeant"));
		const corporals = this.friendSort(this.cache.filter(({ rank }) => rank === "Corporal"));
		const recruits = this.friendSort(this.cache.filter(({ rank }) => rank === "Recruit"));
		const smilies = this.friendSort(this.cache.filter(({ rank }) => rank === "Smiley"));

		const embed = new EmbedBuilder()
			.setColor((await client.guild.members.fetchMe()).displayColor)
			.setFields(
				{ name: "Generals", value: generals.length === 0 ? "None." : generals.join("\n") },
				{ name: "Captains", value: captains.length === 0 ? "None." : captains.join("\n") },
				{
					name: "Lieutenants",
					value: lieutenants.length === 0 ? "None." : lieutenants.join("\n"),
				},
				{ name: "Sergeants", value: sergeants.length === 0 ? "None." : sergeants.join("\n") },
				{ name: "Corporals", value: corporals.length === 0 ? "None." : corporals.join("\n") },
				{ name: "Recruits", value: recruits.length === 0 ? "None." : recruits.join("\n") },
				{ name: "Smilies", value: smilies.length === 0 ? "None." : smilies.join("\n") },
			);

		await client
			.channel(FRIENDS_LIST_CHANNEL_ID, ChannelType.GuildText)
			.messages.edit(FRIENDS_LIST1_MESSAGE_ID, { embeds: [embed] });
	}

	private static friendSort(friends: typeof this.cache) {
		return friends.map((friend) => {
			let friendString = `\`[${friend.id.toString().padStart(2, "0")}]\` \`${friend.RSN.padEnd(
				MAXIMUM_RSN_LENGTH,
			)}\` \`${(
				typeof friend.addedTimestamp === "number"
					? new Intl.DateTimeFormat(Locale.EnglishGB, {
							dateStyle: "short",
							timeZone: "UTC",
						}).format(friend.addedTimestamp)
					: friend.addedTimestamp
			).padEnd(10)}\``;

			if (friend.altId.length > 0) {
				friendString += ` ${friend.altId.map((altId) => `\`[${altId.toString().padStart(2, "0")}]\``).join(" ")}`;
			}

			if (friend.userId) {
				friendString += ` ${userMention(friend.userId)}`;
			}

			return friendString;
		});
	}

	public async updateExFL() {
		if (!this.isRemoved()) {
			throw new Error(
				"Attempted to update the ex-friends list entry of an account that is not removed.",
			);
		}

		await this.exFriendsList.messages.edit(this.messageId, {
			embeds: [await this.exFriendEmbed()],
		});
	}

	public get exFriendsList() {
		return this.client.channel(EX_FRIENDS_LIST_CHANNEL_ID, ChannelType.GuildText);
	}

	public get RSN() {
		return this.currentRSN;
	}

	public get main(): Friend | null {
		return this.mainId === null ? null : (Friend.cache.get(this.mainId) ?? null);
	}

	public get addedTimestamp() {
		return this.history[0].date ?? "??";
	}

	public get rank(): Rank | null {
		return this.isAdded() ? this.history[this.history.length - 1].rank : null;
	}

	public async exFriendEmbed() {
		if (this.derankTimestamp === null || this.reason === null) {
			throw new Error("Attempted to construct an ex-friend embed, but had no timestamp or reason.");
		}

		return new EmbedBuilder()
			.setColor((await this.client.guild.members.fetchMe()).displayColor)
			.setDescription(
				`Current RSN: \`${this.RSN}\`${
					this.altId.length > 0
						? ` ${this.altId.map((altId) => `\`[${altId < 10 ? "0" : ""}${altId}]\``).join(" ")}`
						: ""
				}${this.userId ? `\nUser: ${userMention(this.userId)}` : ""}\nRanked: ${
					typeof this.addedTimestamp === "number"
						? time(this.addedTimestamp, TimestampStyles.ShortDate)
						: this.addedTimestamp
				}\nDeranked: ${
					typeof this.derankTimestamp === "number"
						? time(this.derankTimestamp, TimestampStyles.ShortDate)
						: "??"
				}`,
			)
			.setFields({ name: "__Reason__", value: this.reason })
			.setFooter({ text: `#${this.id}` })
			.setTitle(this.initialRSN);
	}
}
