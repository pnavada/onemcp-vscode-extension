import uuid
from typing import Union

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    response_code: str
    error_description: str


#
# Discover
#
class DiscoverRequest(BaseModel):
    repository_url: str


class Tool(BaseModel):
    name: str
    description: str


class BootstrapMetadata(BaseModel):
    version: str
    config: dict[str, str]


class DiscoverResponse(BaseModel):
    response_code: str
    overview: str
    tools: list[Tool]
    bootstrap_metadata: BootstrapMetadata


#
# Start
#
class StartRequest(BaseModel):
    bootstrap_metadata: BootstrapMetadata


class StartResponse(BaseModel):
    response_code: str
    sandbox_id: str
    endpoint: str


#
# Stop
#
class StopRequest(BaseModel):
    sandbox_id: str


class StopResponse(BaseModel):
    response_code: str


#
# MockSandbox
#
class MockSandbox:
    def __init__(self) -> None:
        # Mock storage for sandbox instances
        self._sandbox_instances: dict[str, dict] = {}

    def discover(self, payload: DiscoverRequest) -> DiscoverResponse:
        """Handle DISCOVER requests"""
        return DiscoverResponse(
            response_code="SUCCESS",
            overview="Mock MCP Server for testing",
            tools=[Tool(name="test_tool", description="A test tool for demonstration")],
            bootstrap_metadata=BootstrapMetadata(
                version="1.0.0", config={"test_param": "test_value"}
            ),
        )

    def start(self, payload: StartRequest) -> StartResponse:
        """Handle START requests"""
        sandbox_id = str(uuid.uuid4())

        # Store sandbox instance
        self._sandbox_instances[sandbox_id] = {
            "status": "running",
            "metadata": payload.bootstrap_metadata,
        }

        return StartResponse(
            response_code="SUCCESS",
            sandbox_id=sandbox_id,
            endpoint="localhost:8080",  # Mock endpoint
        )

    def stop(self, payload: StopRequest) -> Union[StopResponse, ErrorResponse]:
        """Handle STOP requests"""
        if payload.sandbox_id not in self._sandbox_instances:
            return ErrorResponse(
                response_code="ERROR",
                error_description=f"No sandbox found with ID: {payload.sandbox_id}",
            )

        # Remove the sandbox instance
        del self._sandbox_instances[payload.sandbox_id]
        return StopResponse(response_code="SUCCESS")


# Example usage
if __name__ == "__main__":
    sandbox = MockSandbox()

    # Example calls
    discover_payload = DiscoverRequest(repository_url="https://example.com/repo.git")
    discover_response = sandbox.discover(discover_payload)
    print(discover_response.overview)

    start_payload = StartRequest(
        bootstrap_metadata=BootstrapMetadata(
            version="1.0.0", config={"test_param": "test_value"}
        )
    )
    start_response = sandbox.start(start_payload)
    print(start_response.sandbox_id)

    stop_payload = StopRequest(sandbox_id=start_response.sandbox_id)
    stop_response = sandbox.stop(stop_payload)
    if isinstance(stop_response, StopResponse):
        print(stop_response.response_code)
    else:
        print(stop_response.error_description)
