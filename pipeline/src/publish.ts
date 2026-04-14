import { Octokit } from '@octokit/rest'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } from './config.ts'

export async function publishRelease(
  dbPath: string,
  manifestPath: string,
): Promise<void> {
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    console.log('GitHub env vars not set — skipping publish')
    return
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN })
  const tag = `data-${new Date().toISOString().slice(0, 10)}`
  const name = `Dataset ${tag}`

  console.log(`Publishing release ${tag}...`)

  // Create (or overwrite) the release
  let releaseId: number
  try {
    const existing = await octokit.repos.getReleaseByTag({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      tag,
    })
    releaseId = existing.data.id
    console.log(`  Updating existing release ${releaseId}`)

    // Delete old assets so we can re-upload
    for (const asset of existing.data.assets) {
      await octokit.repos.deleteReleaseAsset({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        asset_id: asset.id,
      })
    }
  } catch {
    const created = await octokit.repos.createRelease({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      tag_name: tag,
      name,
      body: `Automated weekly dataset update.\nGenerated at: ${new Date().toISOString()}`,
      prerelease: false,
    })
    releaseId = created.data.id
    console.log(`  Created release ${releaseId}`)
  }

  // Upload assets
  for (const filePath of [dbPath, manifestPath]) {
    const data = readFileSync(filePath)
    const fileName = basename(filePath)
    const contentType = fileName.endsWith('.sqlite')
      ? 'application/octet-stream'
      : 'application/json'

    console.log(`  Uploading ${fileName} (${(data.byteLength / 1024).toFixed(1)} KB)`)

    await octokit.repos.uploadReleaseAsset({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      release_id: releaseId,
      name: fileName,
      // @ts-expect-error octokit types expect string but Buffer works
      data,
      headers: { 'content-type': contentType, 'content-length': data.byteLength },
    })
  }

  // Also update a stable `latest` release so the app always has a fixed URL
  await upsertLatestRelease(octokit, dbPath, manifestPath)

  console.log('  Published.')
}

async function upsertLatestRelease(
  octokit: Octokit,
  dbPath: string,
  manifestPath: string,
): Promise<void> {
  const tag = 'data-latest'
  let releaseId: number

  try {
    const existing = await octokit.repos.getReleaseByTag({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      tag,
    })
    releaseId = existing.data.id
    for (const asset of existing.data.assets) {
      await octokit.repos.deleteReleaseAsset({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        asset_id: asset.id,
      })
    }
  } catch {
    const created = await octokit.repos.createRelease({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      tag_name: tag,
      name: 'Latest dataset (auto-updated)',
      body: 'Always points to the most recent weekly dataset.',
      prerelease: false,
    })
    releaseId = created.data.id
  }

  for (const filePath of [dbPath, manifestPath]) {
    const data = readFileSync(filePath)
    const fileName = basename(filePath)
    const contentType = fileName.endsWith('.sqlite')
      ? 'application/octet-stream'
      : 'application/json'

    await octokit.repos.uploadReleaseAsset({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      release_id: releaseId,
      name: fileName,
      // @ts-expect-error octokit types expect string but Buffer works
      data,
      headers: { 'content-type': contentType, 'content-length': data.byteLength },
    })
  }

  console.log(`  Updated '${tag}' release`)
}
