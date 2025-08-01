# OneMCP VS Code Extension

A VS Code extension that integrates OneMCP (One Model Context Protocol) orchestrator for installing and managing MCP servers and tools.

## Prerequisites

- **Node.js** and **npm** installed
- **OneMCP code** at the root of this repository

## Initial Setup

**Install dependencies:**
   ```bash
   npm install
   ```

**Install VS Code Extension Manager (vsce) globally:**
   ```bash
   npm install -g @vscode/vsce
   ```

## Building and Packaging

### For Development
Build the extension for local testing:
```bash
npm run compile
```

### For Distribution
Package the extension into a `.vsix` file:
```bash
vsce package --allow-star-activation
```
This will output `onemcp-0.0.1.vsix` file.

## Installation

### Install from VSIX file
```bash
code --install-extension onemcp-0.0.1.vsix
```

Once installed, the extension should be listed in the Extensions tab in VS Code.

## Local Development Testing

For local development and testing:

1. **Build the extension:**
   ```bash
   npm run compile
   ```

2. **Start debugging:**
   - Press `F5` in VS Code
   - Select "Run Extension" from the debug options
   - This opens a new VS Code window (Extension Development Host) for testing

## Extension Logic Flow

### 1. Prerequisites Check
- Checks if **Docker** is installed and running
- Checks if **Python** is installed (python or python3)
- If either is missing, prompts user to install them

### 2. OneMCP Orchestrator Installation
- Prompts user to install OneMCP Orchestrator
- When user clicks **"Install Now"**:
  - Copies the `onemcp` code to a hidden directory (`.onemcp`) in the user's home directory
  - Installs Python dependencies from `requirements.txt`
  - Starts the orchestrator server on **port 8000**

### 3. Orchestrator Management
- **Singleton Usage**: Ensure only one orchestrator instance runs across multiple VS Code windows and workspaces
- **Server Port**: Orchestrator runs on port 8000
- **Logging**: Logs are written to `orchestrator.log` in the `.onemcp` directory

### 4. MCP Server Registration
- OneMCP registers itself as an MCP server during startup
- When you list MCP servers in VS Code, OneMCP Server should be listed
- When you click **"Start"**, tools are discovered and listed when using the `/list` command

## Key Implementation Details

### File Structure
```
~/.onemcp/                     # Hidden directory in user's home
├── orchestrator.pid           # Process ID file for singleton management
├── orchestrator.log          # Server logs
├── requirements.txt          # Python dependencies
└── orchestration/
    └── orchestration.py      # Main orchestrator server
```

### Required Changes in orchestration.py

#### 1. Health Check Endpoint
```python
from starlette.requests import Request
from starlette.responses import JSONResponse

# Add a health check endpoint using FastMCP's custom_route decorator
@server.custom_route("/health", methods=["GET"])
async def health_check(request: Request):
    """Health check endpoint for monitoring"""
    return JSONResponse(content={
        "status": "healthy",
        "service": "OneMCP Orchestrator",
        "tools_available": True
    })
```

#### 2. PID File Creation
```python
import os

if __name__ == "__main__":
    # Create PID file for singleton management
    with open('orchestrator.pid', 'w') as f:
        f.write(str(os.getpid()))
    server.run(transport="streamable-http")
```

## Available Commands

The extension provides the following VS Code commands:

- **OneMCP: Install Orchestrator** - Manually install the orchestrator
- **OneMCP: Start Orchestrator** - Start the orchestrator server
- **OneMCP: Stop Orchestrator** - Stop the orchestrator server
- **OneMCP: Orchestrator Status** - Check orchestrator status
- **OneMCP: Open Logs** - View orchestrator logs
- **OneMCP: Open Dashboard** - Open orchestrator web dashboard

## Usage

1. **Install the extension** using the methods above
2. **Follow the installation prompts** for Docker, Python, and OneMCP Orchestrator
3. **Use MCP commands** in VS Code:
   - Use `/list` to see available MCP tools
   - Use Ctrl+Shift+P and search for "MCP" commands
   - Check "List Servers" to see registered MCP servers