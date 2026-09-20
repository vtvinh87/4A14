import { describe, expect, it } from 'vitest';
import { PostgresAuthRepository } from './postgresRepository';

describe('student summary listing', () => {
  it('selects only public fields in one ordered account query without credential fan-out', async () => {
    const queries: string[] = [];
    const db = (strings: TemplateStringsArray) => {
      queries.push(strings.join('?').replace(/\s+/g, ' ').trim());
      return Promise.resolve([
        { id: 'a', username: 'an01', display_name: 'An', role: 'student', active: true, credential_version: 2 },
        { id: 'b', username: 'binh02', display_name: 'Bình', role: 'student', active: false, credential_version: 3 },
      ]);
    };
    const repository = new PostgresAuthRepository(db as never);
    expect(await repository.listStudentSummaries()).toEqual([
      { id: 'a', username: 'an01', displayName: 'An', role: 'student', active: true, credentialVersion: 2 },
      { id: 'b', username: 'binh02', displayName: 'Bình', role: 'student', active: false, credentialVersion: 3 },
    ]);
    expect(queries).toEqual(["select id, username, display_name, role, active, credential_version from hoc_vui_private.accounts where role = 'student' order by lower(display_name), username"]);
  });
});
