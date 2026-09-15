import type { Handler } from '@netlify/functions';
import { getDefaultApp } from '../../server/app';

function parseBody(body: string | null, isBase64Encoded: boolean): unknown {
  if (!body) return undefined;
  try {
    const text = isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
    return JSON.parse(text);
  } catch {
    return body;
  }
}

export const handler: Handler = async (event) => {
  try {
    const { app } = await getDefaultApp();
    const url = new URL(event.rawUrl || `http://${event.headers.host ?? 'localhost'}${event.path}`);
    const response = await app.handle({
      method: event.httpMethod,
      path: `${url.pathname}${url.search}`,
      headers: event.headers,
      body: parseBody(event.body, event.isBase64Encoded),
    });
    return { statusCode: response.statusCode, headers: response.headers, body: JSON.stringify(response.body) };
  } catch (error) {
    // Do not expose database URLs, credentials, stack traces or driver output.
    const message = error instanceof Error && error.message.includes('DATABASE_URL')
      ? 'API local chưa được cấu hình cơ sở dữ liệu.'
      : 'API tạm thời chưa sẵn sàng; hãy kiểm tra kết nối rồi thử lại.';
    return { statusCode: 503, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ ok: false, code: 'unavailable', message }) };
  }
};

export default handler;
