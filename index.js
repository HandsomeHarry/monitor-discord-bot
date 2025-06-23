const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActivityType } = require('discord.js');
const SystemMonitor = require('./utils/systemMonitor');
const NetworkMonitor = require('./utils/networkMonitor');
require('dotenv/config');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const systemMonitor  = new SystemMonitor();
const networkMonitor = new NetworkMonitor();

/* ---------- Helper: make uptime human-readable ---------- */
function formatUptimeHours(totalHours) {
    const days  = Math.floor(totalHours / 24);
    const hours = Math.floor(totalHours % 24);

    if (days === 0) {
        return `${hours} h`;                    // e.g. “6 h”
    }
    return `${days} d ${hours} h`;             // e.g. “3 d 6 h”
}

/* ---------- Slash-command definitions ---------- */
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
let statusUpdateInterval = null;

/* ---------- Embed builders ---------- */
async function createSystemOverviewEmbed() {
    const cpuInfo      = await systemMonitor.getCPUUsage();
    const memInfo      = await systemMonitor.getMemoryUsage();
    const sysInfo      = await systemMonitor.getSystemInfo();      // contains .uptime (hours)
    const networkStats = await networkMonitor.monitorAllAddresses();
    
    const onlineCount = networkStats.filter(r =>
        r.status === 'ONLINE' ||
        (typeof r.status === 'number' && r.status >= 200 && r.status < 300)
    ).length;

    // Shorten the CPU model string a bit
    let cpuModelShort;
    if (cpuInfo.model.toLowerCase().includes('intel')) {
        cpuModelShort = cpuInfo.model;
        // cpuModelShort = "i9-13950HX"
    } else {
        cpuModelShort = cpuInfo.model.replace(/Apple\s+/i, '').split(' ').slice(0, 2).join(' ');
    }

    const embed = new EmbedBuilder()
        .setTitle('System Status')
        .setColor(systemMonitor.getStatusColor(Math.max(cpuInfo.usage, memInfo.usagePercentage)))
        .setTimestamp()
        .setDescription(
            `CPU: **${cpuModelShort}** – **${cpuInfo.usage.toFixed(1)} %**\n` +
            `Memory: **${memInfo.used} GB / ${memInfo.total} GB**\n` +
            `Network Services: **${onlineCount}/${networkStats.length} online**\n` +
            `Uptime: **${formatUptimeHours(sysInfo.uptime)}**`
        );

    return embed;
}

async function createNetworkStatusEmbed() {
    const results = await networkMonitor.monitorAllAddresses();
    
    const embed = new EmbedBuilder()
        .setTitle('Network Status')
        .setColor(0x0099FF)
        .setTimestamp();

    if (results.length === 0) {
        embed.setDescription('No addresses configured in `addresses.txt`');
        return embed;
    }

    const lines = results.map(res => {
        const emoji = networkMonitor.formatStatusEmoji(res.status || res.pingStatus);
        const addr  = res.address;
        
        if (res.type === 'IP' || res.type === 'LOCAL') {
            return `${emoji} **${addr}** – **${res.status}**`;
        }

        // URL
        if (typeof res.status === 'number') {
            return `${emoji} **${addr}** – **HTTP ${res.status}**`;
        }
        return `${emoji} **${addr}** – ${res.status}`;
    });

    embed.setDescription(lines.join('\n'));
    return embed;
}

/* ---------- Bot status update function ---------- */
async function updateBotStatus() {
    try {
        const cpuInfo = await systemMonitor.getCPUUsage();
        const memInfo = await systemMonitor.getMemoryUsage();
        const sysInfo = await systemMonitor.getSystemInfo();
        const networkStats = await networkMonitor.monitorAllAddresses();

        const onlineServices = networkStats.filter(r => 
            r.status === 'ONLINE' || 
            (typeof r.status === 'number' && r.status >= 200 && r.status < 300)
        ).length;

        // Calculate game start timestamp based on system uptime
        const uptimeMs = sysInfo.uptime * 60 * 60 * 1000; // Convert hours to milliseconds
        const gameStartTimestamp = Date.now() - uptimeMs;

        await client.user.setPresence({
            activities: [{
                name: `| RAM: ${memInfo.used}GB / ${memInfo.total}GB`,
                type: ActivityType.Playing,
                state: `${onlineServices}/${networkStats.length} services online`,
                timestamps: {
                    start: gameStartTimestamp
                },
                assets: {
                    large_image: 'monitor_logo',
                    large_text: 'System Monitor'
                }
            }],
            status: 'online'
        });
    } catch (error) {
        console.error('❌ Error updating bot status:', error);
    }
}

/* ---------- Ready & command registration ---------- */
client.once('ready', async () => {
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('🔄 Refreshing application (/) commands…');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (err) {
        console.error('❌ Error registering commands:', err);
    }

    // Initialize Bot Status Updates
    try {
        await updateBotStatus();
        
        // Update bot status every 30 seconds
        statusUpdateInterval = setInterval(updateBotStatus, 30000);
        console.log('✅ Bot status updates initialized');
    } catch (error) {
        console.error('❌ Failed to initialize bot status updates:', error);
    }
});

/* ---------- Command handler ---------- */
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        switch (interaction.commandName) {
            /* ---- /status ---- */
            case 'status': {
                await interaction.deferReply();
                const embed = await createNetworkStatusEmbed();
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            /* ---- /system ---- */
            case 'system': {
                await interaction.deferReply();
                const embed = await createSystemOverviewEmbed();
                await interaction.editReply({ embeds: [embed] });
                break;
            }

            /* ---- /monitor ---- */
            case 'monitor': {
                const action = interaction.options.getString('action');
                
                if (action === 'start') {
                    if (monitoringInterval) {
                        await interaction.reply('⚠️ Monitoring is already running!');
                        return;
                    }
                    
                    const channel = interaction.channel;
                    const intervalMs = parseInt(process.env.MONITOR_INTERVAL, 10) || 30_000;

                    monitoringInterval = setInterval(async () => {
                        try {
                            const embed = await createNetworkStatusEmbed();
                            await channel.send({ embeds: [embed] });
                        } catch (err) {
                            console.error('Error sending monitoring update:', err);
                        }
                    }, intervalMs);

                    await interaction.reply(`✅ Monitoring started! Updates every ${intervalMs / 1000} s in this channel.`);
                }
                    
                if (action === 'stop') {
                    if (!monitoringInterval) {
                        await interaction.reply('⚠️ Monitoring is not currently running!');
                        return;
                    }
                    
                    clearInterval(monitoringInterval);
                    monitoringInterval = null;
                    await interaction.reply('⏹️ Monitoring stopped.');
                }
                break;
            }

            default:
                await interaction.reply('❌ Unknown command!');
        }
    } catch (err) {
        console.error('Error handling command:', err);
        const msg = '❌ An error occurred while processing the command.';
        if (interaction.deferred) {
            await interaction.editReply(msg);
        } else {
            await interaction.reply(msg);
        }
    }
});

/* ---------- Cleanup on exit ---------- */
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot...');
    
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
    }
    client.destroy();
    process.exit(0);
});

/* ---------- Misc ---------- */
client.on('error', console.error);
client.login(process.env.DISCORD_TOKEN);
