import { Buffer } from "node:buffer";
import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	formatEmoji,
	MessageFlags,
	TimestampStyles,
	type User,
	UserContextMenuCommandInteraction,
	UserFlags,
} from "discord.js";
import { EMOJIS } from "../utility/emojis.js";
import { displayAvatarURL, time } from "../utility/functions.js";

export async function information(
	interaction: ChatInputCommandInteraction<"cached"> | UserContextMenuCommandInteraction<"cached">,
) {
	await interaction.deferReply({
		flags:
			interaction instanceof UserContextMenuCommandInteraction ? MessageFlags.Ephemeral : undefined,
	});

	const guildMember = interaction.options.getMember("user");

	// Flags are present when force-fetched.
	const user = (await interaction.client.users.fetch(interaction.options.getUser("user", true), {
		cache: guildMember !== null,
		force: true,
	})) as User & { flags: NonNullable<User["flags"]> };

	const userFlags = user.flags;
	const flags: string[] = [];

	// These user flags (badges) are ordered from the user profile.
	if (userFlags.has(UserFlags.Staff)) {
		flags.push(formatEmoji(EMOJIS.DiscordStaff));
	}

	if (userFlags.has(UserFlags.Partner)) {
		flags.push(formatEmoji(EMOJIS.PartneredServerOwner));
	}

	if (userFlags.has(UserFlags.CertifiedModerator)) {
		flags.push(formatEmoji(EMOJIS.ModeratorProgramsAlumni));
	}

	if (userFlags.has(UserFlags.Hypesquad)) {
		flags.push(formatEmoji(EMOJIS.HypeSquadEvents));
	}

	if (userFlags.has(UserFlags.HypeSquadOnlineHouse1)) {
		flags.push(formatEmoji(EMOJIS.HypeSquadBravery));
	}

	if (userFlags.has(UserFlags.HypeSquadOnlineHouse2)) {
		flags.push(formatEmoji(EMOJIS.HypeSquadBrilliance));
	}

	if (userFlags.has(UserFlags.HypeSquadOnlineHouse3)) {
		flags.push(formatEmoji(EMOJIS.HypeSquadBalance));
	}

	if (userFlags.has(UserFlags.BugHunterLevel1)) {
		flags.push(formatEmoji(EMOJIS.DiscordBugHunter));
	}

	if (userFlags.has(UserFlags.BugHunterLevel2)) {
		flags.push(formatEmoji(EMOJIS.GoldenDiscordBugHunter));
	}

	if (userFlags.has(UserFlags.ActiveDeveloper)) {
		flags.push(formatEmoji(EMOJIS.ActiveDeveloper));
	}

	if (userFlags.has(UserFlags.VerifiedDeveloper)) {
		flags.push(formatEmoji(EMOJIS.EarlyVerifiedBotDeveloper));
	}

	if (userFlags.has(UserFlags.PremiumEarlySupporter)) {
		flags.push(formatEmoji(EMOJIS.EarlySupporter));
	}

	// Parse the rest of the user flags.
	const teamUser = userFlags.has(UserFlags.TeamPseudoUser);
	const verifiedBot = userFlags.has(UserFlags.VerifiedBot);

	if (userFlags.has(UserFlags.Spammer)) {
		flags.push(`${flags.length === 0 ? "" : "\n"}⚠️ \`SPAMMER\``);
	}

	if (userFlags.has(UserFlags.Quarantined)) {
		flags.push(`${flags.length === 0 ? "" : "\n"}⚠️ \`QUARANTINED\``);
	}

	const displayingText = `Displaying the profile of ${user}.`;
	const userIdText = `Id: \`${user.id}\``;
	const userCreationDateText = `Created: ${time(user.createdTimestamp, TimestampStyles.FullDateShortTime, true)}`;
	let guildMemberJoinedTimestampText = "";
	let guildMemberPremiumSinceTimestampText = "";

	if (guildMember !== null) {
		guildMemberJoinedTimestampText =
			guildMember.joinedTimestamp === null
				? ""
				: `\nJoined Server: ${time(guildMember.joinedTimestamp, TimestampStyles.FullDateShortTime, true)}`;

		guildMemberPremiumSinceTimestampText =
			guildMember.premiumSinceTimestamp === null
				? ""
				: `\nServer Boosting: ${time(guildMember.premiumSinceTimestamp, TimestampStyles.FullDateShortTime, true)}`;
	}

	// Default avatar icons do not have a question mark.
	const userAvatar = displayAvatarURL(user);
	const perServerAvatar = guildMember?.avatarURL({ extension: "webp", size: 4_096 }) ?? null;
	const footerAvatar = displayAvatarURL(interaction.member);
	const banner = user.bannerURL({ extension: "webp", size: 4_096 });
	const thumbnailAvatar = perServerAvatar ?? userAvatar;
	const tick = formatEmoji(EMOJIS.Tick);
	const cross = formatEmoji(EMOJIS.Cross);

	const embed = new EmbedBuilder()
		.setAuthor({
			name: user.tag,
			icon_url: `attachment://${user.id}_user.${userAvatar.slice(
				userAvatar.lastIndexOf(".") + 1,
				userAvatar.includes("?") ? userAvatar.indexOf("?") : userAvatar.length,
			)}`,
		})
		.setColor((await interaction.client.guild.members.fetchMe()).displayColor)
		.setDescription(
			`${displayingText}\n\n${userIdText}\n${userCreationDateText}${guildMemberJoinedTimestampText}${guildMemberPremiumSinceTimestampText}`,
		)
		.setFields(
			{
				name: "Flags",
				value: flags.length > 0 ? flags.join(" ") : "None",
			},
			{
				name: "Roles",
				value:
					guildMember && guildMember.roles.cache.size > 1
						? guildMember.roles.cache
								.filter(({ id }) => id !== guildMember.guild.roles.everyone.id)
								.sort((a, b) => b.position - a.position)
								.map(String)
								.join(" ")
						: "None",
			},
			{
				name: "Bot",
				value: user.bot ? tick : cross,
				inline: true,
			},
		)
		.setFooter({
			text: `Requested by ${interaction.user.tag}`,
			icon_url: `attachment://${interaction.user.id}_footer.${footerAvatar.slice(
				footerAvatar.lastIndexOf(".") + 1,
				footerAvatar.includes("?") ? footerAvatar.indexOf("?") : footerAvatar.length,
			)}`,
		})
		.setTimestamp()
		.setThumbnail(
			`attachment://${user.id}_thumbnail.${thumbnailAvatar.slice(
				thumbnailAvatar.lastIndexOf(".") + 1,
				thumbnailAvatar.includes("?") ? thumbnailAvatar.indexOf("?") : thumbnailAvatar.length,
			)}`,
		);

	if (user.bot) {
		embed.addFields({ name: "Verified Bot", value: verifiedBot ? tick : cross, inline: true });
	}

	embed.addFields({ name: "Team User", value: teamUser ? tick : cross, inline: true });

	if (guildMember !== null) {
		embed.addFields(
			{ name: "Pending", value: guildMember.pending ? tick : cross, inline: true },
			{ name: "Nickname", value: guildMember.nickname ?? cross, inline: true },
		);
	}

	embed.addFields({ name: "Avatar URL", value: `[Avatar URL](${userAvatar})`, inline: true });

	if (perServerAvatar !== null) {
		embed.addFields({
			name: "Per-Server Avatar URL",
			value: `[Per-Server Avatar URL](${perServerAvatar})`,
			inline: true,
		});
	}

	const [footerAvatarData, thumbnailAvatarData, userAvatarData, bannerData] = await Promise.all([
		fetch(footerAvatar).then(async (response) => Buffer.from(await response.arrayBuffer())),
		fetch(thumbnailAvatar).then(async (response) => Buffer.from(await response.arrayBuffer())),
		fetch(userAvatar).then(async (response) => Buffer.from(await response.arrayBuffer())),
		banner
			? fetch(banner).then(async (response) => Buffer.from(await response.arrayBuffer()))
			: null,
	]);

	const files = [
		{
			name: `${interaction.user.id}_footer.${footerAvatar.slice(
				footerAvatar.lastIndexOf(".") + 1,
				footerAvatar.includes("?") ? footerAvatar.indexOf("?") : footerAvatar.length,
			)}`,
			attachment: footerAvatarData,
		},
		{
			name: `${user.id}_thumbnail.${thumbnailAvatar.slice(
				thumbnailAvatar.lastIndexOf(".") + 1,
				thumbnailAvatar.includes("?") ? thumbnailAvatar.indexOf("?") : thumbnailAvatar.length,
			)}`,
			attachment: thumbnailAvatarData,
		},
		{
			name: `${user.id}_user.${userAvatar.slice(
				userAvatar.lastIndexOf(".") + 1,
				userAvatar.includes("?") ? userAvatar.indexOf("?") : userAvatar.length,
			)}`,
			attachment: userAvatarData,
		},
	];

	if (banner && bannerData) {
		embed
			.addFields({ name: "Banner URL", value: `[Banner URL](${banner})`, inline: true })
			.setImage(
				`attachment://${user.id}_banner.${banner.slice(banner.lastIndexOf(".") + 1, banner.indexOf("?"))}`,
			);

		files.push({
			name: `${user.id}_banner.${banner.slice(banner.lastIndexOf(".") + 1, banner.indexOf("?"))}`,
			attachment: bannerData,
		});
	}

	await interaction.editReply({ embeds: [embed], files });
}
