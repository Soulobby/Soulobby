import type { Client } from "discord.js";

export default abstract class {
	protected readonly client: Client;

	protected constructor(client: Client) {
		this.client = client;
	}
}
