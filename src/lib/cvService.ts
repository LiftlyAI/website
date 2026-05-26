// Client for the local Python bar-path CV sidecar (see cv-service/).

import type { CvAnalysis } from './types';

export function cvServiceUrl(): string {
  return process.env.CV_SERVICE_URL ?? 'http://127.0.0.1:8000';
}

export class CvServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly userActionable: boolean,
  ) {
    super(message);
  }
}

/** Forward the lifter's video to the CV sidecar and return the analysis. */
export async function analyzeVideo(args: {
  video: Blob;
  filename: string;
  lift: 'bench' | 'squat' | 'deadlift';
}): Promise<CvAnalysis> {
  const form = new FormData();
  form.append('video', args.video, args.filename || 'clip.mp4');
  form.append('lift', args.lift);

  let res: Response;
  try {
    res = await fetch(`${cvServiceUrl()}/analyze`, { method: 'POST', body: form });
  } catch {
    throw new CvServiceError(
      'Bar-path service is not running. Start it with `uvicorn app:app` in cv-service/ (see cv-service/README.md).',
      503,
      true,
    );
  }

  const data = (await res.json().catch(() => null)) as
    | (CvAnalysis & { detail?: string })
    | null;

  if (!res.ok) {
    // 422 = expected, user-actionable (bad angle, no plate, short clip…).
    // Our handlers send a string `detail`; FastAPI's own validation errors
    // send an array of {msg} — normalise both.
    const d = data?.detail as unknown;
    const detail =
      typeof d === 'string'
        ? d
        : Array.isArray(d)
          ? (d as { msg?: string }[]).map((e) => e.msg).filter(Boolean).join('; ') ||
            `invalid request (${res.status})`
          : `bar-path analysis failed (${res.status})`;
    throw new CvServiceError(detail, res.status, res.status === 422);
  }
  if (!data || !data.ok) {
    throw new CvServiceError('bar-path service returned an unreadable response', 502, false);
  }
  return data;
}

export async function cvServiceHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${cvServiceUrl()}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
