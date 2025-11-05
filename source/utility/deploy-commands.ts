import {
	type APIApplicationCommandAttachmentOption,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ApplicationIntegrationType,
	ChannelType,
	InteractionContextType,
	REST,
	type RESTPostAPIApplicationCommandsJSONBody,
	Routes,
} from "discord.js";
import { QuestTitle } from "runescape";
import { CallLocationToString, CORRUPTED_EGG_CALL_LOCATIONS } from "../models/Calls.js";
import { APPLICATION_ID, DISCORD_TOKEN } from "./configuration.js";
import {
	MAXIMUM_REASON_LENGTH,
	MAXIMUM_RSN_LENGTH,
	MINIMUM_RSN_LENGTH,
	P2P_SERVERS,
	RANK_VALUES,
	REQUEST_CLOSE_CHOICES,
} from "./constants.js";

function evidenceOptionData() {
	const evidence: APIApplicationCommandAttachmentOption[] = [];

	for (let No = 0; No < 10; No++) {
		evidence.push({
			type: ApplicationCommandOptionType.Attachment,
			name: `evidence-${No + 1}`,
			description: "A piece of evidence.",
			required: false,
		} as const);
	}

	return evidence;
}

const rankChoices = RANK_VALUES.map((rank) => ({ name: rank, value: rank }));

