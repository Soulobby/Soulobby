import {
	ActionRowBuilder,
	type ButtonInteraction,
	ChannelType,
	Collection,
	channelLink,
	LinkButtonBuilder,
	type Message,
	roleMention,
	type Snowflake,
	ThreadAutoArchiveDuration,
} from "discord.js";
import pg, { Table } from "../pg.js";
import {
	REPORT_TAG_ID,
	SOULOBBY_MAIL_CHANNEL_ID,
	STAR_RANK_ROLE_ID,
	TOPICS_CHANNEL_ID,
} from "../utility/configuration.js";

export interface ReportsPacket {
	user_id: Snowflake;
	user_report_thread_id: Snowflake;
	rank_report_thread_id: Snowflake | null;
}

interface ReportsData {
	userId: ReportsPacket["user_id"];
	userReportThreadId: ReportsPacket["user_report_thread_id"];
	rankReportThreadId: ReportsPacket["rank_report_thread_id"];
}

type ReportsPatchData = Pick<ReportsPacket, "rank_report_thread_id">;

export const MAIL_REPORT_BUTTON = "MAIL_SOULOBBY_REPORT" as const;

export class Report {
	public static cache = new Collection<Snowflake, Report>();

	public userId: ReportsData["userId"];

	public userReportThreadId: ReportsData["userReportThreadId"];

	public rankReportThreadId!: ReportsData["rankReportThreadId"];

	public constructor(data: ReportsPacket) {
		this.userId = data.user_id;
		this.userReportThreadId = data.user_report_thread_id;
		this.patch(data);
	}

	private patch(data: ReportsPatchData) {
		this.rankReportThreadId = data.rank_report_thread_id;
	}

	public static async createUserReportThread(interaction: ButtonInteraction<"cached">) {
		const thread = await interaction.client
			.channel(SOULOBBY_MAIL_CHANNEL_ID, ChannelType.GuildText)
			.threads.create({
				autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
				invitable: false,
				name: `Report by ${interaction.user.username}`,
				type: ChannelType.PrivateThread,
			});

		const [[reportsPacket]] = await Promise.all([
			pg<ReportsPacket>(Table.Reports)
				.insert({
					user_id: interaction.user.id,
					user_report_thread_id: thread.id,
				})
				.returning("*"),
			thread.send(
				`Hey ${interaction.user}, this is the start of your report thread.\n\nPlease post what you want to say here and it will be forwarded to us. Good reports typically include screenshots as evidence.\n\nIf necessary, we will get back to you.`,
			),
		]);

		this.cache.set(reportsPacket.user_report_thread_id, new Report(reportsPacket));

		void interaction.client.log(
			`${interaction.user} (${interaction.user.tag}) interacted with the "${interaction.component.label}" button. ${thread} created.`,
		);
	}

	private async createRankReportThread(message: Message<true>) {
		const rankReportThread = await message.client
			.channel(TOPICS_CHANNEL_ID, ChannelType.GuildForum)
			.threads.create({
				message: {
					components: [
						new ActionRowBuilder().addLinkButtonComponents(
							new LinkButtonBuilder()
								.setLabel("View user report thread")
								.setURL(channelLink(this.userReportThreadId)),
						),
					],
					content: roleMention(STAR_RANK_ROLE_ID),
				},
				name: `Report by ${message.author.username}`,
				appliedTags: [REPORT_TAG_ID],
				autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
			});

		const [reportsPacket] = await pg<ReportsPacket>(Table.Reports)
			.update({ rank_report_thread_id: rankReportThread.id })
			.where({ user_report_thread_id: this.userReportThreadId })
			.returning("*");

		this.patch(reportsPacket);
		return rankReportThread;
	}

	public async forwardMessage(message: Message<true>) {
		const rankReportThread = await this.createRankReportThread(message);
		await message.forward(rankReportThread);
	}
}
