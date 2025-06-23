# Discord System Monitor Bot

A Discord bot that monitors your M1 Mac Mini's system status and Tailscale network connectivity.

## Features

- **System Monitoring**: CPU usage, RAM usage, disk usage, and system information
- **Network Monitoring**: Ping IP addresses and check HTTP status of domains
- **Discord Integration**: Slash commands and automated monitoring updates
- **Colorized Status**: Visual indicators with colors and emojis for easy status identification

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Enable required bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links

### 3. Configure Environment

1. Copy `.env.example` to `.env`
2. Fill in your Discord bot token and channel ID:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here
MONITOR_INTERVAL=300000
```

### 4. Configure Monitoring Addresses

Edit `addresses.txt` to include IP addresses and domains you want to monitor:

```
# IP addresses (will be pinged)
8.8.8.8
100.64.1.1

# Domains (will check HTTP status and ping)
google.com
tailscale.com
your-website.com
```

### 5. Invite Bot to Server

1. In Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select "bot" and "applications.commands" scopes
3. Select required permissions
4. Use the generated URL to invite the bot to your server

## Usage

### Slash Commands

- `/status` - Get complete system and network status
- `/system` - Get detailed system information only
- `/network` - Check network connectivity status only
- `/monitor start` - Start automatic monitoring (sends updates every 5 minutes)
- `/monitor stop` - Stop automatic monitoring

### Running the Bot

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## Monitoring Features

### System Monitoring
- CPU usage percentage and core count
- RAM usage (total, used, free, percentage)
- Disk usage (total, used, free, percentage)
- System uptime and load average
- Hostname and platform information

### Network Monitoring
- **IP Addresses**: Ping test with response time
- **Domains**: HTTP status codes + ping test
- **Status Colors**:
  - 🟢 Green: Online/Healthy (HTTP 2xx, successful ping)
  - 🟡 Yellow: Warning (HTTP 3xx, high resource usage)
  - 🔴 Red: Error (HTTP 4xx/5xx, offline, high resource usage)
  - ⚫ Gray: Unknown/Error state

## File Structure

```
discord-bot/
├── index.js              # Main bot application
├── utils/
│   ├── systemMonitor.js  # System monitoring utilities
│   └── networkMonitor.js # Network monitoring utilities
├── addresses.txt         # List of addresses to monitor
├── package.json          # Node.js dependencies
├── .env                  # Environment configuration
└── README.md            # This file
```

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check if the bot token is correct and the bot is online
2. **Permission errors**: Ensure the bot has necessary permissions in your Discord server
3. **Network monitoring not working**: Verify addresses.txt format and network connectivity
4. **System monitoring errors**: Check if the bot has permissions to access system information

### Logs

The bot logs important events to the console. Run with `npm run dev` for detailed logging during development.