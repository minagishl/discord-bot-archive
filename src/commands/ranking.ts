import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  type AnyThreadChannel,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ranking')
    .setDescription(
      'Ranking of the highest number of messages posted on the current channel',
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((option) =>
      option
        .setName('ephemeral')
        .setDescription('Whether the reply should be ephemeral.')
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('all')
        .setDescription('Whether to include all channel messages.')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const channel = interaction.channel as TextChannel;
      const isAll = interaction.options.getBoolean('all') ?? false;

      if (channel === null) {
        return await interaction.reply({
          content: 'This command must be used in a text channel.',
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "We're collecting messages...",
        ephemeral: interaction.options.getBoolean('ephemeral') ?? true,
      });

      const count = new Map<string, number>();

      if (isAll && interaction.guild !== null) {
        const channels = interaction.guild.channels.cache.filter(
          (ch): ch is TextChannel =>
            ch.type === 15 || // ForumChannel
            ch.type === 11 || // ThreadChannel
            ch.type === 5 || // GuildNewsChannel
            ch.type === 2 || // VoiceChannel (TextChannel)
            ch.type === 0, // TextChannel
        );

        for (const channel of channels.values()) {
          // Fetch messages from threads
          if ('threads' in channel) {
            const threads = await channel.threads.fetch();
            for (const thread of threads.threads.values()) {
              await processChannel(thread, count, interaction);
            }
          }
          await processChannel(channel, count, interaction);
        }
      }

      // Generate ranking message
      let rankingMessage = `
          Ranking of the highest number of messages posted on ${isAll ? 'all channels' : 'the current channel'}:
          ${[...count]
            .sort((a, b) => b[1] - a[1])
            .map(([userId, messageCount], index) => {
              const user = interaction.guild?.members.cache.get(userId);
              return `${index + 1}. ${user?.user.tag ?? userId} - ${messageCount}`;
            })
            .join('\n')}
        `;

      if (rankingMessage.length > 2000) {
        rankingMessage = rankingMessage.substring(0, 1997) + '...';
      }

      return await interaction.editReply({
        content: rankingMessage,
      });
    } catch (error) {
      console.error(error);
      return await interaction.editReply({
        content: 'An error occurred while collecting messages.',
      });
    }
  },
};

async function processChannel(
  channel: TextChannel | AnyThreadChannel,
  count: Map<string, number>,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  let lastMessageId: string | undefined;

  while (true) {
    const messages = await channel.messages.fetch({
      limit: 100,
      before: lastMessageId,
    });

    if (messages.size === 0) break;

    messages.forEach((message) => {
      const author = message.author.tag;
      count.set(author, (count.get(author) ?? 0) + 1);
    });

    await interaction.editReply({
      content: `Collected ${count.size} users from ${channel.name}...`,
    });

    lastMessageId = messages.last()?.id;
  }
}
