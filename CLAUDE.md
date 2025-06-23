# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord bot for monitoring M1 Mac Mini system status and Tailscale network connectivity. Built with Node.js and Discord.js v14, featuring system monitoring, network ping/HTTP status checks, and automated reporting.

## Development Commands

```bash
npm install          # Install dependencies
npm start           # Run the bot in production
npm run dev         # Run with nodemon for development
```

## Architecture

### Core Components

- **index.js**: Main Discord bot application with slash command handlers
- **utils/systemMonitor.js**: System resource monitoring (CPU, RAM, disk) using node-os-utils
- **utils/networkMonitor.js**: Network connectivity testing with ping and HTTP status checks
- **addresses.txt**: Configuration file containing IP addresses and domains to monitor

### Key Features

- Slash commands: `/status`, `/system`, `/network`, `/monitor start/stop`
- Automated monitoring with configurable intervals (default 5 minutes)
- Color-coded status indicators and emoji-based visual feedback
- Separate handling for IP addresses (ping) vs domains (HTTP + ping)

### Environment Configuration

Required environment variables in `.env`:
- `DISCORD_TOKEN`: Bot token from Discord Developer Portal
- `DISCORD_CHANNEL_ID`: Channel ID for automated monitoring updates
- `MONITOR_INTERVAL`: Update interval in milliseconds (default: 300000 = 5min)

### Dependencies

- **discord.js**: Discord API wrapper for bot functionality
- **node-os-utils**: Cross-platform system monitoring utilities
- **axios**: HTTP client for web service status checks  
- **ping**: Network ping functionality
- **dotenv**: Environment variable management