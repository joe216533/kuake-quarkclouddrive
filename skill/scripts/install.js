#!/usr/bin/env node
/**
 * quark-asset-ops 安装器
 *
 * 目标：让用户只发一条直链，本技能自动准备好底层夸克 CLI 并验证可用。
 *
 * 策略（离线优先、在线兜底）：
 *   1. 若 runtime/quark-drive.cjs 已存在且版本达标 → 直接使用
 *   2. 否则向夸克官方公开接口取当前版本与下载地址
 *   3. 下载官方包，仅抽取 scripts/quark-drive.cjs 与 scripts/hash-worker.cjs 到 runtime/
 *   4. 记录 SHA256 与版本，写入 runtime/runtime-manifest.json
 *   5. 调用 verify.js 验证四项能力
 *
 * 说明：不在本仓库内再分发官方文件，而是安装时从官方地址现取，
 *      避免再分发许可问题；同时保留包内 runtime/ 作为离线兜底位置。
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const https = require('https');
const { execFileSync } = require('child_process');

const SKILL_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(SKILL_DIR, 'runtime');
const CLI_PATH = path.join(RUNTIME_DIR, 'quark-drive.cjs');
const HASH_PATH = path.join(RUNTIME_DIR, 'hash-worker.cjs');
const MANIFEST_PATH = path.join(RUNTIME_DIR, 'runtime-manifest.json');

const CONFIG_URL = 'https://open-api-drive.quark.cn/agent/v1/skill_config';
const MIN_VERSION = '1.0.25';
const UA = 'quark-asset-ops/1.0.0';

function log(msg) { console.log(`[install] ${msg}`); }
function fail(msg) { console.error(`[install] ERROR: ${msg}`); process.exit(1); }

function normVersion(v) {
  // 去掉 -876f30d 之类的构建后缀，只比较数字段
  return String(v || '').trim().replace(/^v/i, '').replace(/[^0-9.].*$/, '');
}

function cmpVersion(a, b) {
  const pa = normVersion(a).split('.').map((x) => Number(x) || 0);
  const pb = normVersion(b).split('.').map((x) => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function httpGet(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('重定向次数过多'));
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpGet(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

/** 极简 zip 读取：支持 stored(0) 与 deflate(8)，按中央目录定位条目 */
function readZipEntries(buf) {
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('不是有效的 zip 文件');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    entries.set(name, { method, compSize, localOff });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return {
    has: (name) => entries.has(name),
    read: (name) => {
      const e = entries.get(name);
      if (!e) throw new Error(`zip 内缺少 ${name}`);
      const lo = e.localOff;
      const nameLen = buf.readUInt16LE(lo + 26);
      const extraLen = buf.readUInt16LE(lo + 28);
      const dataStart = lo + 30 + nameLen + extraLen;
      const data = buf.subarray(dataStart, dataStart + e.compSize);
      return e.method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data);
    }
  };
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function cliVersion(cliPath) {
  try {
    const out = execFileSync(process.execPath, [cliPath, '--version'], {
      encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']
    });
    return out.trim().split('\n')[0];
  } catch (e) {
    return null;
  }
}

async function fetchConfig() {
  const reqId = crypto.randomUUID();
  const raw = await httpGet(`${CONFIG_URL}?req_id=${reqId}`);
  const json = JSON.parse(raw.toString('utf8'));
  if (json.status !== 0 || !json.data || !json.data.config) {
    throw new Error(`skill_config 返回异常: ${raw.toString('utf8').slice(0, 200)}`);
  }
  const { qkPanVersion, qkPan } = json.data.config;
  if (!/^https?:\/\//.test(qkPan || '')) throw new Error('接口未返回有效下载地址');
  return { version: qkPanVersion, url: qkPan };
}

async function install() {
  log(`技能目录: ${SKILL_DIR}`);
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  // 1) 已有可用组件
  if (fs.existsSync(CLI_PATH)) {
    const v = cliVersion(CLI_PATH);
    if (v && cmpVersion(v, MIN_VERSION) >= 0) {
      log(`已存在可用 CLI: ${v}，跳过下载`);
      return finish(v, 'local');
    }
    log(`本地 CLI 版本 ${v || '未知'} 低于要求 ${MIN_VERSION}，准备更新`);
  }

  // 2) 取官方配置
  log('向官方接口查询当前版本…');
  const cfg = await fetchConfig();
  log(`官方版本 ${cfg.version}：${cfg.url}`);
  if (cmpVersion(cfg.version, MIN_VERSION) < 0) {
    throw new Error(`官方版本 ${cfg.version} 低于最低要求 ${MIN_VERSION}`);
  }

  // 3) 下载并抽取
  log('下载官方组件包…');
  const zipBuf = await httpGet(cfg.url);
  log(`下载完成 ${(zipBuf.length / 1024).toFixed(0)} KB`);

  const zip = readZipEntries(zipBuf);
  const cliEntry = 'scripts/quark-drive.cjs';
  const hashEntry = 'scripts/hash-worker.cjs';
  if (!zip.has(cliEntry)) throw new Error(`官方包内缺少 ${cliEntry}`);

  const cliBuf = zip.read(cliEntry);
  fs.writeFileSync(CLI_PATH, cliBuf);
  if (zip.has(hashEntry)) fs.writeFileSync(HASH_PATH, zip.read(hashEntry));
  log(`已写入 runtime/quark-drive.cjs (${cliBuf.length} bytes)`);

  // 4) 校验版本
  const v = cliVersion(CLI_PATH);
  if (!v) throw new Error('CLI 写入后无法执行，安装失败');
  log(`CLI 可执行，版本 ${v}`);

  const rec = {
    skill: 'quark-asset-ops',
    runtime: {
      name: 'quark-drive.cjs',
      version: v,
      source: cfg.url,
      source_version: cfg.version,
      sha256: sha256(cliBuf),
      installed_at: new Date().toISOString()
    }
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(rec, null, 2));
  log('已写入 runtime/runtime-manifest.json');

  return finish(v, 'downloaded');
}

function finish(version, mode) {
  log(`安装完成（${mode}），版本 ${version}`);
  log('开始能力验证…');
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'verify.js')], {
      stdio: 'inherit', timeout: 120000
    });
  } catch (e) {
    if (e.status === 2) {
      log('安装完成，但账号尚未授权。');
      log('下一步：运行 node runtime/quark-drive.cjs login，把二维码给用户扫码；授权后重跑 verify.js。');
      process.exit(2);
    }
    fail('能力验证未通过，请查看上方输出');
  }
}

if (require.main === module) {
  install().catch((e) => fail(e.message));
}

module.exports = { install, readZipEntries, cmpVersion };
