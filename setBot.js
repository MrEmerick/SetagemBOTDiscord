const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, 
    ButtonStyle, Events 
} = require('discord.js');
require('dotenv').config(); 

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.GuildMember]
});

const ROLE_ID = '1208220935400988682';
const LOG_CHANNEL_ID = '1353500863661998080';

// Objetos para armazenar os dados dos usuários
const pendingApprovals = {};
const processedApprovals = {}; // Armazena usuários já aprovados ou reprovados

client.once('ready', async () => {
    console.log(`Bot está online como ${client.user.tag}`);
    const guild = client.guilds.cache.get('1208201761148379237');
    if (guild) {
        await guild.commands.create({
            name: 'setbutton',
            description: 'Exibe o botão para setar informações',
        });
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'open_form') {
            const modal = new ModalBuilder()
                .setCustomId('set_user_info')
                .setTitle('Preencha suas informações');

            const nameInput = new TextInputBuilder()
                .setCustomId('user_name')
                .setLabel('Nome na cidade:')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const idInput = new TextInputBuilder()
                .setCustomId('user_id')
                .setLabel('ID:')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const recruitedByInput = new TextInputBuilder()
                .setCustomId('recruited_by')
                .setLabel('Recrutado por:')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(recruitedByInput)
            );

            await interaction.showModal(modal);
        } else if (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('deny_')) {
            const userId = interaction.customId.split('_')[1];
            const approved = interaction.customId.startsWith('approve_');
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
            if (!logChannel) return;

            if (processedApprovals[userId]) {
                return interaction.reply({ content: "Este usuário já foi aprovado ou reprovado.", ephemeral: true });
            }

            processedApprovals[userId] = true; // Marcar como processado

            let embedDescription = `Usuário: <@${userId}>\n`;

            if (approved && pendingApprovals[userId]) {
                const { name, id, recruitedBy } = pendingApprovals[userId];
                const newNickname = `${name} | ${id}`;
                
                await member.setNickname(newNickname).catch(() => null);
                await member.roles.add(ROLE_ID).catch(() => null);
                
                embedDescription += `**Nome:** ${name}\n**ID:** ${id}\n**Recrutado por:** ${recruitedBy || 'Não informado'}`;
                
                delete pendingApprovals[userId];
            }

            const embed = new EmbedBuilder()
                .setColor(approved ? '#4CAF50' : '#FF0000')
                .setTitle(approved ? 'Setagem Aprovada ✅' : 'Setagem Reprovada ❌')
                .setDescription(embedDescription)
                .setTimestamp()
                .setFooter({ text: 'Sistema de Setagem' });

            await logChannel.send({ embeds: [embed] });
            await interaction.update({
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`approve_${userId}`)
                            .setLabel('Aprovar')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId(`deny_${userId}`)
                            .setLabel('Reprovar')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    )
                ]
            });
        }
    } else if (interaction.isModalSubmit() && interaction.customId === 'set_user_info') {
        const name = interaction.fields.getTextInputValue('user_name');
        const id = interaction.fields.getTextInputValue('user_id');
        const recruitedBy = interaction.fields.getTextInputValue('recruited_by') || 'Não informado';

        pendingApprovals[interaction.member.id] = { name, id, recruitedBy };

        const approvalEmbed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('Aprovar ou Reprovar Setagem')
            .setDescription(`**Nome:** ${name}\n**ID:** ${id}\n**REC:** ${recruitedBy}`)
            .setTimestamp();

        const approveButton = new ButtonBuilder()
            .setCustomId(`approve_${interaction.member.id}`)
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success);

        const denyButton = new ButtonBuilder()
            .setCustomId(`deny_${interaction.member.id}`)
            .setLabel('Reprovar')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder().addComponents(approveButton, denyButton);
        
        const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel && logChannel.isTextBased()) {
            await logChannel.send({ embeds: [approvalEmbed], components: [actionRow] });
        } else {
            console.error("Canal de log inválido ou não encontrado.");
        }

        await interaction.reply({ content: "Solicitação enviada para aprovação!", ephemeral: true });
    }

    if (interaction.isCommand() && interaction.commandName === 'setbutton') {
        const button = new ButtonBuilder()
            .setCustomId('open_form')
            .setLabel('Setar Informações')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('✍️');

        const row = new ActionRowBuilder().addComponents(button);
        const embed = new EmbedBuilder()
            .setColor('#FF9800')
            .setTitle('INICIAR REGISTRO')
            .setDescription('Clique no botão abaixo para preencher o formulário de setagem.')
            .setTimestamp()
            .setFooter({ text: '© 2025 Rafael Emerick - Todos os direitos reservados' });

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

client.login(TOKEN);
