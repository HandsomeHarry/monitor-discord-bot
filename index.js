const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const SystemMonitor = require('./utils/systemMonitor');
const NetworkMonitor = require('./utils/networkMonitor');
require('dotenv/config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

const systemMonitor = new SystemMonitor();
const networkMonitor = new NetworkMonitor();

// Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check network connectivity status'),
    new SlashCommandBuilder()
        .setName('system')
        .setDescription('Get detailed system overview'),
    new SlashCommandBuilder()
        .setName('monitor')
        .setDescription('Start/stop automatic monitoring')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Start or stop monitoring')
                .setRequired(true)
                .addChoices(
                    { name: 'start', value: 'start' },
                    { name: 'stop', value: 'stop' }
                ))
];

let monitoringInterval = null;
let monitoringChannelId = process.env.DISCORD_CHANNEL_ID;

async function createSystemOverviewEmbed() {
    const cpuInfo = await systemMonitor.getCPUUsage();
    const memInfo = await systemMonitor.getMemoryUsage();
    const networkResults = await networkMonitor.monitorAllAddresses();
    
    const onlineCount = networkResults.filter(r => 
        r.status === 'ONLINE' || (typeof r.status === 'number' && r.status >= 200 && r.status < 300)
    ).length;

    // Extract CPU model name - handle both Apple and Intel processors
    let cpuModelShort;
    if (cpuInfo.model.toLowerCase().includes('intel')) {
        cpuModelShort = cpuInfo.model; // Use full Intel model name (already formatted)
    } else {
        cpuModelShort = cpuInfo.model.replace(/Apple\s+/i, '').split(' ').slice(0, 2).join(' ');
    }

    const embed = new EmbedBuilder()
        .setTitle('System Status')
        .setColor(systemMonitor.getStatusColor(Math.max(cpuInfo.usage, memInfo.usagePercentage)))
        .setTimestamp()
        .setDescription(`**CPU: ${cpuModelShort}** ${cpuInfo.usage.toFixed(1)}% Utilized\n**Memory:** ${memInfo.used}GB / ${memInfo.total}GB\n**Network Services:** ${onlineCount}/${networkResults.length} online`);

    return embed;
}

async function createNetworkStatusEmbed() {
    const networkResults = await networkMonitor.monitorAllAddresses();
    
    const embed = new EmbedBuilder()
        .setTitle('Network Status')
        .setColor(0x0099FF)
        .setTimestamp();

    if (networkResults.length === 0) {
        embed.setDescription('No addresses configured in addresses.txt');
        return embed;
    }

    let description = '';
    networkResults.forEach(result => {
        const emoji = networkMonitor.formatStatusEmoji(result.status || result.pingStatus);
        
        // Pad the address to create consistent spacing
        const paddedAddress = result.address.padEnd(20, ' ');
        
        if (result.type === 'IP' || result.type === 'LOCAL') {
            description += `${emoji} **${paddedAddress}** - ${result.status}`;
        } else {
            description += `${emoji} **${paddedAddress}** - `;
            if (typeof result.status === 'number') {
                description += `HTTP ${result.status}`;
            } else {
                description += result.status;
            }
        }
        description += '\n';
    });

    embed.setDescription(description);
    return embed;
}

// Remove the createFullStatusEmbed function as it's no longer needed

client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('🔄 Refreshing application (/) commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'status':
                await interaction.deferReply();
                const networkEmbed = await createNetworkStatusEmbed();
                await interaction.editReply({ embeds: [networkEmbed] });
                break;

            case 'system':
                await interaction.deferReply();
                const systemEmbed = await createSystemOverviewEmbed();
                await interaction.editReply({ embeds: [systemEmbed] });
                break;

            case 'monitor':
                const action = interaction.options.getString('action');
                
                if (action === 'start') {
                    if (monitoringInterval) {
                        await interaction.reply('⚠️ Monitoring is already running!');
                        return;
                    }
                    
                    // Use the current channel instead of configured one
                    const channel = interaction.channel;

                    monitoringInterval = setInterval(async () => {
                        try {
                            const networkEmbed = await createNetworkStatusEmbed();
                            await channel.send({ embeds: [networkEmbed] });
                        } catch (error) {
                            console.error('Error sending monitoring update:', error);
                        }
                    }, parseInt(process.env.MONITOR_INTERVAL) || 300000); // Default 5 minutes

                    await interaction.reply('✅ Monitoring started! Updates will be sent to this channel every 5 minutes.');
                    
                } else if (action === 'stop') {
                    if (!monitoringInterval) {
                        await interaction.reply('⚠️ Monitoring is not currently running!');
                        return;
                    }
                    
                    clearInterval(monitoringInterval);
                    monitoringInterval = null;
                    await interaction.reply('⏹️ Monitoring stopped.');
                }
                break;

            default:
                await interaction.reply('❌ Unknown command!');
        }
    } catch (error) {
        console.error('Error handling command:', error);
        const errorMessage = '❌ An error occurred while processing the command.';
        
        if (interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

client.login(process.env.DISCORD_TOKEN);