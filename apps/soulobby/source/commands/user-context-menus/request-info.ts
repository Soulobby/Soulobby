import type { UserContextMenuCommandInteraction } from "discord.js";
import Request from "../../models/Request.js";

export default {
	name: "Request Info" as const,
	async userContextMenu(interaction: UserContextMenuCommandInteraction<"cached">) {
		await Request.informationMultiple(interaction, interaction.targetUser);
	},
} as const;
