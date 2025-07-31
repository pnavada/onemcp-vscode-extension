// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { execSync, spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as http from 'http';

interface MCPServerManager {
	isRunning(): Promise<boolean>;
	start(): Promise<void>;
	stop(): Promise<void>;
	getStatus(): Promise<string>;
	install(): Promise<void>;
	isInstalled(): Promise<boolean>;
	isPythonInstalled(): Promise<boolean>;
	isDockerInstalled(): Promise<boolean>;
}

class SystemMCPOrchestratorManager implements MCPServerManager {
	private readonly serviceName = 'onemcp-orchestrator';
	private readonly port = 8080;
	private readonly serverUrl = `http://localhost:${this.port}`;
	private readonly installPath = path.join(os.homedir(), '.onemcp');
	private readonly pidFile = path.join(this.installPath, 'orchestrator.pid');
	private readonly logFile = path.join(this.installPath, 'orchestrator.log');
	private readonly extensionPath: string;

	constructor(extensionPath: string) {
		this.extensionPath = extensionPath;
	}

	async isPythonInstalled(): Promise<boolean> {
		try {
			execSync('python --version', { stdio: 'ignore' });
			return true;
		} catch {
			try {
				execSync('python3 --version', { stdio: 'ignore' });
				return true;
			} catch {
				return false;
			}
		}
	}

	async isDockerInstalled(): Promise<boolean> {
		try {
			execSync('docker --version', { stdio: 'ignore' });
			// Also check if Docker daemon is running
			execSync('docker ps', { stdio: 'ignore' });
			return true;
		} catch {
			return false;
		}
	}

	async isInstalled(): Promise<boolean> {
		const orchestratorScript = path.join(this.installPath, 'mcp_orchestrator.py');
		const requirementsFile = path.join(this.installPath, 'requirements.txt');
		return fs.existsSync(orchestratorScript) && fs.existsSync(requirementsFile);
	}

