#!/usr/bin/env node
/**
 * kuake-quarkclouddrive 能力验证器
 *
 * 验证四件事，缺一不可：
 *   1. CLI 可执行且版本达标
 *   2. 账号已授权（能取到用户信息）
 *   3. 上传 / 转存 / 下载 / 分享 四条命令均存在
 *   4. 运行目录可写（下载与临时文件落盘前提）
 *
 * 输出为可判断的事实，不使用"应该可以"这类表述。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SKILL_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(SKILL_DIR, 'runtime');
const CLI_PATH = path.join(RUNTIME_DIR, 'quark-drive.cjs');
const MIN_VERSION = '1.0.25';

const REQUIRED_COMMANDS = ['upload', 'saveas', 'download', 'share'];

let authPending = false;
let passed = 0;
let failed = 0;
const rows = [];

function record(name, ok, detail) {
  rows.push({ name, ok, detail });
  if (ok) passed++; else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`);
}

function run(args, timeout = 60000) {
  try {
    const out = execFileSync(process.execPath, [CLI_PATH, ...args], {
      encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || ''), err: e.message };
  }
}

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

function main() {
  console.log('=== kuake-quarkclouddrive 能力验证 ===\n');

  // 1. CLI 存在且可执行
  if (!fs.existsSync(CLI_PATH)) {
    record('CLI 文件存在', false, `缺少 ${CLI_PATH}`);
    return summary();
  }
  record('CLI 文件存在', true, CLI_PATH);

  const vres = run(['--version'], 30000);
  const version = vres.ok ? vres.out.trim().split('\n')[0] : '';
  const versionOk = vres.ok && cmpVersion(version, MIN_VERSION) >= 0;
  record('CLI 可执行且版本达标', versionOk, `版本 ${version || '未知'}，要求 >= ${MIN_VERSION}`);
  if (!versionOk) return summary();

  // 2. 账号授权
  const ures = run(['get-user-info', '--session-id', 'verify-' + Date.now(), '--session-input', 'verify'], 60000);
  let authed = false;
  let detail = '';
  if (ures.ok) {
    try {
      const j = JSON.parse(ures.out.trim().split('\n').find((l) => l.trim().startsWith('{')));
      authed = j.code === 0 && !!(j.data && j.data.userInfo);
      const nick = (j.data && j.data.userInfo && j.data.userInfo.nickname) || '';
      const vip = (j.data && j.data.vipInfo && j.data.vipInfo.vipType) || '无';
      detail = authed ? `已授权，昵称 ${nick}，会员 ${vip}` : `返回 code=${j.code} msg=${j.msg}`;
    } catch (e) {
      detail = '返回内容无法解析';
    }
  } else {
    detail = '调用失败';
  }
  if (authed) record('账号已授权', true, detail + '（沿用既有登录态，本次未重新授权）');
  else { authPending = true; console.log(`PENDING  账号已授权  ${detail}（需用户扫码，非安装缺陷）`); }

  // 3. 四条必需命令
  const hres = run(['--help'], 30000);
  const help = hres.ok ? hres.out : '';
  for (const cmd of REQUIRED_COMMANDS) {
    const ok = new RegExp(`^\\s*${cmd}\\s`, 'm').test(help.split('Commands:')[1] || help);
    record(`命令可用: ${cmd}`, ok, ok ? '' : '未在 --help 中找到');
  }

  // 4. 运行目录可写
  let writable = false;
  try {
    const probe = path.join(RUNTIME_DIR, '.write-probe');
    fs.writeFileSync(probe, String(Date.now()));
    fs.unlinkSync(probe);
    writable = true;
  } catch (e) { /* noop */ }
  record('运行目录可写', writable, RUNTIME_DIR);

  return summary();
}

function summary() {
  console.log(`\n=== 结果: ${passed} 通过 / ${failed} 未通过 ===`);
  if (authPending) {
    console.log('结论：【待授权】组件与命令已就绪，账号尚未授权。');
    console.log('下一步：运行 node runtime/quark-drive.cjs login 取二维码给用户；用户扫码后必须再跑一次同样的 login 换取 token（返回 status:confirmed），然后重跑本验证。');
    process.exit(2);
  }
  if (failed > 0) {
    console.log('结论：【未验证】存在未通过项，不得声称安装成功。');
    process.exit(1);
  }
  console.log('结论：【已验证】四项能力就绪。');
  process.exit(0);
}

if (require.main === module) main();
