import { URL } from "node:url";
import type { Snowflake } from "discord.js";
import {
	BLANCHY_ROLE_ID,
	CDN_URL,
	FENEKH_ROLE_ID,
	HETEPHERES_ROLE_ID,
	LUCIFURR_ROLE_ID,
	NODJMET_ROLE_ID,
	TAKHUIT_ROLE_ID,
} from "./configuration.js";
import { EMOJIS, type Emoji } from "./emojis.js";

// Soul obelisk spawn locations.
export const SOUL_OBELISK_SPAWN_LOCATION_MERCHANT = String(
	new URL("spawn_locations/soul_obelisks/merchant.webp", CDN_URL),
);

export const SOUL_OBELISK_SPAWN_LOCATION_IMPERIAL = String(
	new URL("spawn_locations/soul_obelisks/imperial.webp", CDN_URL),
);

export const SOUL_OBELISK_SPAWN_LOCATION_WORKERS = String(
	new URL("spawn_locations/soul_obelisks/worker.webp", CDN_URL),
);

export const SOUL_OBELISK_SPAWN_LOCATION_PORT = String(
	new URL("spawn_locations/soul_obelisks/port.webp", CDN_URL),
);

// Corrupted egg spawn locations.
export const CORRUPTED_EGG_SPAWN_LOCATION_MERCHANT = String(
	new URL("spawn_locations/corrupted_eggs/merchant.webp", CDN_URL),
);

export const CORRUPTED_EGG_SPAWN_LOCATION_IMPERIAL = String(
	new URL("spawn_locations/corrupted_eggs/imperial.webp", CDN_URL),
);

export const CORRUPTED_EGG_SPAWN_LOCATION_WORKERS = String(
	new URL("spawn_locations/corrupted_eggs/worker.webp", CDN_URL),
);

export const CORRUPTED_EGG_SPAWN_LOCATION_PORT = String(
	new URL("spawn_locations/corrupted_eggs/port.webp", CDN_URL),
);

export const CORRUPTED_EGG_SPAWN_LOCATION_SOUTHERN_SOPHANEM = String(
	new URL("spawn_locations/corrupted_eggs/southern_sophanem.webp", CDN_URL),
);

export const CORRUPTED_EGG_SPAWN_LOCATION_NORTHERN_SOPHANEM = String(
	new URL("spawn_locations/corrupted_eggs/northern_sophanem.webp", CDN_URL),
);

// Daily cat spawn locations.
export const DAILY_CAT_SPAWN_LOCATION_EASTERN_MERCHANT = String(
	new URL("spawn_locations/daily_cats/eastern_merchant.webp", CDN_URL),
);

export const DAILY_CAT_SPAWN_LOCATION_WESTERN_MERCHANT = String(
	new URL("spawn_locations/daily_cats/western_merchant.webp", CDN_URL),
);

export const DAILY_CAT_SPAWN_LOCATION_IMPERIAL = String(
	new URL("spawn_locations/daily_cats/imperial.webp", CDN_URL),
);

export const DAILY_CAT_SPAWN_LOCATION_WORKERS = String(
	new URL("spawn_locations/daily_cats/worker.webp", CDN_URL),
);

export const DAILY_CAT_SPAWN_LOCATION_EASTERN_PORT = String(
	new URL("spawn_locations/daily_cats/eastern_port.webp", CDN_URL),
);

export const DAILY_CAT_SPAWN_LOCATION_WESTERN_PORT = String(
	new URL("spawn_locations/daily_cats/western_port.webp", CDN_URL),
);

// Corrupted Egg Queue achievement example.
export const CORRUPTED_EGG_QUEUE_ACHIEVEMENT_EXAMPLE = String(
	new URL("requests/achievement_example.webp", CDN_URL),
);

// Allowed media types.
export const ALLOWED_MEDIA_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
export const MAXIMUM_ASSET_SIZE = 5_242_880 as const;

// View symbols.
export const SOUL_OBELISK_VIEW_SYMBOL = "⚘" as const;
export const CORRUPTED_SCARABS_VIEW_SYMBOL = "ᴥ" as const;
export const CORRUPTED_EGG_VIEW_SYMBOL = "¤" as const;

// RuneScape name length constraints.
export const MINIMUM_RSN_LENGTH = 1 as const;
export const MAXIMUM_RSN_LENGTH = 12 as const;

// Miscellaneous constants.
export const LEFT_COLOUR = 0x000000 as const;
export const HOW_TO_TAKE_A_SCREENSHOT_URL = "https://take-a-screenshot.org" as const;

