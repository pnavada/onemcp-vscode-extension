from difflib import SequenceMatcher


class ServerEntry:
    def __init__(self, name: str, url: str):
        self.name = name
        self.url = url


class MockRegistry:
    def __init__(self) -> None:
        self._servers: dict[str, ServerEntry] = {}

    def register_server(self, name: str, url: str) -> None:
        """
        Register a new server with the given name and URL.

        Args:
            name: Unique identifier for the server
            url: URL pointing to the server repository or website
        """
        self._servers[name] = ServerEntry(name, url)

    def get_server(self, name: str) -> ServerEntry:
        """
        Retrieve a server by exact name match.

        Args:
            name: Server name to look up

        Returns:
            ServerEntry if found

        Raises:
            KeyError if server not found
        """
        return self._servers[name]

    def list_servers(self) -> list[ServerEntry]:
        """
        Get a list of all registered servers.

        Returns:
            List of all ServerEntry objects
        """
        return list(self._servers.values())

    def find_similar_servers(
        self, query: str, k: int = 5
    ) -> list[tuple[ServerEntry, float]]:
        """
        Find top K servers with names most similar to the query string.

        Args:
            query: Search string to compare against server names
            k: Maximum number of results to return (default 5)

        Returns:
            List of tuples containing (ServerEntry, similarity_score)
            sorted by similarity score in descending order
        """

        def similarity(s1: str, s2: str) -> float:
            return SequenceMatcher(None, s1.lower(), s2.lower()).ratio()

        # Calculate similarity scores for all servers
        scored_servers = [
            (server, similarity(query, server.name))
            for server in self._servers.values()
        ]

        # Sort by similarity score in descending order and take top k
        return sorted(scored_servers, key=lambda x: x[1], reverse=True)[:k]
