import type { ParticipantId } from '../domain/types';
import { b64ToUtf8, utf8ToB64 } from './crypto';
import type { DoorsFile, DoorStore } from './doors';
import type { ParticipantFile, ParticipantFileStore } from './participantFiles';

const PARTICIPANT_DIR = 'participants';
const DOORS_PATH = 'doors.json';
const LIST_CACHE_MS = 15_000;

/**
 * Minimal client for JSON files in a (private) GitHub data repo.
 *  - Single files: the REST Contents API, with the file's sha for safe updates.
 *  - A whole folder: one GraphQL request (cheap on the shared rate limit).
 */
export class GitHubRepoClient {
  private readonly token: string;
  readonly owner: string;
  readonly name: string;
  readonly branch: string;
  private readonly shas = new Map<string, string>();
  private readonly etags = new Map<string, { etag: string; body: unknown }>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(token: string, repo: string, branch = 'main') {
    const [owner, name] = repo.split('/');
    if (!owner || !name) throw new Error(`Ugyldig data-repo «${repo}» – bruk formatet eier/navn.`);
    this.token = token;
    this.owner = owner;
    this.name = name;
    this.branch = branch;
  }

  get repo(): string {
    return `${this.owner}/${this.name}`;
  }

  async readJson<T>(path: string): Promise<T | undefined> {
    const body = (await this.getContents(path)) as { sha: string; content: string } | null;
    if (!body) {
      this.shas.delete(path);
      return undefined;
    }
    this.shas.set(path, body.sha);
    return JSON.parse(b64ToUtf8(body.content)) as T;
  }

  /** Writes are queued so one client never sends two PUTs at once. */
  writeJson(path: string, data: unknown, message: string): Promise<void> {
    const job = this.queue.then(() => this.put(path, data, message, true));
    this.queue = job.catch(() => {});
    return job;
  }

