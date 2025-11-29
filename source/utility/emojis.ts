import type { Snowflake } from "discord.js";
import { PRODUCTION } from "./configuration.js";

export interface Emoji {
	name: string;
	id: Snowflake;
	animated?: boolean;
}

export const EMOJIS = PRODUCTION
	? ({
			Scarabs: { name: "scarabs", id: "1365326385794646016" },
			Menaphos: { name: "menaphos", id: "1365326388059439135" },
			VIP: { name: "vip", id: "1365326390471168022" },
			Tick: { name: "tick", id: "1365326392434233477" },
			Cross: { name: "cross", id: "1365326395114389614" },
			Sophanem: { name: "sophanem", id: "1365326397287174244" },
			DiscordStaff: { name: "discord_staff", id: "1365326412978065529" },
			PartneredServerOwner: { name: "partnered_server_owner", id: "1365326415347712132" },
			HypeSquadEvents: { name: "hypesquad_events", id: "1365326418149642444" },
			DiscordBugHunter: { name: "discord_bug_hunter", id: "1365326420288602142" },
			HypeSquadBravery: { name: "hypesquad_bravery", id: "1365326422499004567" },
			HypeSquadBrilliance: { name: "hypesquad_brilliance", id: "1365326425275760640" },
			HypeSquadBalance: { name: "hypesquad_balance", id: "1365326427855130696" },
			EarlySupporter: { name: "early_supporter", id: "1365326430468309094" },
			GoldenDiscordBugHunter: { name: "golden_discord_bug_hunter", id: "1365326432883966054" },
			ModeratorProgramsAlumni: { name: "moderator_programmes_alumni", id: "1365326439611629660" },
			EarlyVerifiedBotDeveloper: {
				name: "early_verified_bot_developer",
				id: "1365326442522480680",
			},
			ActiveDeveloper: { name: "active_developer", id: "1365326444951240888" },
			CorruptedEgg: { name: "corrupted_egg", id: "1365326449472704542" },
			SoulObelisk: { name: "soul_obelisk", id: "1365331178537619517" },
			Discord: { name: "discord", id: "1365342635228659765" },
			GIMLevels: { name: "gim_levels", id: "1365347863386656860" },
			GIMXP: { name: "gim_xp", id: "1365347864225644555" },
			FriendsChat: { name: "friends_chat", id: "1365351046159007786" },
			Blanchy: { name: "blanchy", id: "1365361798521421845" },
			Fenekh: { name: "fenekh", id: "1365361803571232820" },
			Hetepheres: { name: "hetepheres", id: "1365361806259781704" },
			Lucifurr: { name: "lucifurr", id: "1365361813083914322" },
			Nodjmet: { name: "nodjmet", id: "1365361815370072076" },
			Takhuit: { name: "takhuit", id: "1365361827831349290" },
			ApmekenAmethyst: { name: "apmeken_amethyst", id: "1365368821203996885" },
			ScabariteCrystal: { name: "scabarite_crystal", id: "1365368835691249674" },
			MenaphiteGiftOfferingSmall: {
				name: "menaphite_gift_offering_small",
				id: "1371413796303667220",
			},
			MenaphiteGiftOfferingMedium: {
				name: "menaphite_gift_offering_medium",
				id: "1371413825882165259",
			},
			MenaphiteGiftOfferingLarge: {
				name: "menaphite_gift_offering_large",
				id: "1371413844840157194",
			},
			PurrnOfPreviousPostcat: { name: "purrn_of_previous_postcat", id: "1414238096853303429" },
		} as const satisfies Readonly<Record<string, Emoji>>)
	: ({
			Scarabs: { name: "scarabs", id: "1365329161975107654" },
			Menaphos: { name: "menaphos", id: "1365329163568807976" },
			VIP: { name: "vip", id: "1365329164739154032" },
			Tick: { name: "tick", id: "1365329166198640771" },
			Cross: { name: "cross", id: "1365329167683420282" },
			Sophanem: { name: "sophanem", id: "1365329168979464243" },
			DiscordStaff: { name: "discord_staff", id: "1365329170313379964" },
			PartneredServerOwner: { name: "partnered_server_owner", id: "1365329171529732218" },
			HypeSquadEvents: { name: "hypesquad_events", id: "1365329172439892081" },
			DiscordBugHunter: { name: "discord_bug_hunter", id: "1365329174209892415" },
			HypeSquadBravery: { name: "hypesquad_bravery", id: "1365329175971364976" },
			HypeSquadBrilliance: { name: "hypesquad_brilliance", id: "1365329177913458809" },
			HypeSquadBalance: { name: "hypesquad_balance", id: "1365329179763146823" },
			EarlySupporter: { name: "early_supporter", id: "1365329181256323274" },
			GoldenDiscordBugHunter: { name: "golden_discord_bug_hunter", id: "1365329182606757932" },
			ModeratorProgramsAlumni: { name: "moderator_programmes_alumni", id: "1365329184221696184" },
			EarlyVerifiedBotDeveloper: {
				name: "early_verified_bot_developer",
				id: "1365329185597296694",
			},
			ActiveDeveloper: { name: "active_developer", id: "1365329186822029354" },
			CorruptedEgg: { name: "corrupted_egg", id: "1365329190068424754" },
			SoulObelisk: { name: "soul_obelisk", id: "1365330727503138856" },
			Discord: { name: "discord", id: "1365342671069118586" },
			GIMLevels: { name: "gim_levels", id: "1365347501871464570" },
			GIMXP: { name: "gim_xp", id: "1365347503880278138" },
			FriendsChat: { name: "friends_chat", id: "1365351103813783653" },
			Blanchy: { name: "blanchy", id: "1365362327700115549" },
			Fenekh: { name: "fenekh", id: "1365362330267029504" },
			Hetepheres: { name: "hetepheres", id: "1365362331629916240" },
			Lucifurr: { name: "lucifurr", id: "1365362335773884486" },
			Nodjmet: { name: "nodjmet", id: "1365362337103614105" },
			Takhuit: { name: "takhuit", id: "1365362345198485534" },
			ApmekenAmethyst: { name: "apmeken_amethyst", id: "1365368589829410816" },
			ScabariteCrystal: { name: "scabarite_crystal", id: "1365368607437099175" },
			MenaphiteGiftOfferingSmall: {
				name: "menaphite_gift_offering_small",
				id: "1371413810136616981",
			},
			MenaphiteGiftOfferingMedium: {
				name: "menaphite_gift_offering_medium",
				id: "1371413835336126504",
			},
			MenaphiteGiftOfferingLarge: {
				name: "menaphite_gift_offering_large",
				id: "1371413853564567552",
			},
			PurrnOfPreviousPostcat: { name: "purrn_of_previous_postcat", id: "1414238345793507449" },
		} as const satisfies Readonly<Record<string, Emoji>>);
