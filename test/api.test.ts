import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, pollDeviceToken, uploadTarget } from '../src/api.js';
import { type CliError, ExitCode } from '../src/errors.js';

describe('CLI API adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds bearer auth and stable request metadata to control-plane calls', async () => {
    const fetchMock = vi.fn(async (request: Request) => {
      expect(request.url).toBe('https://pets.example/api/v1/user/me');
      expect(request.headers.get('authorization')).toBe('Bearer secret-token');
      expect(request.headers.get('user-agent')).toBe('petdb/1.1.1');
      expect(request.redirect).toBe('error');
      return Response.json(
        {
          data: {
            email: 'mira@example.test',
            expiresAt: '2026-08-01T00:00:00.000Z',
            name: 'Mira',
            uid: 'mira',
          },
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getCurrentUser('https://pets.example', 'secret-token')
    ).resolves.toEqual({
      email: 'mira@example.test',
      expiresAt: '2026-08-01T00:00:00.000Z',
      name: 'Mira',
      uid: 'mira',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('maps Problem JSON authentication failures to exit code 6', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            code: 'UNAUTHORIZED',
            detail: 'The session is invalid.',
            requestId: 'request-1',
            status: 401,
            title: 'Unauthorized',
            type: 'https://codexpetdb.com/problems/unauthorized',
          },
          {
            headers: { 'Content-Type': 'application/problem+json' },
            status: 401,
          }
        )
      )
    );

    await expect(
      getCurrentUser('https://pets.example', 'expired-token')
    ).rejects.toMatchObject({
      exitCode: ExitCode.Auth,
      http: {
        response: expect.stringContaining('"detail":"The session is invalid."'),
        status: 401,
      },
      message: 'The session is invalid.',
    } satisfies Partial<CliError>);
  });

  it.each([
    'authorization_pending',
    'slow_down',
    'access_denied',
  ] as const)('preserves the device flow %s response', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: status,
            error_description: `Device flow: ${status}`,
          },
          { status: 400 }
        )
      )
    );

    await expect(
      pollDeviceToken('https://pets.example', 'device-code')
    ).resolves.toEqual({
      description: `Device flow: ${status}`,
      status,
    });
  });

  it('maps a device polling network failure without exposing credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused');
      })
    );

    await expect(
      pollDeviceToken('https://pets.example', 'private-device-code')
    ).rejects.toMatchObject({
      exitCode: ExitCode.Network,
      message: expect.not.stringContaining('private-device-code'),
    });
  });

  it('never forwards the bearer token to an external upload target', async () => {
    const requests: Request[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requests.push(request);
        return new Response(null, { status: 200 });
      })
    );

    await uploadTarget(
      'https://pets.example',
      'secret-token',
      {
        expiresAt: '2026-08-01T00:00:00.000Z',
        headers: {
          Authorization: 'server-must-not-control-this',
          'Content-Type': 'image/webp',
          'x-amz-checksum-sha256': 'checksum',
        },
        method: 'PUT',
        role: 'spritesheet',
        url: 'https://uploads.example/object?signature=secret',
      },
      new Uint8Array([1, 2, 3])
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.get('authorization')).toBeNull();
    expect(requests[0]?.headers.get('content-type')).toBe('image/webp');
    expect(requests[0]?.redirect).toBe('error');
  });

  it('adds bearer auth only to a same-origin local upload target', async () => {
    const requests: Request[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        requests.push(request);
        return new Response(null, { status: 204 });
      })
    );

    await uploadTarget(
      'https://pets.example',
      'secret-token',
      {
        expiresAt: '2026-08-01T00:00:00.000Z',
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
        role: 'manifest',
        url: 'https://pets.example/api/storage/cli-pet-uploads/id/manifest',
      },
      new Uint8Array([1])
    );

    expect(requests[0]?.headers.get('authorization')).toBe(
      'Bearer secret-token'
    );
  });

  it('captures and redacts a failed upload response for debug output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            detail: 'The upload route is unavailable.',
            nested: { accessToken: 'response-secret' },
          },
          {
            headers: { 'Content-Type': 'application/problem+json' },
            status: 404,
          }
        )
      )
    );

    await expect(
      uploadTarget(
        'https://pets.example',
        'request-secret',
        {
          expiresAt: '2026-08-01T00:00:00.000Z',
          headers: { 'Content-Type': 'application/json' },
          method: 'PUT',
          role: 'manifest',
          url: 'https://pets.example/api/storage/cli-pet-uploads/id/manifest',
        },
        new Uint8Array([1])
      )
    ).rejects.toMatchObject({
      http: {
        response: expect.stringContaining('"accessToken":"[REDACTED]"'),
        status: 404,
      },
    } satisfies Partial<CliError>);
  });

  it('rejects an insecure external upload target before sending bytes', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      uploadTarget(
        'https://pets.example',
        'secret-token',
        {
          expiresAt: '2026-08-01T00:00:00.000Z',
          headers: { 'Content-Type': 'image/webp' },
          method: 'PUT',
          role: 'spritesheet',
          url: 'http://uploads.example/object',
        },
        new Uint8Array([1])
      )
    ).rejects.toMatchObject({ exitCode: ExitCode.Integrity });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
