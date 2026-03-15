import { EmbedBuilder } from "@discordjs/builders";
import { TimestampStyles } from "@discordjs/formatters";
import {
	ChannelType,
	type GuildMember,
	type PartialGuildMember,
	type User,
	UserFlags,
} from "discord.js";
import { MEMBER_LOG_CHANNEL_ID } from "../utility/configuration.js";
import { LEFT_COLOUR } from "../utility/constants.js";
import { displayAvatarURL, time } from "../utility/functions.js";

function embedTintFactor(duration: number) {
	const percent = Math.min(duration / (2_419_200_000 / 100), 100);
	let red: number;
	let green: number;
	let blue = 0;

	if (percent < 50) {
		red = 255;
		green = Math.round(5.1 * percent);
	} else {
		green = 255;
		red = Math.round(510 - 5.1 * percent);
	}

	const tintFactor = 0.3;
	red += (255 - red) * tintFactor;
	green += (255 - green) * tintFactor;
	blue += (255 - blue) * tintFactor;
	return Math.trunc((red << 16) + (green << 8) + blue);
}

export async function memberLogSendJoinLeave(
	guildMember: GuildMember | PartialGuildMember,
	join: boolean,
) {
	// Flags are present when force-fetched.
	const user = (await guildMember.client.users.fetch(guildMember.user.id, {
		cache: false,
		force: true,
	})) as User & { flags: NonNullable<User["flags"]> };

	let description = `${user.flags.has(UserFlags.Spammer) ? "⚠️ `SPAMMER`\n" : ""}${
		user.flags.has(UserFlags.Quarantined) ? "⚠️ `QUARANTINED`\n" : ""
	}User: ${user} (${user.tag})\nCreated: ${time(user.createdTimestamp, TimestampStyles.FullDateShortTime, true)}`;

	if (guildMember.joinedTimestamp) {
		description += `\nJoined: ${time(guildMember.joinedTimestamp, TimestampStyles.FullDateShortTime, true)}`;
	}

	if (join === false) {
		description += `\nLeft: ${time(Date.now(), TimestampStyles.FullDateShortTime, true)}`;
	}

	const embed = new EmbedBuilder()
		.setAuthor({
			name: user.tag,
			icon_url: displayAvatarURL(guildMember),
		})
		.setColor(join ? embedTintFactor(Date.now() - guildMember.user.createdTimestamp) : LEFT_COLOUR)
		.setDescription(description)
		.setFooter({ text: `User ${join ? "Joined" : "Left"}` })
		.setTimestamp();

	await guildMember.client.channel(MEMBER_LOG_CHANNEL_ID, ChannelType.GuildText).send({
		embeds: [embed],
	});
}
