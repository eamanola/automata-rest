const express = require('express');
const supertest = require('supertest');
const { deleteAll, dropTable } = require('automata-db');
const { router: users } = require('automata-user-management');
const { errors } = require('automata-utils');

const { getToken } = require('../../jest/test-helpers.test');

const restRouter = require('./router');

const columns = [{ name: 'foo', required: true, type: 'string' }];

const table = { columns, name: 'test' };

const router = restRouter(null, { table });

const baseUrl = '/test';

const app = express();
app.use(express.json());
app.use(users);
app.use(baseUrl, router);

const api = supertest(app);

const getById = async (id, token) => {
  const { body } = await api
    .get(`${baseUrl}/${id}`)
    .set({ Authorization: `bearer ${token}` });

  return body.result;
};

const create = async ({ token, resource = { foo: 'bar' } }) => {
  const { body } = await api
    .post(baseUrl)
    .set({ Authorization: `bearer ${token}` })
    .send(resource);

  return body.result;
};

describe('rest router', () => {
  afterAll(() => dropTable(table.name));

  afterEach(async () => {
    await deleteAll(table.name);
  });

  it('should throw accessDenied, if user missing', async () => {
    const { accessDenied } = errors;

    const response = await api.get(baseUrl);

    expect(response.status).toBe(accessDenied.status);
  });

  describe('POST /', () => {
    it('should create one', async () => {
      const { token } = await getToken(api);
      const resource = { foo: 'bar' };

      const { body, status } = await api
        .post(baseUrl)
        .set({ Authorization: `bearer ${token}` })
        .send(resource);

      expect(status).toBe(201);
      expect(body.message).toBe('CREATED');

      const { result } = body;
      expect(result).toEqual(expect.objectContaining(resource));
      expect(await getById(result.id, token)).toEqual(result);
    });

    it('should throw paramError, on invalid params', async () => {
      const { paramError } = errors;
      const { token } = await getToken(api);
      const invalid = { bar: 1 };

      const { body, status } = await api
        .post(baseUrl)
        .set({ Authorization: `bearer ${token}` })
        .send(invalid);

      expect(status).toBe(paramError.status);
      expect(body.result).toBeFalsy();
    });
  });

  describe('GET /:id', () => {
    it('should return a result by id', async () => {
      const { token } = await getToken(api);
      const resource = await create({ token });

      const { body, status } = await api
        .get(`${baseUrl}/${resource.id}`)
        .set({ Authorization: `bearer ${token}` });

      expect(status).toBe(200);

      const { message, result } = body;
      expect(message).toBe('OK');
      expect(result).toEqual(resource);
    });
  });

  describe('GET /', () => {
    it('should return all user resources', async () => {
      const { token } = await getToken(api);
      const { token: token2 } = await getToken(api, { email: 'foo2@other.com' });

      await create({ token });
      await create({ token });

      await create({ token: token2 });

      const { body } = await api.get(baseUrl).set({ Authorization: `bearer ${token}` });
      const { results } = body;
      expect(results.length).toBe(2);
    });
  });

  describe('PUT /:id', () => {
    it('should update one', async () => {
      const { token } = await getToken(api);
      const inserted = await create({ token });

      const changed = { ...inserted, foo: 'foo1' };
      expect(changed.foo).not.toBe(inserted.foo);

      const { body, status } = await api
        .put(`${baseUrl}/${inserted.id}`)
        .set({ Authorization: `bearer ${token}` })
        .send(changed);

      expect(status).toBe(200);
      const { result, message } = body;
      expect(message).toBe('OK');

      const { modified, ...rest } = changed;
      expect(result).toEqual(expect.objectContaining(rest));

      const updated = await getById(inserted.id, token);
      expect(updated.foo).toBe(changed.foo);
    });

    it('should throw paramError, on invalid params', async () => {
      const { paramError } = errors;
      const { token } = await getToken(api);
      const inserted = await create({ token });

      const invalid = { ...inserted, foo: '' };
      expect(invalid.foo).not.toBe(inserted.foo);

      const { status } = await api
        .put(`${baseUrl}/${inserted.id}`)
        .set({ Authorization: `bearer ${token}` })
        .send(invalid);

      expect(status).toBe(paramError.status);

      const updated = await getById(inserted.id, token);

      expect(updated).toEqual(inserted);
    });

    it('should not update owner, or modified', async () => {
      const { token } = await getToken(api);
      const inserted = await create({ token });

      const modified = { ...inserted, modified: 'bar', owner: 'foo' };
      expect(modified.owner).not.toBe(inserted.owner);
      expect(modified.modified).not.toBe(inserted.modified);

      await api
        .put(`${baseUrl}/${inserted.id}`)
        .set({ Authorization: `bearer ${token}` })
        .send(modified);

      const updated = await getById(inserted.id, token);
      expect(updated.owner).toBe(inserted.owner);
      expect(updated.modified).not.toBe(modified.modified);
    });

    it('should not update id', async () => {
      const { token } = await getToken(api);
      const inserted = await create({ token });

      const modified = { ...inserted, id: `ABCDE${inserted.id.substring(5)}` };
      expect(modified.id).not.toBe(inserted.id);

      await api
        .put(`${baseUrl}/${inserted.id}`)
        .set({ Authorization: `bearer ${token}` })
        .send(modified);

      const updated = await getById(modified.id, token);
      expect(updated).toBe(null);

      const original = await getById(inserted.id, token);
      expect(original).toEqual(inserted);
    });
  });

  describe('DELETE /:id', () => {
    it('should remove by id', async () => {
      const { token } = await getToken(api);
      const resource = await create({ token });

      const { body, status } = await api
        .delete(`${baseUrl}/${resource.id}`)
        .set({ Authorization: `bearer ${token}` });

      expect(status).toBe(200);
      expect(body.message).toBe('OK');

      const deleted = await getById(resource.id, token);
      expect(deleted).toBe(null);
    });
  });
});
