// dev-server-sab.ts
//
// Purpose: Static dev server with COOP/COEP headers for SharedArrayBuffer
//
// This module:
// - Serves website/ on a configurable port
// - Sets Cross-Origin-Opener-Policy: same-origin
// - Sets Cross-Origin-Embedder-Policy: require-corp
// - No live-reload (multi-tab safe)
//
// Usage: bun scripts/dev-server-sab.ts [port]

const port: number = parseInt(process.argv[2] || "4000", 10);
const rootDir: string = "website";

console.log(
	`Serving ${rootDir}/ on http://localhost:${port} with COOP/COEP headers`,
);

Bun.serve({
	port,
	fetch(request: Request): Response {
		const url = new URL(request.url);
		const filePath = url.pathname === "/" ? "/index_debug.html" : url.pathname;
		const file = Bun.file(`${rootDir}${filePath}`);

		return new Response(file, {
			headers: {
				"Cross-Origin-Opener-Policy": "same-origin",
				"Cross-Origin-Embedder-Policy": "require-corp",
			},
		});
	},
	error(_error: Error): Response {
		return new Response("Not Found", { status: 404 });
	},
});
