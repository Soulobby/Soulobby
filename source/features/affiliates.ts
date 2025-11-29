import {
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	ContainerBuilder,
	formatEmoji,
	MessageFlags,
	SeparatorSpacingSize,
	type Snowflake,
	TextDisplayBuilder,
} from "discord.js";
import { AFFILIATES_CHANNEL_ID, RAW_AFFILIATES_CHANNEL_ID } from "../utility/configuration.js";
import { EMOJIS } from "../utility/emojis.js";

const USER_ID_REGULAR_EXPRESSION = /(?<id>[1-9]\d{16,18})/g;

interface AffiliatesCommandOptions {
	interaction: ChatInputCommandInteraction<"cached">;
}

interface AffiliatesGatewayOptions {
	client: Client;
}

type AffiliatesOptions = AffiliatesCommandOptions | AffiliatesGatewayOptions;

export async function affiliates(options: AffiliatesOptions) {
	const interaction = "interaction" in options ? options.interaction : null;
	const client = "client" in options ? options.client : options.interaction.client;

	const messages = await client
		.channel(RAW_AFFILIATES_CHANNEL_ID, ChannelType.GuildText)
		.messages.fetch({ limit: 100 });

	if (messages.size === 0) {
		await interaction?.editReply("There appears to be no affiliate messages. This is unexpected.");
		return;
	}

	const containers = messages.reduceRight<ContainerBuilder[]>((options, message) => {
		if (message.embeds.length === 0) {
			return options;
		}

		const embed = message.embeds[0];
		const { title, description, thumbnail, fields, footer, url } = embed;

		// We require a title and a description.
		if (!(title && description)) {
			return options;
		}

		const container = new ContainerBuilder();

		const textDisplayTop: TextDisplayBuilder[] = [
			new TextDisplayBuilder().setContent(`## ${title}`),
		];

		const contacts: Snowflake[] = [];

		for (const field of fields) {
			// Deep Sea Fishing has the possession mistake.
			if (/friend'?s chat/i.test(field.name)) {
				textDisplayTop.push(
					new TextDisplayBuilder().setContent(
						`${formatEmoji(EMOJIS.FriendsChat)} **Friends chat:** ${field.value}`,
					),
				);
			}

			if (field.name === "__Contact__") {
				for (const match of field.value.matchAll(USER_ID_REGULAR_EXPRESSION)) {
					contacts.push(`<@${(match.groups as { id: Snowflake }).id}>`);
				}
			}
		}

		if (url) {
			textDisplayTop.push(
				new TextDisplayBuilder().setContent(`${formatEmoji(EMOJIS.Discord)} **Disocrd:** ${url}`),
			);
		}

		const thumbnailURL = thumbnail?.url;

		if (thumbnailURL) {
			container.addSectionComponents((section) =>
				section
					.setThumbnailAccessory((thumbnail) => thumbnail.setURL(thumbnailURL))
					.addTextDisplayComponents(textDisplayTop),
			);
		} else {
			container.addTextDisplayComponents(textDisplayTop);
		}

		container
			.addSeparatorComponents((separator) =>
				separator.setDivider().setSpacing(SeparatorSpacingSize.Small),
			)
			.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));

		if (contacts.length > 0) {
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`### Contacts\n\n${contacts.join("\n")}`),
			);
		}

		if (footer?.text) {
			container
				.addSeparatorComponents((separator) =>
					separator.setDivider().setSpacing(SeparatorSpacingSize.Small),
				)
				.addTextDisplayComponents((textDisplay) => textDisplay.setContent(`-# ${footer.text}`));
		}

		options.push(container);
		return options;
	}, []);

	if (containers.length === 0) {
		await interaction?.editReply(
			"There appears to be no valid affiliate messages. This is unexpected.",
		);

		return;
	}

	// Truncate the affiliates channel.
	const affiliates = client.channel(AFFILIATES_CHANNEL_ID, ChannelType.GuildText);
	const messagesToTruncate = await affiliates.messages.fetch({ limit: 100 });

	const messagesToBulkDelete = [];
	const messagesToNotBulkDelete = [];

	for (const messageToTruncate of messagesToTruncate.values()) {
		if (messageToTruncate.bulkDeletable) {
			messagesToBulkDelete.push(messageToTruncate);
		} else {
			messagesToNotBulkDelete.push(messageToTruncate.delete());
		}
	}

	await Promise.all([affiliates.bulkDelete(messagesToBulkDelete), ...messagesToNotBulkDelete]);

	// Send the new affiliate messages.
	for (const container of containers) {
		await affiliates.send({
			allowedMentions: { parse: [] },
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}
}
