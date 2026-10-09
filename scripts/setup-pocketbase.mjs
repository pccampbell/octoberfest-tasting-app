import { createHash } from 'node:crypto';
import { mkdir, writeFile, chmod, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export const version = '0.40.5';
export const binary = resolve(
  '.tools',
  process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase',
);
const platform = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[process.platform];
const arch = { x64: 'amd64', arm64: 'arm64' }[process.arch];
const checksums = {
  windows_amd64: 'd0980d1f3a8097ff4c03a876e8c98f3008a83c0d42cc03b636bc92b2d4788d1c',
  windows_arm64: '7dd0d7c500812cac571e450525595b93556527161b1eb86493dabdfc31974ef5',
  linux_amd64: '1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4',
  linux_arm64: '570baa1c45d2fb92fc0073582b945ca0ece03cbf9837ccabf49a222f99dd02e3',
  darwin_amd64: '3640f0c4d9e0e5a47e321f10ddf6698508d4f20721bcf5dfb7c4192835e5105f',
  darwin_arm64: 'd9a176e0491bc825fff88c2a4edffb07307f785ac2bd9710e82c5d223669fc17',
};
try {
  await access(binary);
  const found = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  if (found.stdout.trim().endsWith(` ${version}`)) {
    console.log(`PocketBase ${version} already installed.`);
    process.exit(0);
  }
} catch {
  /* Install below. */
}
if (!platform || !arch)
  throw new Error('Use a supported x64 or arm64 Windows, Linux, or macOS machine.');
await mkdir('.tools', { recursive: true });
const filename = `pocketbase_${version}_${platform}_${arch}.zip`;
const response = await fetch(
  `https://github.com/pocketbase/pocketbase/releases/download/v${version}/${filename}`,
);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const zip = Buffer.from(await response.arrayBuffer());
if (createHash('sha256').update(zip).digest('hex') !== checksums[`${platform}_${arch}`])
  throw new Error('PocketBase checksum mismatch.');
const archive = resolve('.tools/pocketbase.zip');
await writeFile(archive, zip);
const result =
  process.platform === 'win32'
    ? spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          "Expand-Archive -LiteralPath '.tools/pocketbase.zip' -DestinationPath '.tools' -Force",
        ],
        { stdio: 'inherit' },
      )
    : spawnSync('unzip', ['-o', archive, '-d', resolve('.tools')], {
        stdio: 'inherit',
      });
if (result.status !== 0)
  throw new Error('Extraction failed. Install unzip or extract .tools/pocketbase.zip manually.');
if (process.platform !== 'win32') await chmod(binary, 0o755);
console.log(`Installed PocketBase ${version}.`);