	async install(): Promise<void> {
		// Create installation directory
		if (!fs.existsSync(this.installPath)) {
			fs.mkdirSync(this.installPath, { recursive: true });
		}

		// Copy MCP orchestrator code from extension bundle
		const bundledServerPath = path.join(this.extensionPath, 'server');
		if (fs.existsSync(bundledServerPath)) {
			// Copy entire server directory
			await this.copyDirectory(bundledServerPath, this.installPath);
		} else {
			// Create a basic MCP orchestrator (fallback if no bundled server)
			await this.createBasicOrchestrator();
		}

		// Install Python dependencies
		const requirementsPath = path.join(this.installPath, 'requirements.txt');
		if (fs.existsSync(requirementsPath)) {
			const pythonCmd = await this.getPythonCommand();
			try {
				execSync(`${pythonCmd} -m pip install -r "${requirementsPath}"`, { 
					cwd: this.installPath,
					stdio: 'pipe'
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to install Python dependencies: ${error}`);	
				throw new Error(`Failed to install Python dependencies: ${error}`);
			}
		}

		vscode.window.showInformationMessage('OneMCP Orchestrator installed successfully');
	}

	private async copyDirectory(source: string, destination: string): Promise<void> {
		if (!fs.existsSync(destination)) {
			fs.mkdirSync(destination, { recursive: true });
		}

		const entries = fs.readdirSync(source, { withFileTypes: true });
		
		for (const entry of entries) {
			const srcPath = path.join(source, entry.name);
			const destPath = path.join(destination, entry.name);
			
			if (entry.isDirectory()) {
				await this.copyDirectory(srcPath, destPath);
			} else {
				fs.copyFileSync(srcPath, destPath);
			}
		}
	}

	private async createBasicOrchestrator(): Promise<void> {
		// Create requirements.txt
		const requirements = `fastapi==0.104.1
uvicorn==0.24.0
docker==6.1.3
asyncio-mqtt==0.13.0
httpx==0.25.2
`;
		fs.writeFileSync(path.join(this.installPath, 'requirements.txt'), requirements);

		// Create the MCP orchestrator script
		const orchestratorScript = `#!/usr/bin/env python3
"""
OneMCP MCP Server - Minimal FastAPI MCP Server with Health Check
"""
import sys
import os
import logging
from fastapi import FastAPI, HTTPException, Request
import uvicorn

# Configure logging
logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s - %(levelname)s - %(message)s',
	handlers=[
		logging.FileHandler('${this.logFile.replace(/\\/g, '\\\\')}'),
		logging.StreamHandler()
	]
)

logger = logging.getLogger(__name__)

app = FastAPI(
	title="OneMCP MCP Server",
	description="Minimal MCP Server API",
	version="1.0.0"
)

@app.get("/health")
async def health_check():
	return {"status": "healthy", "service": "onemcp-mcp-server"}

@app.post("/mcp")
async def mcp_endpoint(request: Request):
	try:
		data = await request.json()
	except Exception:
		raise HTTPException(status_code=400, detail="Invalid JSON")
	# Minimal MCP protocol echo
	return {
		"jsonrpc": "2.0",
		"id": data.get("id"),
		"result": {"message": "MCP server received request", "request": data}
	}

if __name__ == '__main__':
	# Write PID file
	with open('${this.pidFile.replace(/\\/g, '\\\\')}', 'w') as f:
		f.write(str(os.getpid()))
	logger.info(f"Starting OneMCP MCP Server on port ${this.port}")
	try:
		uvicorn.run(
			app,
			host="localhost",
			port=${this.port},
			log_level="info"
		)
	finally:
		# Clean up PID file
		if os.path.exists('${this.pidFile.replace(/\\/g, '\\\\')}'):
			os.remove('${this.pidFile.replace(/\\/g, '\\\\')}')
`;

		const orchestratorPath = path.join(this.installPath, 'mcp_orchestrator.py');
		fs.writeFileSync(orchestratorPath, orchestratorScript);

		// Make script executable on Unix-like systems
		if (process.platform !== 'win32') {
			execSync(`chmod +x "${orchestratorPath}"`);
		}
	}

	async isRunning(): Promise<boolean> {
		try {
			// Check if PID file exists and process is running
			if (fs.existsSync(this.pidFile)) {
				const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
				if (process.platform === 'win32') {
					execSync(`tasklist /FI "PID eq ${pid}"`, { stdio: 'ignore' });
				} else {
					execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
				}
				
				return true;
			}
			return false;
		} catch {
			// PID file exists but process is not running, clean up
			if (fs.existsSync(this.pidFile)) {
				fs.unlinkSync(this.pidFile);
			}
			return false;
		}
	}

	private async healthCheck(): Promise<boolean> {
		return new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();
        socket.setTimeout(5000);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', () => {
            resolve(false);
        });
        
        socket.connect(this.port, 'localhost');
    });
	}


	async start(): Promise<void> {
		if (await this.isRunning()) {
			return;
		}

		if (!(await this.isInstalled())) {
			throw new Error('MCP Orchestrator not installed. Please install it first.');
		}

		console.log('Starting MCP Orchestrator process...');

		const orchestratorPath = path.join(this.installPath, 'mcp_orchestrator.py');
		const pythonCmd = await this.getPythonCommand();
		
		// Start orchestrator as detached process
		// Redirect stdout and stderr to log file for debugging
		const out = fs.openSync(this.logFile, 'a');
		const err = fs.openSync(this.logFile, 'a');
		const child = spawn(pythonCmd, [orchestratorPath], {
			detached: true,
			stdio: ['ignore', out, err],
			cwd: this.installPath
		});

		child.unref(); // Allow parent to exit

		// Wait a moment and check if orchestrator started successfully
		await new Promise(resolve => setTimeout(resolve, 10000));
		
		if (!(await this.isRunning())) {
			throw new Error('Failed to start MCP Orchestrator. Check logs for details.');
		}
	}

	async stop(): Promise<void> {
		if (!(await this.isRunning())) {
			return;
		}

		try {
			if (fs.existsSync(this.pidFile)) {
				const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
				
				if (process.platform === 'win32') {
					execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
				} else {
					execSync(`kill ${pid}`, { stdio: 'ignore' });
				}
				
				// Clean up PID file
				fs.unlinkSync(this.pidFile);
			}
		} catch (error) {
			throw new Error(`Failed to stop MCP Orchestrator: ${error}`);
		}
	}

	async getStatus(): Promise<string> {
		if (await this.isRunning()) {
			return `Running on ${this.serverUrl}`;
		}
		return 'Stopped';
	}

	private async getPythonCommand(): Promise<string> {
		try {
			execSync('python --version', { stdio: 'ignore' });
			return 'python';
		} catch {
			try {
				execSync('python3 --version', { stdio: 'ignore' });
				return 'python3';
			} catch {
				throw new Error('Python not found');
			}
		}
	}
}

// This method is called when your extension is activated
// Extension is activated when VS Code starts
export async function activate(context: vscode.ExtensionContext) {
	console.log('OneMCP Orchestrator extension is now active!');

	const mcpManager = new SystemMCPOrchestratorManager(context.extensionPath);

	// Check Python installation
	if (!(await mcpManager.isPythonInstalled())) {
		const action = await vscode.window.showErrorMessage(
			'Python is required for OneMCP Orchestrator to function. Please install Python first.',
			'Install Python',
			'Cancel'
		);
		
		if (action === 'Install Python') {
			vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
		}
		return;
	}

	// Check Docker installation
	if (!(await mcpManager.isDockerInstalled())) {
		const action = await vscode.window.showErrorMessage(
			'Docker is required for OneMCP Orchestrator to manage MCP servers. Please install Docker first.',
			'Install Docker',
			'Cancel'
		);
		
		if (action === 'Install Docker') {
			vscode.env.openExternal(vscode.Uri.parse('https://docs.docker.com/get-docker/'));
		}
		return;
	}

	// Check if MCP orchestrator is installed
	if (!(await mcpManager.isInstalled())) {
		const action = await vscode.window.showInformationMessage(
			'OneMCP Orchestrator needs to be installed on your system.',
			'Install Now',
			'Cancel'
		);
		
		if (action === 'Install Now') {
			try {
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: "Installing OneMCP Orchestrator...",
					cancellable: false
				}, async (progress) => {
					progress.report({ increment: 0, message: "Installing dependencies..." });
					await mcpManager.install();
					progress.report({ increment: 100, message: "Installation complete!" });
				});
			} catch (error) {
				vscode.window.showErrorMessage(`Installation failed: ${error}`);
				return;
			}
		} else {
			return;
		}
	}

	// Global state to track if server is managed by this instance
	// Use workspace state instead of global state for better isolation
	const instanceId = Math.random().toString(36).substring(7);
	const serverManagerKey = 'mcpOrchestratorManager';
	const currentManager = context.globalState.get<string>(serverManagerKey);
	
	// Try to become the server manager (only one VS Code instance should manage the orchestrator)
	if (!currentManager || !(await mcpManager.isRunning())) {
		await context.globalState.update(serverManagerKey, instanceId);
		
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Starting OneMCP Orchestrator...",
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0, message: "Starting orchestrator..." });
				await mcpManager.start();
				progress.report({ increment: 100, message: "Orchestrator started!" });
			});
			
			vscode.window.showInformationMessage('OneMCP: Orchestrator initialized and ready to manage MCP servers');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to start MCP Orchestrator: ${error}`);
			await context.globalState.update(serverManagerKey, undefined);
		}
	}

	// Register commands
	const installCommand = vscode.commands.registerCommand('onemcp.installOrchestrator', async () => {
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Installing OneMCP Orchestrator...",
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0, message: "Installing dependencies..." });
				await mcpManager.install();
				progress.report({ increment: 100, message: "Installation complete!" });
			});
			vscode.window.showInformationMessage('MCP Orchestrator installed successfully');
		} catch (error) {
			vscode.window.showErrorMessage(`Installation failed: ${error}`);
		}
	});

	const startCommand = vscode.commands.registerCommand('onemcp.startOrchestrator', async () => {
		try {
			await mcpManager.start();
			await context.globalState.update(serverManagerKey, instanceId);
			vscode.window.showInformationMessage('MCP Orchestrator started');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to start orchestrator: ${error}`);
		}
	});

	const stopCommand = vscode.commands.registerCommand('onemcp.stopOrchestrator', async () => {
		try {
			await mcpManager.stop();
			await context.globalState.update(serverManagerKey, undefined);
			vscode.window.showInformationMessage('MCP Orchestrator stopped');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to stop orchestrator: ${error}`);
		}
	});

	const statusCommand = vscode.commands.registerCommand('onemcp.orchestratorStatus', async () => {
		try {
			const status = await mcpManager.getStatus();
			const isInstalled = await mcpManager.isInstalled();
			const pythonOk = await mcpManager.isPythonInstalled();
			const dockerOk = await mcpManager.isDockerInstalled();
			
			const statusMsg = [
				`Orchestrator: ${status}${isInstalled ? '' : ' (Not Installed)'}`,
				`Python: ${pythonOk ? '✓' : '✗'}`,
				`Docker: ${dockerOk ? '✓' : '✗'}`
			].join('\n');
			
			vscode.window.showInformationMessage(statusMsg);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to get orchestrator status: ${error}`);
		}
	});

	const openLogsCommand = vscode.commands.registerCommand('onemcp.openLogs', () => {
		const logPath = path.join(os.homedir(), '.onemcp', 'orchestrator.log');
		if (fs.existsSync(logPath)) {
			vscode.workspace.openTextDocument(logPath).then(doc => {
				vscode.window.showTextDocument(doc);
			});
		} else {
			vscode.window.showInformationMessage('No log file found');
		}
	});

	const openDashboardCommand = vscode.commands.registerCommand('onemcp.openDashboard', async () => {
		const isRunning = await mcpManager.isRunning();
		if (isRunning) {
			vscode.env.openExternal(vscode.Uri.parse('http://localhost:8080/docs'));
		} else {
			vscode.window.showWarningMessage('MCP Orchestrator is not running. Start it first.');
		}
	});

	context.subscriptions.push(
		installCommand, 
		startCommand, 
		stopCommand, 
		statusCommand, 
		openLogsCommand,
		openDashboardCommand
	);

	// Clean up when extension is deactivated
	context.subscriptions.push({
		dispose: async () => {
			const currentManagerId = context.globalState.get<string>(serverManagerKey);
			if (currentManagerId === instanceId) {
				try {
					await mcpManager.stop();
					await context.globalState.update(serverManagerKey, undefined);
				} catch (error) {
					console.error('Failed to stop MCP Orchestrator during cleanup:', error);
				}
			}
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
