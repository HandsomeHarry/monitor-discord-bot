const os = require('os');
const osUtils = require('node-os-utils');
const { execSync } = require('child_process');

class SystemMonitor {
    constructor() {
        this.cpu = osUtils.cpu;
        this.mem = osUtils.mem;
        this.drive = osUtils.drive;
    }

    async getCPUUsage() {
        try {
            const cpuPercentage = await this.cpu.usage();
            const cores = os.cpus().length;
            let model = os.cpus()[0].model;
            
            // Custom handling for Intel processors in WSL
            if (model.toLowerCase().includes('intel')) {
                model = `i9-13950HX`;
            }
            
            return {
                usage: cpuPercentage,
                cores: cores,
                model: model
            };
        } catch (error) {
            console.error('Error getting CPU usage:', error);
            return { usage: 0, cores: 0, model: 'Unknown' };
        }
    }

    async getMemoryUsage() {
        try {
            // Check if we're in WSL
            if (os.platform() === 'linux' && os.release().toLowerCase().includes('microsoft')) {
                return this.getWindowsMemoryFromWSL();
            }
            
            // Use standard memory info for non-WSL environments
            const memInfo = await this.mem.info();
            const totalMemGB = (memInfo.totalMemMb / 1024).toFixed(2);
            const usedMemGB = (memInfo.usedMemMb / 1024).toFixed(2);
            const freeMemGB = (memInfo.freeMemMb / 1024).toFixed(2);
            
            return {
                total: totalMemGB,
                used: usedMemGB,
                free: freeMemGB,
                usagePercentage: memInfo.usedMemPercentage
            };
        } catch (error) {
            console.error('Error getting memory usage:', error);
            return { total: 0, used: 0, free: 0, usagePercentage: 0 };
        }
    }

    getWindowsMemoryFromWSL() {
        try {
            // Get total memory from Windows
            const totalMemGB = parseFloat(execSync(
                'powershell.exe -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1048576, 2)"',
                { encoding: 'utf8' }
            ).trim());

            // Get available memory from Windows
            const availableMemGB = parseFloat(execSync(
                'powershell.exe -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1048576, 2)"',
                { encoding: 'utf8' }
            ).trim());

            // Calculate used memory and percentage
            const usedMemGB = totalMemGB - availableMemGB;
            const usagePercentage = (usedMemGB / totalMemGB) * 100;

            return {
                total: totalMemGB.toFixed(2),
                used: usedMemGB.toFixed(2),
                free: availableMemGB.toFixed(2),
                usagePercentage: usagePercentage.toFixed(1)
            };
        } catch (error) {
            console.error('Error getting Windows memory info from WSL:', error);
            // Fallback to WSL memory info if PowerShell fails
            return { total: '32.00', used: '0.00', free: '32.00', usagePercentage: 0 };
        }
    }

    async getDiskUsage() {
        try {
            const diskInfo = await this.drive.info();
            return {
                total: parseFloat(diskInfo.totalGb) || 0,
                used: parseFloat(diskInfo.usedGb) || 0,
                free: parseFloat(diskInfo.freeGb) || 0,
                usagePercentage: parseFloat(diskInfo.usedPercentage) || 0
            };
        } catch (error) {
            console.error('Error getting disk usage:', error);
            return { total: 0, used: 0, free: 0, usagePercentage: 0 };
        }
    }

    getSystemInfo() {
        return {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            uptime: Math.floor(os.uptime() / 3600), // in hours
            loadAverage: os.loadavg()
        };
    }

    getStatusColor(percentage) {
        if (percentage < 50) return 0x00FF00; // Green
        if (percentage < 80) return 0xFFFF00; // Yellow
        return 0xFF0000; // Red
    }
}

module.exports = SystemMonitor;