import { NextResponse } from 'next/server';
import { addSSEClient, removeSSEClient } from '@/lib/gmail/sse';
import { getOAuthSession } from '@/lib/gmail/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getOAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(clientId, controller);

      // Send initial connected payload & heartbeat timer
      const initialPayload = `event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialPayload));

      const interval = setInterval(() => {
        try {
          const pingPayload = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(pingPayload));
        } catch {
          clearInterval(interval);
          removeSSEClient(clientId);
        }
      }, 25000);

      // Return cleanup handler
      return () => {
        clearInterval(interval);
        removeSSEClient(clientId);
      };
    },
    cancel() {
      removeSSEClient(clientId);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
