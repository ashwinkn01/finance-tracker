// Builds an unsigned JWT-shaped string so tests can control the `exp` claim.
// jwt-decode only reads the payload, so the signature part can be anything.
export function fakeJwt(expiresInSeconds: number, sub = 'testuser'): string {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'none' })}.${encode({ sub, exp })}.sig`;
}
