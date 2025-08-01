# OneMCP Orchestrator

A VS Code extension that provides a dynamic orchestrator for Model Context Protocol (MCP) servers with Docker integration.

## Features

- **Automatic MCP Server Management**: Dynamically spin off and manage multiple MCP servers
- **Docker Integration**: Seamless Docker-based server deployment and management
- **Cross-Platform Support**: Works on Windows, macOS, and Linux

## Requirements

- **Python 3.8+**: Required for running the orchestrator
- **Docker**: Required for MCP server containerization
- **VS Code 1.102.0+**: Minimum VS Code version

## Commands

This extension contributes the following commands:

- `OneMCP: Install Orchestrator` - Install the MCP orchestrator on your system
- `OneMCP: Start Orchestrator` - Start the orchestrator service
- `OneMCP: Stop Orchestrator` - Stop the orchestrator service
- `OneMCP: Check Status` - Check orchestrator and system status
- `OneMCP: Open Logs` - View orchestrator logs
- `OneMCP: Open Dashboard` - Open the orchestrator web dashboard

## Getting Started

1. Install the extension
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run `OneMCP: Install Orchestrator` to install the orchestrator
4. Run `OneMCP: Start Orchestrator` to start managing MCP servers

## Extension Settings

This extension contributes the following settings:

Currently no configurable settings. The orchestrator runs on `localhost:8000` by default.

## Known Issues

- First startup may take some time while dependencies are installed
- Requires internet connection for Docker image pulls

## Release Notes

### 0.0.1

Initial release of OneMCP Orchestrator extension:
- Basic orchestrator management
- Docker integration
- VS Code command integration

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/pnavada/onemcp-vscode-extension).

## License

This extension is licensed under the MIT License. See LICENSE file for details.
