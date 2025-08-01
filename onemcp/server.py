#!/usr/bin/env python3

# Copyright(c) Microsoft Corporation.
# Licensed under the MIT License.

"""OneMCP Server implementation."""

import asyncio
import logging
import random
import signal
import sys
from typing import Any

import mcp.server.stdio
import mcp.types as types
from mcp.server import InitializationOptions, Server
from mcp.server.models import ServerCapabilities
from pydantic import AnyUrl

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("onemcp")

# Initialize the MCP server
server: Server = Server("onemcp")

# Global shutdown event
shutdown_event = asyncio.Event()


def signal_handler(signum: int, frame: Any) -> None:
    """Handle shutdown signals gracefully."""
    signal_name = signal.Signals(signum).name
    logger.info(
        f"Received signal {signal_name} ({signum}), initiating graceful shutdown..."
    )
    shutdown_event.set()


def setup_signal_handlers() -> None:
    """Set up signal handlers for graceful shutdown."""
    # Handle SIGINT (Ctrl+C) and SIGTERM
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # On Unix systems, also handle SIGHUP
    if hasattr(signal, "SIGHUP"):
        signal.signal(signal.SIGHUP, signal_handler)


@server.list_resources()  # type: ignore
async def handle_list_resources() -> list[types.Resource]:
    """List available resources."""
    return [
        types.Resource(
            uri=AnyUrl("onemcp://server/info"),
            name="Server Information",
            description="Information about the OneMCP server",
            mimeType="application/json",
        ),
        types.Resource(
            uri=AnyUrl("onemcp://server/status"),
            name="Server Status",
            description="Current status of the OneMCP server",
            mimeType="application/json",
        ),
    ]


@server.read_resource()  # type: ignore
async def handle_read_resource(uri: AnyUrl) -> str:
    """Read a specific resource."""
    if uri.scheme != "onemcp":
        raise ValueError(f"Unsupported URI scheme: {uri.scheme}")

    path = str(uri).replace("onemcp://", "")

    if path == "server/info":
        return """{
    "name": "OneMCP Server",
    "version": "0.1.0",
    "description": "A hello world MCP Server implementation in Python",
    "author": "Pedro Henrique Penna",
    "capabilities": [
        "say_hello tool",
        "get_greeting tool",
        "server info resource",
        "server status resource"
    ]
}"""
    elif path == "server/status":
        return """{
    "status": "running",
    "uptime": "just started",
    "memory_usage": "minimal",
    "active_connections": 1
}"""
    else:
        raise ValueError(f"Unknown resource path: {path}")


@server.list_tools()  # type: ignore
async def handle_list_tools() -> list[types.Tool]:
    """List available tools."""
    return [
        types.Tool(
            name="say_hello",
            description="Say hello to someone with a personalized greeting",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the person to greet",
                    },
                    "language": {
                        "type": "string",
                        "description": "Language for the greeting",
                        "enum": ["english", "spanish", "french", "portuguese"],
                        "default": "english",
                    },
                },
                "required": ["name"],
            },
        ),
        types.Tool(
            name="get_greeting",
            description="Get a random greeting message",
            inputSchema={
                "type": "object",
                "properties": {
                    "formal": {
                        "type": "boolean",
                        "description": "Whether to use formal language",
                        "default": False,
                    }
                },
                "required": [],
            },
        ),
    ]


@server.call_tool()  # type: ignore
async def handle_call_tool(
    name: str, arguments: dict[str, Any] | None
) -> list[types.TextContent]:
    """Handle tool execution."""
    if arguments is None:
        arguments = {}

    if name == "say_hello":
        person_name = arguments.get("name", "World")
        language = arguments.get("language", "english").lower()

        greetings = {
            "english": f"Hello, {person_name}! Welcome to OneMCP Server!",
            "spanish": f"¡Hola, {person_name}! ¡Bienvenido al Servidor OneMCP!",
            "french": f"Bonjour, {person_name}! Bienvenue sur le serveur OneMCP!",
            "portuguese": f"Olá, {person_name}! Bem-vindo ao Servidor OneMCP!",
        }

        greeting = greetings.get(language, greetings["english"])

        return [
            types.TextContent(
                type="text",
                text=f"{greeting}\n\n"
                f"This is a hello world MCP server implementation. "
                f"You can use this server to test MCP functionality.",
            )
        ]

    elif name == "get_greeting":
        formal = arguments.get("formal", False)

        if formal:
            greeting_messages = [
                "Good day to you.",
                "I hope this message finds you well.",
                "It is a pleasure to make your acquaintance.",
                "May I extend my warmest greetings.",
            ]
        else:
            greeting_messages = [
                "Hey there! 👋",
                "What's up! 🚀",
                "Howdy! 🤠",
                "Greetings, fellow human! 🤖",
                "Hello from the OneMCP server! 💫",
            ]

        selected_greeting: str = random.choice(greeting_messages)

        return [
            types.TextContent(
                type="text",
                text=f"{selected_greeting}\n\n"
                f"Random greeting generated from OneMCP server. "
                f"Formal mode: {'enabled' if formal else 'disabled'}",
            )
        ]

    else:
        raise ValueError(f"Unknown tool: {name}")


async def main() -> None:
    """Main entry point for the MCP server."""
    logger.info("Starting OneMCP server...")

    # Set up signal handlers for graceful shutdown
    setup_signal_handlers()

    try:
        # Run the server using stdin/stdout streams
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            # Create a task for running the server
            server_task = asyncio.create_task(
                server.run(
                    read_stream,
                    write_stream,
                    InitializationOptions(
                        server_name="onemcp",
                        server_version="0.1.0",
                        capabilities=ServerCapabilities(),
                    ),
                )
            )

            # Create a task for monitoring EOF on stdin
            eof_task = asyncio.create_task(monitor_stdin_eof())

            # Wait for either the server to complete, a shutdown signal, or EOF
            done, pending = await asyncio.wait(
                [server_task, eof_task, asyncio.create_task(shutdown_event.wait())],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel any remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            # Check if any task raised an exception
            for task in done:
                exception = task.exception()
                if exception:
                    raise exception

    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except EOFError:
        logger.info("Received EOF, shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise
    finally:
        logger.info("OneMCP server shutdown complete.")


async def monitor_stdin_eof() -> None:
    """Monitor stdin for EOF (Ctrl+D) and trigger shutdown."""
    try:
        # Check if stdin is available and not closed
        if sys.stdin.isatty():
            # For interactive terminals, we can't easily monitor for EOF
            # without blocking, so we'll rely on signal handlers
            await asyncio.sleep(float("inf"))
        else:
            # For non-interactive stdin (pipes, etc.), monitor for EOF
            loop = asyncio.get_event_loop()
            reader = asyncio.StreamReader()
            protocol = asyncio.StreamReaderProtocol(reader)
            await loop.connect_read_pipe(lambda: protocol, sys.stdin)

            # Try to read from stdin - will raise EOF when closed
            try:
                while True:
                    data = await reader.read(1)
                    if not data:  # EOF
                        logger.info("Detected EOF on stdin")
                        shutdown_event.set()
                        break
            except Exception:
                # EOF or other error
                logger.info("Stdin closed or error occurred")
                shutdown_event.set()
    except Exception as e:
        logger.debug(f"Error monitoring stdin: {e}")
        # Don't trigger shutdown for monitoring errors


if __name__ == "__main__":
    asyncio.run(main())
