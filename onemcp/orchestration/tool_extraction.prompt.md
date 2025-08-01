Analyze the provided query and its historical context to create a structured task breakdown:

1. Review the current query and all relevant conversation history to ensure complete context
2. Generate a comprehensive rewrite of the query incorporating all pertinent historical information
3. Break down the enhanced query into discrete, actionable tasks
4. Create a JSON array that specifies:
   - Individual task descriptions
   - Required inputs or preconditions
   - Expected outputs or success criteria
5. Format the JSON array using standard indentation and proper syntax
6. Validate that all tasks align with the original query intent
7. Ensure each task is specific, measurable, and achievable

The output should be a valid JSON array with the following schema:
```json
{
  "tasks": [
    {
      "id": "string",
      "description": "string",
      "dependencies": ["string"],
      "inputs": ["string"],
      "outputs": ["string"]
    }
  ]
}
```