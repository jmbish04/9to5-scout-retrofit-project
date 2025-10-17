export async function handleScrapeSocket(request, env) {
    const auth = request.headers.get("Authorization") || "";
    const expected = `Bearer ${env.WORKER_API_KEY}`;
    let diff = auth.length ^ expected.length;
    for (let i = 0; i < auth.length && i < expected.length; i++) {
        diff |= auth.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (diff !== 0) {
        return new Response("Unauthorized", { status: 401 });
    }
    const id = env.SCRAPE_SOCKET.idFromName("default");
    const stub = env.SCRAPE_SOCKET.get(id);
    return stub.fetch(request);
}
export async function handleScrapeDispatch(request, env) {
    const id = env.SCRAPE_SOCKET.idFromName("default");
    const stub = env.SCRAPE_SOCKET.get(id);
    const body = await request.text();
    return stub.fetch("https://dummy/dispatch", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
    });
}
