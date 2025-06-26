// Simple JWT generator for testing
import crypto from 'crypto';

function base64urlEscape(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlEncode(str) {
  return base64urlEscape(Buffer.from(str).toString('base64'));
}

function sign(message, secret) {
  return base64urlEscape(
    crypto.createHmac('sha256', secret).update(message).digest('base64')
  );
}

const header = {
  alg: 'HS256',
  typ: 'JWT',
};

const payload = {
  sub: 'api-testing-agent',
  tenant_id: 'default',
  roles: ['user', 'admin'],
  permissions: ['memory:read', 'memory:write', '*'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
};

const secret = 'development-secret-key-change-in-production';

const encodedHeader = base64urlEncode(JSON.stringify(header));
const encodedPayload = base64urlEncode(JSON.stringify(payload));
const signature = sign(encodedHeader + '.' + encodedPayload, secret);

const token = `${encodedHeader}.${encodedPayload}.${signature}`;

console.log('JWT Token:');
console.log(token);