const COMMANDS: RESTPostAPIApplicationCommandsJSONBody[] = [
	{
		name: "ban",
		description: "Ban an account.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "The account to ban.",
				required: true,
			},
			{
				type: ApplicationCommandOptionType.Integer,
				name: "delete-message-time",
				description: "A specified period of time to delete messages.",
				required: false,
				choices: [
					{ name: "1 hour", value: 3_600 },
					{ name: "3 hours", value: 10_800 },
					{ name: "6 hours", value: 21_600 },
					{ name: "1 day", value: 86_400 },
					{ name: "2 days", value: 172_800 },
					{ name: "3 days", value: 259_200 },
					{ name: "4 days", value: 345_600 },
					{ name: "5 days", value: 432_000 },
					{ name: "6 days", value: 518_400 },
					{ name: "7 days", value: 604_800 },
				],
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "reason",
				description: "The reason for this ban.",
				max_length: MAXIMUM_REASON_LENGTH,
				autocomplete: true,
				required: false,
			},
			{
				type: ApplicationCommandOptionType.Channel,
				name: "topics-thread",
				description: "The thread to link.",
				channel_types: [ChannelType.PublicThread],
				required: false,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "case",
		description: "The command to manage cases.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.SubcommandGroup,
				name: "discord",
				description: "Manage cases for Discord.",
				options: [
					{
						type: ApplicationCommandOptionType.Subcommand,
						name: "edit",
						description: "Edit a case.",
						options: [
							{
								type: ApplicationCommandOptionType.Integer,
								name: "case",
								description: "The case number to edit.",
								required: true,
								autocomplete: true,
								max_value: 2_147_483_647,
								min_value: 1,
							},
							{
								type: ApplicationCommandOptionType.String,
								name: "reason",
								description: "Edit the reason.",
								max_length: MAXIMUM_REASON_LENGTH,
								required: false,
							},
							{
								type: ApplicationCommandOptionType.Channel,
								name: "topics-thread",
								description: "Edit the linked thread.",
								channel_types: [ChannelType.PublicThread],
								required: false,
							},
						],
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "clan",
		description: "Returns the clan of an account.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "name-1",
				description: "The RSN to return the clan of.",
				required: true,
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-2",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-3",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-4",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-5",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-6",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-7",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-8",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-9",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "name-10",
				description: "The RSN to return the clan of.",
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "custom-status",
		description: "Sets the custom status.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "text",
				description: "The text to use.",
				required: true,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "data",
		description: "Returns Soulobby's data about you.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Integer,
				name: "number",
				description: "The rank number to return data about.",
				required: false,
				min_value: 1,
			},
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "The user to return data about.",
				required: false,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "egg",
		description: "Commands for corrupted eggs.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "edit",
				description: "Edits a corrupted egg's data.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The corrupted egg # to edit.",
						min_value: 1,
						required: true,
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "world",
						description: "The world of the corrupted egg.",
						required: true,
						max_value: Math.max(...P2P_SERVERS),
						min_value: Math.min(...P2P_SERVERS),
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "location",
						description: "The location of the corrupted egg.",
						required: true,
						choices: CORRUPTED_EGG_CALL_LOCATIONS.map((location) => ({
							name: CallLocationToString[location],
							value: location,
						})),
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "name",
						description:
							"The RSN of the account that found it. If this is oneself, omit this parameter.",
						required: false,
						max_length: MAXIMUM_RSN_LENGTH,
						min_length: MINIMUM_RSN_LENGTH,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "info",
				description: "Returns information about a corrupted egg.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The corrupted egg # to return information about.",
						required: true,
						min_value: 1,
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "friend",
		description: "Commands related to the friends list.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "add",
				description: "Adds an account to the friends list.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "name",
						description: "The RSN of the account to add.",
						required: true,
						max_length: MAXIMUM_RSN_LENGTH,
						min_length: MINIMUM_RSN_LENGTH,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "rank",
						description: "The rank to give the account.",
						required: true,
						choices: rankChoices,
					},
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "The Discord account to link.",
						required: false,
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "main",
						description: "The rank number of the main account for this account.",
						required: false,
						min_value: 1,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "edit",
				description: "Edits an account's data.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The rank number to edit the data of.",
						required: true,
						min_value: 1,
					},
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "The Discord account to link.",
						required: false,
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "main",
						description: "The rank number of the main account for this account.",
						required: false,
						min_value: 1,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "current-name",
						description: "The current RSN for this account.",
						required: false,
						max_length: MAXIMUM_RSN_LENGTH,
						min_length: MINIMUM_RSN_LENGTH,
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "derank-timestamp",
						description: "The derank timestamp for this account.",
						required: false,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "reason",
						description: "The reason of the derank for this account.",
						required: false,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "rank",
				description: "Promotes or demotes an account accordingly.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The rank number to promote or demote.",
						required: true,
						min_value: 1,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "rank",
						description: "The rank to change to.",
						required: true,
						choices: rankChoices,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "remove",
				description: "Removes an account from the friends list.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The rank number to remove.",
						required: true,
						min_value: 1,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "reason",
						description: "The reason for the removal.",
						required: true,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "unset",
				description: "Unsets the specified data for an account on the friends list.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The rank number to unset data of.",
						required: true,
						min_value: 1,
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "user",
						description: "Whether to unset the Discord account.",
						required: false,
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "main",
						description: "Whether to unset the main account.",
						required: false,
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "ignore",
		description: "Commands related to the ignore list.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "add",
				description: "Adds an account to the ignore list.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "name",
						description: "The RSN of the account to add.",
						required: true,
						max_length: MAXIMUM_RSN_LENGTH,
						min_length: MINIMUM_RSN_LENGTH,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "reason",
						description: "The reason for this add.",
						required: true,
					},
					...evidenceOptionData(),
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "edit",
				description: "Edits an account's data.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The ignore number to edit the data of.",
						min_value: 1,
						required: true,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "current-name",
						description: "The current RSN for this account.",
						required: false,
						max_length: MAXIMUM_RSN_LENGTH,
						min_length: MINIMUM_RSN_LENGTH,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "reason",
						description: "The reason of the ban for this account.",
						required: false,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.SubcommandGroup,
				name: "evidence",
				description: "The evidence command for the ignore list.",
				options: [
					{
						type: ApplicationCommandOptionType.Subcommand,
						name: "add",
						description: "Adds evidence to an account on the ignore list.",
						options: [
							{
								type: ApplicationCommandOptionType.Integer,
								name: "number",
								description: "The ignore number to add evidence of.",
								min_value: 1,
								required: true,
							},
							...evidenceOptionData(),
						],
					},
					{
						type: ApplicationCommandOptionType.Subcommand,
						name: "remove",
						description: "Removes evidence from an account on the ignore list.",
						options: [
							{
								type: ApplicationCommandOptionType.Integer,
								name: "number",
								description: "The ignore number to remove evidence from.",
								min_value: 1,
								required: true,
							},
						],
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "remove",
				description: "Removes an account from the ignore list.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The ignore number to remove.",
						min_value: 1,
						required: true,
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "information",
		description: "Returns information about a Discord account.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "The Discord account to return information about.",
				required: true,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "kick",
		description: "Kicks an account.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "The account to kick.",
				required: true,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "reason",
				description: "The reason for this kick.",
				max_length: MAXIMUM_REASON_LENGTH,
				required: false,
			},
			{
				type: ApplicationCommandOptionType.Channel,
				name: "topics-thread",
				description: "The thread to link.",
				channel_types: [ChannelType.PublicThread],
				required: false,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "lookup",
		description: "Looks up HiScore data, Menaphos access & the clan of an account.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "name",
				description: "The RSN to look up.",
				required: true,
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "purge",
		description: "Purges messages in a channel.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "until",
				description: "Purges messages to the desired message id or number.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "id",
						description: "The message id to purge until.",
						required: false,
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The number of messages to delete.",
						required: false,
						max_value: 100,
						min_value: 1,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "between",
				description: "Purges messages between (and including) two message ids.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "id-1",
						description: "The first message id.",
						required: true,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "id-2",
						description: "The second message id.",
						required: true,
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "quest",
		description: "Checks if an account has completed a quest.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "name",
				description: "The RSN to check.",
				required: true,
				max_length: MAXIMUM_RSN_LENGTH,
				min_length: MINIMUM_RSN_LENGTH,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "quest",
				description: "The quest to check.",
				autocomplete: true,
				required: true,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "reputation",
		description: "Commands regarding reputation",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "calculate",
				description: "Calculates Menaphos reputation.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "initial",
						description: "The initial value of reputation.",
						required: true,
						max_value: 1_200_000,
						min_value: 4_000,
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "final",
						description: "The final value of reputation.",
						required: true,
						max_value: 1_200_000,
						min_value: 4_000,
					},
					{
						type: ApplicationCommandOptionType.Number,
						name: "quest",
						description: "The highest Menaphos quest you have completed.",
						required: true,
						choices: [
							{ name: QuestTitle.TheJackOfSpades, value: 1.25 },
							{ name: QuestTitle.CrocodileTears, value: 1.5 },
							{ name: QuestTitle.OurManInTheNorth, value: 1.75 },
							{ name: QuestTitle.PhiteClub, value: 2 },
							{ name: QuestTitle.PharaohsFolly, value: 2.5 },
						],
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "information",
				description: "Returns Menaphos reputation information about an account.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "name",
						description: "The RSN to return Menaphos reputation information about.",
						required: true,
						max_length: MAXIMUM_RSN_LENGTH,
						min_length: MINIMUM_RSN_LENGTH,
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "Request Info",
		type: ApplicationCommandType.User,
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "request",
		description: "Commands related to the Corrupted Egg Queue.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "allow",
				description: "Allows a user to bypass the checks to open a new request.",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "member",
						description: "The member to allow bypassing for.",
						required: true,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "close",
				description: "Closes a request.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "reason",
						description: "The close reason to use.",
						required: false,
						choices: [...REQUEST_CLOSE_CHOICES],
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "delay",
						description: "Whether to delay closing the request for one minute.",
						required: false,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "edit",
				description: "Edits a request channel's data.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "The request number to edit the data of.",
						required: true,
						min_value: 1,
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "reason",
						description: "The close reason to use.",
						required: false,
						choices: [...REQUEST_CLOSE_CHOICES],
					},
					{
						type: ApplicationCommandOptionType.Integer,
						name: "completion-timestamp",
						description: "The completion timestamp to use.",
						required: false,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "info",
				description: "Brings up information about a requester.",
				options: [
					{
						type: ApplicationCommandOptionType.Integer,
						name: "number",
						description: "A request number.",
						required: false,
						min_value: 1,
					},
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "A user.",
						required: false,
					},
					{
						type: ApplicationCommandOptionType.Channel,
						name: "channel",
						description: "A channel.",
						required: false,
						channel_types: [ChannelType.GuildText],
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "verify",
				description: "Verifies a request.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "name",
						description: "The RSN of the requester.",
						max_length: MAXIMUM_RSN_LENGTH,
						min_length: MINIMUM_RSN_LENGTH,
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "premier-club",
						description: "Does the requester have Premier Membership?",
					},
					{
						type: ApplicationCommandOptionType.Boolean,
						name: "sophanem",
						description: "Does the requester have Sophanem access?",
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "snowflake",
		description: "Snowflake utility commands.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "deconstruct",
				description: "Deconstructs a snowflake.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "snowflake",
						description: "The snowflake to deconstruct.",
						required: true,
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "difference",
				description: "Returns the difference in time between two snowflakes.",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "snowflake-1",
						description: "The first snowflake to use.",
						required: true,
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "snowflake-2",
						description: "The second snowflake to use.",
						required: true,
					},
				],
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "time-out",
		description: "Times out an account.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "The account to time out.",
				required: true,
			},
			{
				type: ApplicationCommandOptionType.Integer,
				name: "duration",
				description: "How long the time-out should last.",
				required: true,
				choices: [
					{ name: "1 hour", value: 3_600 },
					{ name: "3 hours", value: 10_800 },
					{ name: "6 hours", value: 21_600 },
					{ name: "1 day", value: 86_400 },
					{ name: "2 days", value: 172_800 },
					{ name: "3 days", value: 259_200 },
					{ name: "4 days", value: 345_600 },
					{ name: "5 days", value: 432_000 },
					{ name: "6 days", value: 518_400 },
					{ name: "7 days", value: 604_800 },
				],
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "reason",
				description: "The reason for this time-out.",
				max_length: MAXIMUM_REASON_LENGTH,
				required: false,
			},
			{
				type: ApplicationCommandOptionType.Channel,
				name: "topics-thread",
				description: "The thread to link.",
				channel_types: [ChannelType.PublicThread],
				required: false,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "unban",
		description: "Unbans an account.",
		type: ApplicationCommandType.ChatInput,
		options: [
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "The account to unban.",
				required: true,
			},
			{
				type: ApplicationCommandOptionType.String,
				name: "reason",
				description: "The reason for this ban.",
				max_length: MAXIMUM_REASON_LENGTH,
				required: true,
			},
			{
				type: ApplicationCommandOptionType.Channel,
				name: "topics-thread",
				description: "The thread to link.",
				channel_types: [ChannelType.PublicThread],
				required: true,
			},
		],
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
	{
		name: "User Info",
		type: ApplicationCommandType.User,
		integration_types: [ApplicationIntegrationType.GuildInstall],
		contexts: [InteractionContextType.Guild],
	},
] as const;

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
console.log("Setting application commands...");

try {
	await rest.put(Routes.applicationCommands(APPLICATION_ID), { body: COMMANDS });
	console.log("Successfully set application commands.");
} catch (error) {
	console.error(error, "Error setting commands.");
}