export const P2P_ENGLISH_SERVERS = [
	1, 2, 4, 5, 6, 9, 10, 12, 14, 15, 16, 18, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 35, 36, 37,
	39, 40, 42, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 56, 58, 59, 60, 62, 63, 64, 65, 66, 67, 68,
	69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 96, 97, 98, 99,
	100, 103, 104, 105, 106, 114, 115, 116, 117, 119, 123, 124, 134, 137, 138, 139, 140, 252, 257,
	258, 259,
] as const;

export type P2PEnglishServers = (typeof P2P_ENGLISH_SERVERS)[number];
const P2P_GERMAN_SERVERS = [102, 121] as const;
const P2P_FRENCH_SERVERS = [118] as const;
const P2P_BRAZILIAN_SERVERS = [47, 75, 101] as const;

export const P2P_SERVERS = [
	...P2P_GERMAN_SERVERS,
	...P2P_FRENCH_SERVERS,
	...P2P_BRAZILIAN_SERVERS,
	...P2P_ENGLISH_SERVERS,
].sort((a, b) => a - b);

export const MAXIMUM_P2P_ENGLISH_SERVER_LENGTH = Math.max(...P2P_ENGLISH_SERVERS).toString().length;

export const SMALL_XP_LAMP_EXPERIENCE = {
	"1": 66.3,
	"2": 73.8,
	"3": 82.4,
	"4": 91,
	"5": 99.5,
	"6": 111.3,
	"7": 131.6,
	"8": 135.9,
	"9": 154.1,
	"10": 163.7,
	"11": 181.9,
	"12": 201.2,
	"13": 219.4,
	"14": 245,
	"15": 269.6,
	"16": 279.6,
	"17": 289.5,
	"18": 299.9,
	"19": 310.9,
	"20": 322.5,
	"21": 334.8,
	"22": 347.8,
	"23": 361.5,
	"24": 376,
	"25": 391.3,
	"26": 407.5,
	"27": 424.6,
	"28": 442.7,
	"29": 461.8,
	"30": 482,
	"31": 503.2,
	"32": 525.7,
	"33": 549.4,
	"34": 574.4,
	"35": 600.8,
	"36": 628.7,
	"37": 658.1,
	"38": 689.1,
	"39": 721.7,
	"40": 756.1,
	"41": 792.4,
	"42": 830.6,
	"43": 870.9,
	"44": 913.3,
	"45": 957.9,
	"46": 1_004.8,
	"47": 1_054.2,
	"48": 1_106.1,
	"49": 1_160.7,
	"50": 1_218.1,
	"51": 1_278.3,
	"52": 1_341.5,
	"53": 1_407.9,
	"54": 1_477.5,
	"55": 1_550.5,
	"56": 1_626.9,
	"57": 1_707,
	"58": 1_790.8,
	"59": 1_878.4,
	"60": 1_970.1,
	"61": 2_065.8,
	"62": 2_165.7,
	"63": 2_270,
	"64": 2_378.6,
	"65": 2_491.8,
	"66": 2_609.6,
	"67": 2_732.2,
	"68": 2_859.4,
	"69": 2_991.6,
	"70": 3_128.6,
	"71": 3_270.6,
	"72": 3_417.5,
	"73": 3_569.4,
	"74": 3_726.3,
	"75": 3_888.2,
	"76": 4_055,
	"77": 4_226.7,
	"78": 4_403.1,
	"79": 4_584.3,
	"80": 4_770.1,
	"81": 4_960.3,
	"82": 5_154.8,
	"83": 5_353.4,
	"84": 5_555.9,
	"85": 5_762.2,
	"86": 5_971.8,
	"87": 6_184.7,
	"88": 6_400.5,
	"89": 6_618.9,
	"90": 6_839.6,
	"91": 7_062.2,
	"92": 7_286.5,
	"93": 7_512.1,
	"94": 7_738.6,
	"95": 7_965.6,
	"96": 8_192.9,
	"97": 8_419.9,
	"98": 8_646.5,
	"99": 8_872.1,
	"100": 9_096.4,
	"101": 9_319.2,
	"102": 9_539.9,
	"103": 9_758.4,
	"104": 9_974.3,
	"105": 10_187.3,
	"106": 10_397.2,
	"107": 10_603.5,
	"108": 10_806.2,
	"109": 11_005,
	"110": 11_199.7,
	"111": 11_390.1,
	"112": 11_576.1,
	"113": 11_757.4,
	"114": 11_934.1,
	"115": 12_106,
	"116": 12_273,
	"117": 12_435.1,
	"118": 12_592.2,
	"119": 12_744.3,
	"120": 12_891.5,
} as const;

