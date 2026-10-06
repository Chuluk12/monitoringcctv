const crypto = require('crypto');
const { decrypt } = require('./crypto');

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

function unescapeXml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function xmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? unescapeXml(match[1].trim()) : null;
}

function digestChallenge(header) {
  if (!header || !/^Digest\s/i.test(header)) return null;
  const fields = {};
  for (const match of header.matchAll(/([a-z]+)=(?:"([^"]*)"|([^,\s]+))/gi)) {
    fields[match[1].toLowerCase()] = match[2] ?? match[3];
  }
  return fields.realm && fields.nonce ? fields : null;
}

function digestAuthorization({ username, password, method, uri, challenge }) {
  const qop = (challenge.qop || '').split(',').map((v) => v.trim()).find((v) => v === 'auth');
  const algorithm = (challenge.algorithm || 'MD5').toUpperCase();
  const cnonce = crypto.randomBytes(12).toString('hex');
  const nc = '00000001';
  let ha1 = md5(`${username}:${challenge.realm}:${password}`);
  if (algorithm === 'MD5-SESS') ha1 = md5(`${ha1}:${challenge.nonce}:${cnonce}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${challenge.nonce}:${ha2}`);
  const fields = [
    `username="${username}"`, `realm="${challenge.realm}"`, `nonce="${challenge.nonce}"`,
    `uri="${uri}"`, `response="${response}"`, `algorithm=${challenge.algorithm || 'MD5'}`,
  ];
  if (challenge.opaque) fields.push(`opaque="${challenge.opaque}"`);
  if (qop) fields.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  return `Digest ${fields.join(', ')}`;
}

async function hikvisionGet(nvr, path) {
  const password = nvr.password_enc ? decrypt(nvr.password_enc) : '';
  if (!nvr.username || !password) throw new Error('Username dan password NVR wajib diisi sebelum scan kamera');
  const url = `http://${nvr.ip_address}:${nvr.http_port}${path}`;
  const basic = `Basic ${Buffer.from(`${nvr.username}:${password}`).toString('base64')}`;
  let response = await fetch(url, { headers: { Authorization: basic } });
  if (response.status !== 401) return response;

  const challenge = digestChallenge(response.headers.get('www-authenticate'));
  if (!challenge) return response;
  const authorization = digestAuthorization({ username: nvr.username, password, method: 'GET', uri: path, challenge });
  return fetch(url, { headers: { Authorization: authorization } });
}

async function discoverChannels(nvr) {
  const response = await hikvisionGet(nvr, '/ISAPI/ContentMgmt/InputProxy/channels');
  if (response.status === 401) throw new Error('NVR menolak login ISAPI (HTTP 401). Periksa username/password NVR yang tersimpan, lalu coba lagi setelah akun tidak terkunci.');
  if (!response.ok) throw new Error(`Hikvision ISAPI gagal: HTTP ${response.status}`);
  const xml = await response.text();
  const matches = [...xml.matchAll(/<InputProxyChannel(?:\s[^>]*)?>([\s\S]*?)<\/InputProxyChannel>/gi)];
  const channels = matches.map((match) => {
    const id = Number.parseInt(xmlValue(match[1], 'id'), 10);
    const name = xmlValue(match[1], 'name') || `Channel ${id}`;
    return Number.isInteger(id) && id > 0 ? { channelNo: id, name } : null;
  }).filter(Boolean);
  if (!channels.length) throw new Error('Tidak ada channel yang ditemukan. Pastikan ISAPI aktif pada NVR Hikvision.');
  return channels;
}

module.exports = { discoverChannels };
