# OneMCP Architecture
There are 3 components: registry, sandbox, and orchestration. 

# Registry
The Registry runs on a remote server and maintains a list of available MCP servers. It periodically updates this list and uses sandbox routines to verify server installability and extract their available tools.

The Registry exposes an API to query available servers based on a task description. This uses vector embedding search to return the top K servers most relevant to the query.


# Sandbox
The Sandbox provides functions that wrap Docker commands to create, start, and stop containers.


# Orchestration
The Orchestrator manages interactions between the Registry and the Sandbox. Its responsibilities include:

* Querying the Registry for available servers.
* Create/Start/Stop/Delete sandboxes for selected servers.
* Tracking the state of MCP servers, including which are running.

The Orchestrator is installed via a VS Code extension, which launches a local MCP server to handle requests from any VS Code instance (multiple instances can run simultaneously).

## Task handling workflow
When a user submits a prompt, the Orchestrator:
1. Analyze the prompt to determine the required tasks.
2. Collects relevant tools for each task and augments the user's prompt with a subset of these tools for the LLM to use.


For each task, it will:
1. Checks locally running servers for the best match.
2. If none are suitable, queries the Registry for matching servers.
3. If a suitable server is found, installs or starts a sandbox for it.

The Orchestrator may also track historical usage for personalization and efficiency, such as shutting down or removing unused MCP servers.

## State Management
Since the orchestrator needs to manage state, we will need to take care that it is concurrency-safe with multiple access from different instances of VS Code.

We will need to store the running servers and the list of available tools that we can locally choose from. It will also need to be a vector embedding similarity search like the registry. The embedding encoder for the local system might be different to the registry, since we can only use the host LLM prompt - or a small local sentence transformer.