# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord bot for monitoring M1 Mac Mini system status and Tailscale network connectivity. Built with Node.js and Discord.js v14, featuring system monitoring, network ping/HTTP status checks, automated reporting, and real-time bot status updates.

## Development Commands

```bash
npm install          # Install dependencies
npm start           # Run the bot in production
npm run dev         # Run with nodemon for development
```

## Architecture

### Core Components

- **index.js**: Main Discord bot application with slash command handlers and bot status updates
- **utils/systemMonitor.js**: Cross-platform system resource monitoring with WSL support
- **utils/networkMonitor.js**: Dual-mode network connectivity testing (ping for IPs, HTTP for domains)
- **addresses.txt**: Network monitoring targets configuration file

### Key Features

- **Slash Commands**: `/status`, `/system`, `/monitor start/stop`
- **Automated Monitoring**: Configurable intervals with automated channel updates
- **Bot Status Updates**: Real-time system stats displayed in bot's Discord status
- **Dual Network Monitoring**: Ping tests for IP addresses/hostnames, HTTP status checks for web domains
- **Cross-Platform Support**: Native macOS/Linux monitoring with WSL Windows host detection
- **Visual Feedback**: Color-coded embeds with emoji status indicators based on resource usage thresholds

### Environment Configuration

Required environment variables in `.env`:
- `DISCORD_TOKEN`: Bot token from Discord Developer Portal
- `DISCORD_CHANNEL_ID`: Channel ID for automated monitoring updates
- `MONITOR_INTERVAL`: Update interval in milliseconds (default: 300000 = 5min)

### Architecture Patterns

- **Modular Design**: Separate utility classes for system monitoring and network testing
- **Async/Await**: Consistent use of modern JavaScript async patterns
- **Error Handling**: Comprehensive try-catch blocks with graceful degradation
- **Resource Management**: Proper cleanup of intervals and connections on shutdown
- **Configuration-Driven**: Environment variables and text file configuration for flexibility

### Dependencies

- **discord.js**: Discord API wrapper for bot functionality
- **node-os-utils**: Cross-platform system monitoring utilities
- **axios**: HTTP client for web service status checks  
- **ping**: Network ping functionality
- **dotenv**: Environment variable management
- **nodemon**: Development auto-restart (dev dependency)