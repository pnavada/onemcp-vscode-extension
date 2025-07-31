from mcp.server.fastmcp import Context, FastMCP
from mcp.server.fastmcp.prompts import base
from mcp.types import SamplingMessage, TextContent
import os

server = FastMCP(
    name="OneMCP Orchestrator",
    description="Dynamic MCP Orchestrator for managing tools and resources",
    port=8080
)

@server.tool()
async def plan(query: str, ctx: Context) -> list[base.Message]:
    """Gives a detailed orchestration plan for the given query."""

    prompt = f"Create a detailed orchestration plan for the query: {query}"

    result = await ctx.session.create_message(
        messages=[
            SamplingMessage(
                role="user",
                content=TextContent(type="text", text=prompt),
            )
        ],
        max_tokens=100,
    )

    if result.content.type == "text":
        return [base.Message(role="user", content=result.content.text)]
    return [base.Message(role="user", content=str(result.content))]


@server.tool()
async def orchestrate(query: str, ctx: Context) -> list[base.Message]:
    """Evaluates and dynamically orchestrates tools for a given user query."""
    prompt = (
        f"Analyze the query '{query}' and determine the appropriate tools to invoke."
    )

    result = await ctx.session.create_message(
        messages=[
            SamplingMessage(
                role="user",
                content=TextContent(type="text", text=prompt),
            )
        ],
        max_tokens=150,
    )

    if result.content.type == "text":
        return [base.Message(role="user", content=result.content.text)]
    return [base.Message(role="user", content=str(result.content))]


@server.tool()
async def install(query: str, ctx: Context) -> list[base.Message]:
    """Installs an MCP server."""
    try:
        # Simulate installation logic
        installation_result = f"Installing MCP server with query: {query}"
        await ctx.session.create_message(
            messages=[
                SamplingMessage(
                    role="user",
                    content=TextContent(type="text", text=installation_result),
                )
            ],
            max_tokens=50,
        )
        return [
            base.Message(role="system", content="MCP server installation successful.")
        ]
    except Exception as e:
        return [base.Message(role="system", content=f"Installation failed: {str(e)}")]


@server.tool()
async def uninstall(query: str, ctx: Context) -> list[base.Message]:
    """Uninstalls an MCP server."""
    # Placeholder for uninstallation logic
    # TODO: Implement actual uninstallation logic for MCP server
    return [base.Message(role="user", content="Uninstallation logic not implemented")]


@server.tool()
async def status(query: str, ctx: Context) -> list[base.Message]:
    """Checks the status of an MCP server."""
    return [base.Message(role="user", content="hello")]


@server.tool()
async def search(query: str, ctx: Context) -> list[base.Message]:
    """Searches for a specific resource or tool."""
    prompt = f"Search for resources or tools related to: {query}"

    result = await ctx.session.create_message(
        messages=[
            SamplingMessage(
                role="user",
                content=TextContent(type="text", text=prompt),
            )
        ],
        max_tokens=100,
    )

    if result.content.type == "text":
        return [base.Message(role="user", content=result.content.text)]
    return [base.Message(role="user", content=str(result.content))]


if __name__ == "__main__":
    with open('orchestrator.pid', 'w') as f:
        f.write(str(os.getpid()))
    server.run(transport="streamable-http")
