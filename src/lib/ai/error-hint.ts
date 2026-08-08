/** Map provider failures to a human action. The most common case is an
 * expired or revoked key, which surfaces as `401` / `AuthError` / "invalid api
 * key" from OpenAI-compatible endpoints. */
export const KEY_RE = /401|auth|invalid api key|unauthorized|认证失败|密钥/i;

export function friendlyAiError(raw: string): string {
  if (KEY_RE.test(raw)) {
    return `API Key 无效或已过期，请到 Settings → AI 总结 更新（原始错误：${raw.slice(0, 120)}）`;
  }
  return raw;
}
