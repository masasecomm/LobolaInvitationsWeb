export async function verifyTurnstileToken(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: false, error: 'Turnstile verification is not configured on the server.', status: 503 };
  }

  const form = new URLSearchParams({ secret, response: token });
  let result;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      console.error(`Turnstile verification service returned HTTP ${response.status}.`);
      return { success: false, error: 'Could not verify the security check. Please try again.', status: 502 };
    }
    result = await response.json();
  } catch (error) {
    console.error('Turnstile verification request failed.', error);
    return { success: false, error: 'Could not verify the security check. Please try again.', status: 502 };
  }

  const allowedHosts = ['lobolainvitation.co.za', 'www.lobolainvitation.co.za', 'localhost'];
  if (!result.success || !allowedHosts.includes(result.hostname)) {
    return { success: false, error: 'Security check failed. Please try again.', status: 400 };
  }
  return { success: true };
}
