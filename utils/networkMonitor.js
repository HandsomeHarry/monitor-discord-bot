const ping = require('ping');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class NetworkMonitor {
    constructor() {
        this.addressesFile = path.join(__dirname, '../addresses.txt');
    }

    async loadAddresses() {
        try {
            const data = await fs.readFile(this.addressesFile, 'utf-8');
            const addresses = data
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            return addresses;
        } catch (error) {
            console.error('Error reading addresses file:', error);
            return [];
        }
    }

    async pingAddress(address) {
        try {
            const result = await ping.promise.probe(address, {
                timeout: 5,
                extra: ['-c', '1']
            });
            
            return {
                address,
                alive: result.alive,
                time: result.time,
                host: result.host,
                status: result.alive ? 'ONLINE' : 'OFFLINE'
            };
        } catch (error) {
            console.error(`Error pinging ${address}:`, error);
            return {
                address,
                alive: false,
                time: 'timeout',
                host: address,
                status: 'ERROR'
            };
        }
    }

    async checkHttpStatus(address) {
        try {
            // Add protocol if not present
            let url = address;
            if (!address.startsWith('http://') && !address.startsWith('https://')) {
                url = `https://${address}`;
            }

            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: () => true // Don't throw on any status code
            });

            return {
                address,
                status: response.status,
                statusText: response.statusText,
                responseTime: response.headers['x-response-time'] || 'N/A'
            };
        } catch (error) {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return {
                    address,
                    status: 'OFFLINE',
                    statusText: 'Connection failed',
                    responseTime: 'N/A'
                };
            }
            return {
                address,
                status: 'ERROR',
                statusText: error.message,
                responseTime: 'N/A'
            };
        }
    }

    isIPAddress(address) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(address) || ipv6Regex.test(address);
    }

    isLocalHostname(address) {
        // Check if it's a local hostname (no dots and not an IP)
        return !address.includes('.') && !this.isIPAddress(address);
    }

    async monitorAllAddresses() {
        const addresses = await this.loadAddresses();
        const results = [];

        for (const address of addresses) {
            if (this.isIPAddress(address)) {
                // Ping IP addresses
                const pingResult = await this.pingAddress(address);
                results.push({
                    ...pingResult,
                    type: 'IP'
                });
            } else if (this.isLocalHostname(address)) {
                // Only ping local hostnames (like 'wackyserver')
                const pingResult = await this.pingAddress(address);
                results.push({
                    ...pingResult,
                    type: 'LOCAL'
                });
            } else {
                // Check HTTP status for domains
                const httpResult = await this.checkHttpStatus(address);
                const pingResult = await this.pingAddress(address);
                results.push({
                    ...httpResult,
                    pingStatus: pingResult.status,
                    responseTime: pingResult.time,
                    type: 'DOMAIN'
                });
            }
        }

        return results;
    }

    getStatusColor(status, httpStatus = null) {
        if (typeof status === 'string') {
            switch (status.toLowerCase()) {
                case 'online': return 0x00FF00; // Green
                case 'offline': return 0xFF0000; // Red
                case 'error': return 0x808080; // Gray
                default: return 0xFFFF00; // Yellow
            }
        }
        
        if (typeof status === 'number') {
            if (status >= 200 && status < 300) return 0x00FF00; // Green
            if (status >= 300 && status < 400) return 0xFFFF00; // Yellow
            if (status >= 400) return 0xFF0000; // Red
        }
        
        return 0x808080; // Gray for unknown
    }

    formatStatusEmoji(status, httpStatus = null) {
        if (typeof status === 'string') {
            switch (status.toLowerCase()) {
                case 'online': return '🟢';
                case 'offline': return '🔴';
                case 'error': return '⚫';
                default: return '🟡';
            }
        }
        
        if (typeof status === 'number') {
            if (status >= 200 && status < 300) return '🟢';
            if (status >= 300 && status < 400) return '🟡';
            if (status >= 400) return '🔴';
        }
        
        return '⚫';
    }
}

module.exports = NetworkMonitor;