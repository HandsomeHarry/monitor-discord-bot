// SystemMonitor.js
const os = require('os');
const osUtils = require('node-os-utils');
const { execSync } = require('child_process');

class SystemMonitor {
    constructor() {
        this.cpu   = osUtils.cpu;
        this.mem   = osUtils.mem;
        this.drive = osUtils.drive;
    }

    /**
     * CPU usage (percentage), logical-core count, and model string.
     * - Native Linux/macOS: use node-os-utils.
     * - WSL                : query the Windows host via PowerShell.
     */
    async getCPUUsage() {
        try {
            // Detect WSL: kernel release contains “Microsoft”
            const inWSL = os.platform() === 'linux' &&
                          os.release().toLowerCase().includes('microsoft');

            if (inWSL) {
                return this.getWindowsCPUUsageFromWSL();
            }

            // Non-WSL environments
            const usage = await this.cpu.usage();      // %
            return {
                usage,
                cores: os.cpus().length,
                model: os.cpus()[0].model
            };
        } catch (error) {
            console.error('Error getting CPU usage:', error);
            return { usage: 0, cores: 0, model: 'Unknown' };
        }
    }

    /**
     * PowerShell helper for WSL: pulls real Windows CPU stats.
     */
    getWindowsCPUUsageFromWSL() {
        try {
            // Average instantaneous load across all packages
            const usage = parseFloat(execSync(
                'powershell.exe -Command "(Get-CimInstance Win32_Processor | ' +
                'Measure-Object -Property LoadPercentage -Average).Average"',
                { encoding: 'utf8' }
            ).trim());

            const cores = parseInt(execSync(
                'powershell.exe -Command "(Get-CimInstance Win32_Processor | ' +
                'Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum"',
                { encoding: 'utf8' }
            ).trim(), 10);

            const model = execSync(
                'powershell.exe -Command "(Get-CimInstance Win32_Processor | ' +
                'Select-Object -First 1 -ExpandProperty Name)"',
                { encoding: 'utf8' }
            ).trim();

            return { usage, cores, model };
        } catch (err) {
            console.error('Error getting Windows CPU info from WSL:', err);
            return { usage: 0, cores: 0, model: 'Unknown' };
        }
    }

    /**
     * Memory usage; calls Windows from WSL when needed.
     */
    async getMemoryUsage() {
        try {
            const inWSL = os.platform() === 'linux' &&
                          os.release().toLowerCase().includes('microsoft');

            if (inWSL) {
                return this.getWindowsMemoryFromWSL();
            }

            const memInfo      = await this.mem.info();
            const totalMemGB   = (memInfo.totalMemMb / 1024).toFixed(2);
            const usedMemGB    = (memInfo.usedMemMb  / 1024).toFixed(2);
            const freeMemGB    = (memInfo.freeMemMb  / 1024).toFixed(2);

            return {
                total: totalMemGB,
                used : usedMemGB,
                free : freeMemGB,
                usagePercentage: memInfo.usedMemPercentage
            };
        } catch (error) {
            console.error('Error getting memory usage:', error);
            return { total: 0, used: 0, free: 0, usagePercentage: 0 };
        }
    }

    /**
     * PowerShell helper for memory when running inside WSL.
     */
    getWindowsMemoryFromWSL() {
        try {
            const totalMemGB = parseFloat(execSync(
                'powershell.exe -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1048576, 2)"',
                { encoding: 'utf8' }
            ).trim());

            const availableMemGB = parseFloat(execSync(
                'powershell.exe -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1048576, 2)"',
                { encoding: 'utf8' }
            ).trim());

            const usedMemGB       = totalMemGB - availableMemGB;
            const usagePercentage = (usedMemGB / totalMemGB) * 100;

            return {
                total: totalMemGB.toFixed(2),
                used : usedMemGB.toFixed(2),
                free : availableMemGB.toFixed(2),
                usagePercentage: usagePercentage.toFixed(1)
            };
        } catch (error) {
            console.error('Error getting Windows memory info from WSL:', error);
            return { total: '32.00', used: '0.00', free: '32.00', usagePercentage: 0 };
        }
    }

    /**
     * Disk usage (works the same in Windows/WSL and native Linux).
     */
    async getDiskUsage() {
        try {
            const diskInfo = await this.drive.info();
            return {
                total: parseFloat(diskInfo.totalGb)       || 0,
                used : parseFloat(diskInfo.usedGb)        || 0,
                free : parseFloat(diskInfo.freeGb)        || 0,
                usagePercentage: parseFloat(diskInfo.usedPercentage) || 0
            };
        } catch (error) {
            console.error('Error getting disk usage:', error);
            return { total: 0, used: 0, free: 0, usagePercentage: 0 };
        }
    }

    /**
     * Miscellaneous static system info.
     */
    getSystemInfo() {
        return {
            hostname   : os.hostname(),
            platform   : os.platform(),
            arch       : os.arch(),
            uptime     : Math.floor(os.uptime() / 3600), // hours
            loadAverage: os.loadavg()
        };
    }

    /**
     * Helper to turn a percentage into an RGB int for Discord embeds.
     */
    getStatusColor(percentage) {
        if (percentage < 50) return 0x00FF00; // Green
        if (percentage < 80) return 0xFFFF00; // Yellow
        return 0xFF0000;                      // Red
    }
}

module.exports = SystemMonitor;
