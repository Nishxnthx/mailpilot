type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

// Use globalThis so connected SSE clients persist across Next.js API route invocations
const globalForSSE = globalThis as unknown as {
  __gmailSSEClients?: Map<string, SSEClient>;
};

const sseClients =
  globalForSSE.__gmailSSEClients ??
  (globalForSSE.__gmailSSEClients = new Map<string, SSEClient>());

/**
 * Registers a new SSE client connection stream.
 */
export function addSSEClient(id: string, controller: ReadableStreamDefaultController) {
  sseClients.set(id, { id, controller });
  console.log(`[SSE Manager]: Added client ${id}. Active stream clients: ${sseClients.size}`);
}

/**
 * Removes an SSE client connection stream.
 */
export function removeSSEClient(id: string) {
  sseClients.delete(id);
  console.log(`[SSE Manager]: Removed client ${id}. Active stream clients: ${sseClients.size}`);
}

/**
 * Broadcasts an event payload to all connected client streams.
 */
export function broadcastSSEEvent(event: string, data: Record<string, unknown>) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(payload);

  for (const [id, client] of sseClients.entries()) {
    try {
      client.controller.enqueue(bytes);
    } catch (err) {
      console.warn(`[SSE Manager]: Failed to write to client ${id}, removing.`, err);
      sseClients.delete(id);
    }
  }
}
