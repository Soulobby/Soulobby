import type { Snowflake } from "discord.js";
import type { CorruptedEggCall, CorruptedScarabsCall, SoulObeliskCall } from "../models/Calls.js";
import { CallType, P2P_SERVERS } from "../utility/constants.js";

interface CallCacheData {
	[CallType.SoulObelisk]: SoulObeliskCall | null;
	[CallType.CorruptedScarabs]: CorruptedScarabsCall | null;
	[CallType.CorruptedEgg]: CorruptedEggCall | null;
}

export const CALL_CACHE = P2P_SERVERS.reduce<Map<(typeof P2P_SERVERS)[number], CallCacheData>>(
	(calls, world) => {
		calls.set(world, {
			[CallType.SoulObelisk]: null,
			[CallType.CorruptedScarabs]: null,
			[CallType.CorruptedEgg]: null,
		});

		return calls;
	},
	new Map<(typeof P2P_SERVERS)[number], CallCacheData>(),
);

export function findCallByMessageId(messageId: Snowflake) {
	for (const callCacheData of CALL_CACHE.values()) {
		for (const call of [
			callCacheData[CallType.SoulObelisk],
			callCacheData[CallType.CorruptedScarabs],
		]) {
			if (call?.messageId === messageId) {
				return call;
			}
		}
	}

	return null;
}

export function updateCallCache(world: (typeof P2P_SERVERS)[number], data: Partial<CallCacheData>) {
	CALL_CACHE.set(world, {
		...CALL_CACHE.get(world)!,
		...data,
	});
}
