import { NextResponse } from 'next/server';
import { getFirebaseAdminServices, getPrimaryAdminUid } from '@/lib/firebase/admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const uploadFolders = {
  cover: 'Admin Template Covers',
  element: 'Elements'
};
const githubRepository = 'masasecomm/LobolaInvitationsWeb';
const githubBranch = 'main';
const maxFileSize = 4 * 1024 * 1024;

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function getFirebaseClaims(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (
      payload.aud !== projectId
      || payload.iss !== `https://securetoken.google.com/${projectId}`
      || typeof payload.sub !== 'string'
      || payload.sub.length > 128
      || typeof payload.exp !== 'number'
      || payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function getImageExtension(mimeType, bytes) {
  if (
    mimeType === 'image/jpeg'
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  ) return 'jpg';

  if (
    mimeType === 'image/png'
    && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';

  if (
    mimeType === 'image/webp'
    && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';

  return null;
}

async function githubRequest(url, token, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Lobola-Invitation-Admin',
      ...options.headers
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000)
  });
}

export async function POST(request) {
  const githubToken = process.env.GITHUB_CONTENTS_TOKEN;
  if (!githubToken) {
    return jsonError('Image uploads are not configured yet. Add the repository-scoped GitHub token to Vercel as GITHUB_CONTENTS_TOKEN.', 503);
  }
  if (!projectId) {
    return jsonError('Firebase project configuration is missing on the server.', 503);
  }

  const authorization = request.headers.get('authorization') || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const claims = idToken ? getFirebaseClaims(idToken) : null;
  if (!claims) return jsonError('Sign in with an administrator account to upload a cover image.', 401);

  try {
    const { auth } = getFirebaseAdminServices();
    const verifiedClaims = await auth.verifyIdToken(idToken, true);
    const primaryAdminUid = await getPrimaryAdminUid();
    if (verifiedClaims.uid !== primaryAdminUid) {
      return jsonError('Only the configured primary administrator can upload cover images.', 403);
    }
  } catch (error) {
    if (error?.code === 'auth/id-token-expired' || error?.code === 'auth/invalid-id-token' || error?.code === 'auth/argument-error') {
      return jsonError('Your sign-in expired. Sign in again before uploading a cover image.', 401);
    }
    console.error('Could not verify image-upload administrator access.', error);
    return jsonError('Could not verify administrator access. Please try again.', 503);
  }

  let membershipResponse;
  try {
    const membershipUrl = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/admins/${encodeURIComponent(claims.sub)}`
    );
    membershipResponse = await fetch(membershipUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    console.error('Could not verify image-upload administrator membership.', error);
    return jsonError('Could not verify administrator access. Please try again.', 502);
  }

  if (membershipResponse.status === 401 || membershipResponse.status === 403 || membershipResponse.status === 404) {
    return jsonError('Only an authorized administrator can upload cover images.', 403);
  }
  if (!membershipResponse.ok) {
    console.error(`Firestore administrator verification returned HTTP ${membershipResponse.status}.`);
    return jsonError('Could not verify administrator access. Please try again.', 502);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxFileSize + 64 * 1024) {
    return jsonError('Choose an image smaller than 4 MB.', 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('The upload request was invalid. Please choose the image again.', 400);
  }

  const file = formData.get('file');
  const slug = formData.get('slug');
  const kind = formData.get('kind') || 'cover';
  const elementId = formData.get('elementId');
  if (
    !(file instanceof File)
    || typeof slug !== 'string'
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    || typeof kind !== 'string'
    || !Object.hasOwn(uploadFolders, kind)
    || (kind === 'element' && (typeof elementId !== 'string' || !/^[a-f0-9-]{36}$/i.test(elementId)))
  ) {
    return jsonError('Choose an image and save it with a valid template name first.', 400);
  }
  if (file.size === 0 || file.size > maxFileSize) {
    return jsonError('Choose a non-empty image smaller than 4 MB.', 413);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = getImageExtension(file.type, bytes);
  if (!extension) {
    return jsonError('Use a valid JPEG, PNG, or WebP image.', 415);
  }

  const uploadFolder = uploadFolders[kind];
  const filename = kind === 'cover' ? `${slug}-cover.${extension}` : `${slug}-${elementId}.${extension}`;
  const path = `public/${uploadFolder}/${filename}`;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const contentsUrl = `https://api.github.com/repos/${githubRepository}/contents/${encodedPath}`;

  try {
    const existingFile = await githubRequest(
      `${contentsUrl}?ref=${encodeURIComponent(githubBranch)}`,
      githubToken
    );
    let existingSha;
    if (existingFile.ok) {
      const data = await existingFile.json();
      existingSha = data.sha;
    } else if (existingFile.status !== 404) {
      console.error(`GitHub could not check the cover path (HTTP ${existingFile.status}).`);
      return jsonError('Could not check the cover image folder in GitHub. Check the repository token permissions.', 502);
    }

    const saveResponse = await githubRequest(contentsUrl, githubToken, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Upload cover image for ${slug}`,
        content: bytes.toString('base64'),
        branch: githubBranch,
        ...(existingSha ? { sha: existingSha } : {})
      })
    });
    if (!saveResponse.ok) {
      console.error(`GitHub rejected the cover upload (HTTP ${saveResponse.status}).`);
      const message = saveResponse.status === 401 || saveResponse.status === 403
        ? 'GitHub denied the upload. Check that the Vercel token has Contents read/write access to this repository.'
        : saveResponse.status === 409
          ? 'Another upload changed this cover at the same time. Please try again.'
          : 'GitHub could not save the cover image. Please try again.';
      return jsonError(message, saveResponse.status === 409 ? 409 : 502);
    }

    const savedFile = await saveResponse.json();
    const imageUrl = `/${encodeURIComponent(uploadFolder)}/${encodeURIComponent(filename)}`;
    return NextResponse.json({
      ...(kind === 'cover' ? { coverImageUrl: imageUrl } : { elementImageUrl: imageUrl }),
      commitSha: savedFile.commit?.sha || null
    }, { status: 201 });
  } catch (error) {
    console.error('Cover image upload to GitHub failed.', error);
    return jsonError('Could not save the cover image to GitHub. Please try again.', 502);
  }
}
