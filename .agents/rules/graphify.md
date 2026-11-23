# Knowledge Graph Fast-Path Navigation

Always query the pre-built `graphify` knowledge graph (`graphify-out/graph.json`) before performing raw text searches or broad file scans on the OGameNexus codebase:
- Use MCP tool `graphify:query_graph` to answer structural, data-flow, and module dependency questions.
- Use `graphify:get_node` and `graphify:get_neighbors` for targeted symbol tracing.
- Use `graphify:shortest_path` to find the chain of calls or dependencies between two components.
- Run `& (Get-Content graphify-out\.graphify_python) -m graphify --update` after creating new files or restructuring existing modules to keep the graph fresh.
