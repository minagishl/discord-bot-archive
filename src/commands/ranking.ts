import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription(
      'Ranking of the highest number of messages posted on the current channel',
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const channel = interaction.channel; // Current Channel

      if (channel === null) {
        return await interaction.reply({
          content: 'This command must be used in a text channel.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "We're collecting messages...",
        ephemeral: true,
      });

      const count = new Map<string, number>();
      let lastMessageId: string | undefined;

      while (true) {
        // Fetch messages in chunks of 100, starting from the last fetched message
        const messages = await channel.messages.fetch({
          limit: 100,
          before: lastMessageId,
        });

        if (messages.size === 0) break; // Exit loop when no more messages are found

        messages.forEach((message) => {
          const author = message.author.tag;
          count.set(author, (count.get(author) ?? 0) + 1);
        });

        await interaction.editReply({
          content: `Collected ${count.size} users...`,
        });

        // Update the lastMessageId to fetch older messages
        lastMessageId = messages.last()?.id;
      }

      // Send to command executor
      return await interaction.editReply({
        content: `
          Ranking of the highest number of messages posted on the current channel:
          ${[...count]
            .sort((a, b) => b[1] - a[1])
            .map(([userId, messageCount], index) => {
              const user = interaction.guild?.members.cache.get(userId);
              return `${index + 1}. ${user?.user.tag ?? userId} - ${messageCount}`;
            })
            .join('\n')}
        `,
      });
    } catch (error) {
      console.error(error);
      return await interaction.editReply({
        content: 'An error occurred while saving messages.',
      });
    }
  },
};
