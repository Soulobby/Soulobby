import {
	ChannelType,
	type Client,
	Collection,
	Events,
	type Message,
	type Snowflake,
	type TextChannel,
} from "discord.js";
import croner from "../croner.js";
import { healthCheck as rotationsHealthCheck } from "../features/rotations.js";
import {
	CorruptedEggCall,
	type CorruptedEggPacket,
	createCallFromMessage,
	updateCallsView,
	updateCorruptedEggLogView,
	updateCorruptedView,
} from "../models/Calls.js";
import Request from "../models/Request.js";
import pg, { Table } from "../pg.js";
import { CALLS_CHANNEL_ID } from "../utility/configuration.js";
import { CallType } from "../utility/constants.js";
import { isP2PServer } from "../utility/functions.js";
import type { Event } from "./index.js";

const name = Events.ClientReady;

async function healthCheck(client: Client<true>) {
	await Promise.all([Request.healthCheck(client), rotationsHealthCheck(client)]);
}

async function collectCalls(client: Client<true>) {
	const fetchMessages = async (
		channel: TextChannel,
		messages = new Collection<Snowflake, Message<true>>(),
		before?: Snowflake,
	): Promise<Collection<Snowflake, Message<true>>> => {
		const fetchedMessages = (await channel.messages.fetch({ limit: 100, before })).filter(
			(message) => !message.reactions.resolve("❌")?.me,
		);

		const collectedMessages = messages.concat(fetchedMessages);

		return fetchedMessages.size === 100
			? fetchMessages(channel, collectedMessages, fetchedMessages.lastKey())
			: collectedMessages;
	};

	const messages = await fetchMessages(client.channel(CALLS_CHANNEL_ID, ChannelType.GuildText));

	for (const message of messages.reverse().values()) {
		const call = createCallFromMessage(message.content);

		if (call && (call.type === CallType.SoulObelisk || call.type === CallType.CorruptedScarabs)) {
			await call.handle(message, false);
		}
	}

	await updateCallsView(client);
}

async function collectCorruptedEggs(client: Client<true>) {
	const packets = await pg<CorruptedEggPacket>(Table.CorruptedEggs).where(
		"timestamp",
		">=",
		new Date(Date.now() - 50_400_000),
	);

	for (const packet of packets) {
		if (isP2PServer(packet.world)) {
			const call = new CorruptedEggCall({
				world: packet.world,
				location: packet.location,
				playerName: packet.logged_for,
			});

			call.handle(client, packet.timestamp.getTime());
		}
	}

	const lastCorruptedEgg = packets[packets.length - 1];
	const promises: Promise<unknown>[] = [];

	if (lastCorruptedEgg) {
		promises.push(updateCorruptedEggLogView(client, lastCorruptedEgg.timestamp.getTime()));
	}

	promises.push(updateCorruptedView(client));
	await Promise.all(promises);
}

export default {
	name,
	once: true,
	async fire(client) {
		await Promise.all([healthCheck(client), collectCalls(client), collectCorruptedEggs(client)]);
		croner(client);
	},
} satisfies Event<typeof name>;
