import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  AttachmentBuilder,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('save')
    .setDescription('Archives all messages from a specific channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to archive messages from.')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const channel = interaction.channel; // Current Channel

      if (channel === null) {
        return await interaction.reply({
          content: 'This command must be used in a text channel.',
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser('user'); // Optional User
      const filteredMessages: Array<{
        author: string;
        content: string;
        timestamp: number;
      }> = [];

      let lastMessageId: string | undefined;

      while (true) {
        // Fetch messages in chunks of 100, starting from the last fetched message
        const messages = await channel.messages.fetch({
          limit: 100,
          before: lastMessageId,
        });

        if (messages.size === 0) break; // Exit loop when no more messages are found

        messages.forEach((message) => {
          if (targetUser !== null && message.author.id === targetUser.id) {
            // Filter messages by the specified user
            filteredMessages.push({
              author: message.author.tag,
              content: message.content,
              timestamp: message.createdTimestamp,
            });
          } else if (targetUser === null) {
            // If no user is specified, save all messages
            filteredMessages.push({
              author: message.author.tag,
              content: message.content,
              timestamp: message.createdTimestamp,
            });
          }
        });

        // Update the lastMessageId to fetch older messages
        lastMessageId = messages.last()?.id;
      }

      // Convert to JSON format
      const jsonData = JSON.stringify(filteredMessages, null, 2);

      // Create JSON in memory as an attachment
      const attachment = new AttachmentBuilder(Buffer.from(jsonData, 'utf-8'), {
        name: `messages-${channel.id}-${interaction.user.id}.json`,
      });

      // Send to command executor
      return await interaction.reply({
        content: 'Messages have been saved.',
        files: [attachment],
        ephemeral: true, // Viewable only by the executor
      });
    } catch (error) {
      console.error(error);
      return await interaction.reply({
        content: 'An error occurred while saving messages.',
        ephemeral: true,
      });
    }
  },
};