  async deleteFile(path: string, message: string): Promise<void> {
    if (!this.shas.has(path) && (await this.readJson(path)) === undefined) return;
    const res = await fetch(this.contentsUrl(path), {
      method: 'DELETE',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message, branch: this.branch, sha: this.shas.get(path) }),
    });
    if (!res.ok && res.status !== 404) throw new Error(await explain(res, this.repo));
    this.shas.delete(path);
    this.etags.delete(path);
  }

  /** Text of every file in a folder, in one request. */
  async readFolder(dir: string): Promise<{ name: string; text: string }[]> {
    const query = `query($owner: String!, $name: String!, $expression: String!) {
      repository(owner: $owner, name: $name) {
        object(expression: $expression) {
          ... on Tree { entries { name object { ... on Blob { text } } } }
        }
      }
    }`;
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        query,
        variables: { owner: this.owner, name: this.name, expression: `${this.branch}:${dir}` },
      }),
    });
    if (!res.ok) throw new Error(await explain(res, this.repo));
    const body = (await res.json()) as {
      data?: { repository?: { object?: { entries?: { name: string; object?: { text?: string | null } }[] } | null } | null };
      errors?: { message: string }[];
    };
    if (body.errors?.length) throw new Error(`GitHub: ${body.errors[0].message}`);
    if (body.data?.repository === null) throw new Error(`Finner ikke data-repoet ${this.repo}.`);
    return (body.data?.repository?.object?.entries ?? []).flatMap((entry) =>
      entry.object?.text ? [{ name: entry.name, text: entry.object.text }] : [],
    );
  }

  private async put(path: string, data: unknown, message: string, retry: boolean): Promise<void> {
    if (!this.shas.has(path)) await this.readJson(path);
    const res = await fetch(this.contentsUrl(path), {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        message,
        branch: this.branch,
        content: utf8ToB64(JSON.stringify(data, null, 2)),
        sha: this.shas.get(path),
      }),
    });
    if ((res.status === 409 || res.status === 422) && retry) {
      // Stale sha (someone else wrote the file) – refresh and try once more.
      this.shas.delete(path);
      this.etags.delete(path);
      return this.put(path, data, message, false);
    }
    if (!res.ok) throw new Error(await explain(res, this.repo));
    const body = (await res.json()) as { content: { sha: string } };
    this.shas.set(path, body.content.sha);
    this.etags.delete(path);
  }

  /** GET with ETag – 304 responses don't count against the rate limit. */
  private async getContents(path: string): Promise<unknown | null> {
    const cached = this.etags.get(path);
    const res = await fetch(`${this.contentsUrl(path)}?ref=${this.branch}`, {
      headers: this.headers(cached ? { 'If-None-Match': cached.etag } : {}),
      cache: 'no-store',
    });
    if (res.status === 304 && cached) return cached.body;
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(await explain(res, this.repo));
    const body: unknown = await res.json();
    const etag = res.headers.get('ETag');
    if (etag) this.etags.set(path, { etag, body });
    return body;
  }

  private contentsUrl(path: string): string {
    return `https://api.github.com/repos/${this.repo}/contents/${path}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...extra,
    };
  }
}

/** One file per participant in `participants/<id>.json`. */
export class GitHubParticipantFileStore implements ParticipantFileStore {
  private readonly client: GitHubRepoClient;
  private listCache?: { at: number; files: Promise<ParticipantFile[]> };

  constructor(client: GitHubRepoClient) {
    this.client = client;
  }

  listAll(): Promise<ParticipantFile[]> {
    if (this.listCache && Date.now() - this.listCache.at < LIST_CACHE_MS) return this.listCache.files;
    const files = this.client.readFolder(PARTICIPANT_DIR).then((entries) =>
      entries.flatMap((entry) => {
        if (!entry.name.endsWith('.json')) return [];
        try {
          return [JSON.parse(entry.text) as ParticipantFile];
        } catch {
          return [];
        }
      }),
    );
    this.listCache = { at: Date.now(), files };
    files.catch(() => (this.listCache = undefined));
    return files;
  }

  read(id: ParticipantId): Promise<ParticipantFile | undefined> {
    return this.client.readJson<ParticipantFile>(pathFor(id));
  }

  async write(file: ParticipantFile): Promise<void> {
    await this.client.writeJson(pathFor(file.id), file, `Svar fra ${file.name}`);
    // Keep the cached list in sync with our own write so the UI updates instantly.
    if (this.listCache) {
      const previous = this.listCache.files;
      this.listCache = {
        at: this.listCache.at,
        files: previous.then((files) => [...files.filter((f) => f.id !== file.id), file]),
      };
    }
  }

  async delete(id: ParticipantId): Promise<void> {
    await this.client.deleteFile(pathFor(id), `Fjern ${id}`);
    this.listCache = undefined;
  }
}

/** The calendar content lives in the private data repo, so it isn't public before the doors open. */
export class GitHubDoorStore implements DoorStore {
  private readonly client: GitHubRepoClient;

  constructor(client: GitHubRepoClient) {
    this.client = client;
  }

  load(): Promise<DoorsFile | undefined> {
    return this.client.readJson<DoorsFile>(DOORS_PATH);
  }

  save(file: DoorsFile, message: string): Promise<void> {
    return this.client.writeJson(DOORS_PATH, file, message);
  }
}

function pathFor(id: ParticipantId): string {
  return `${PARTICIPANT_DIR}/${encodeURIComponent(id)}.json`;
}

async function explain(res: Response, repo: string): Promise<string> {
  let message = '';
  try {
    message = ((await res.json()) as { message?: string }).message ?? '';
  } catch {
    /* ignore */
  }
  const hints: Record<number, string> = {
    401: 'Tokenet er ugyldig eller utløpt (DATA_TOKEN).',
    403: 'Tokenet mangler skrivetilgang, eller grensen for antall kall er nådd – prøv igjen om litt.',
    404: `Finner ikke repoet ${repo}, eller tokenet har ikke tilgang til det.`,
    409: 'Data-repoet er tomt – legg til en README så main-branchen finnes.',
    422: 'Data-repoet er tomt eller branchen finnes ikke – legg til en README.',
  };
  const hint = hints[res.status];
  // Include GitHub's own message too – it often says exactly what is wrong.
  return `GitHub ${res.status}: ${hint ?? message}${hint && message ? ` (${message})` : ''}`;
}
