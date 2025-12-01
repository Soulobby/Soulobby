import type { UserContextMenuCommandInteraction } from "discord.js";
import { information } from "../../features/information.js";

export default {
	name: "User Info" as const,
	async userContextMenu(interaction: UserContextMenuCommandInteraction<"cached">) {
		await information(interaction);
	},
} as const;