// Call.
export enum CallType {
	SoulObelisk = 0,
	CorruptedScarabs = 1,
	DailyCat = 2,
	CorruptedEgg = 3,
}

export const CallTypeToString = {
	[CallType.SoulObelisk]: "Soul obelisk",
	[CallType.CorruptedScarabs]: "Corrupted scarabs",
	[CallType.DailyCat]: "Daily cat",
	[CallType.CorruptedEgg]: "Corrupted egg",
} as const satisfies Readonly<Record<CallType, string>>;

// Friend.
export enum Rank {
	Smiley = "Smiley",
	Recruit = "Recruit",
	Corporal = "Corporal",
	Sergeant = "Sergeant",
	Lieutenant = "Lieutenant",
	Captain = "Captain",
	General = "General",
}

export const RANK_VALUES = Object.values(Rank);

// Moderation cases.
export const COMMON_BAN_REASONS = ["Tag hunter."] as const satisfies Readonly<string[]>;

export const MAXIMUM_REASON_LENGTH = 512 as const;
export const BAN_COLOUR = 0xb81e1e as const;
export const UNBAN_COLOUR = 0x4ebe84 as const;
export const KICK_COLOUR = 0xe97933 as const;
export const TIME_OUT_COLOUR = 0x448ed4 as const;

// Request.
export const enum RequestStatus {
	Active = 0,
	Claimed = 1,
	LeftGuild = 2,
	DecidedAgainstService = 3,
	HadIshhara = 4,
	Unresponsive = 5,
	NotForSelf = 6,
	UsedServiceToBuyOrSell = 7,
	ApplicationFailed = 8,
	ClaimedSelf = 9,
}

export type RequestCompletedStatus = Exclude<RequestStatus, RequestStatus.Active>;

export type RequestCompletedStatusViaUser = Exclude<
	RequestCompletedStatus,
	RequestStatus.LeftGuild
>;

export const REQUEST_CLOSE_CHOICES = [
	{ name: "Requester received a corrupted egg.", value: RequestStatus.Claimed },
	{ name: "Requester obtained their own corrupted egg.", value: RequestStatus.ClaimedSelf },
	{ name: "Requester decided against our service.", value: RequestStatus.DecidedAgainstService },
	{ name: "Requester already had Ishhara.", value: RequestStatus.HadIshhara },
	{ name: "Requester unresponsive for at least 7 days.", value: RequestStatus.Unresponsive },
	{ name: "Request not made for self.", value: RequestStatus.NotForSelf },
	{ name: "Requester bought/sold corrupted eggs.", value: RequestStatus.UsedServiceToBuyOrSell },
	{
		name: "Requester failed application for at least 3 days.",
		value: RequestStatus.ApplicationFailed,
	},
] as const satisfies Readonly<{ name: string; value: RequestCompletedStatusViaUser }[]>;

export const enum DailyCat {
	Lucifurr = "Lucifurr",
	Takhuit = "Takhuit",
	Fenekh = "Fenekh",
	Nodjmet = "Nodjmet",
	Blanchy = "Blanchy",
	Hetepheres = "Hetepheres",
}

export const DailyCatToRoleId = {
	[DailyCat.Lucifurr]: LUCIFURR_ROLE_ID,
	[DailyCat.Takhuit]: TAKHUIT_ROLE_ID,
	[DailyCat.Fenekh]: FENEKH_ROLE_ID,
	[DailyCat.Nodjmet]: NODJMET_ROLE_ID,
	[DailyCat.Blanchy]: BLANCHY_ROLE_ID,
	[DailyCat.Hetepheres]: HETEPHERES_ROLE_ID,
} as const satisfies Readonly<Record<DailyCat, Snowflake>>;

export const DailyCatToEmoji = {
	[DailyCat.Lucifurr]: EMOJIS.Lucifurr,
	[DailyCat.Takhuit]: EMOJIS.Takhuit,
	[DailyCat.Fenekh]: EMOJIS.Fenekh,
	[DailyCat.Nodjmet]: EMOJIS.Nodjmet,
	[DailyCat.Blanchy]: EMOJIS.Blanchy,
	[DailyCat.Hetepheres]: EMOJIS.Hetepheres,
} as const satisfies Readonly<Record<DailyCat, Emoji>>;

// Wiki.
export const WIKI_CATS_OF_MENAPHOS = "https://runescape.wiki/w/Cats_of_Menaphos" as const;

export const JEWELS_OF_THE_ELID_ROTATION =
	"https://runescape.wiki/w/Jewels_of_the_Elid/Rotation" as const;
