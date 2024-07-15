const { count, deleteAll, dropTable } = require('automata-db');

const restController = require('./controller');

const restModel = require('./model');

const columns = [{ name: 'foo', required: true, type: 'string' }];

const table = { columns, name: 'test' };

const {
  create, byId, byOwner, update, remove,
} = restController(null, { table });

const createResource = async (userId) => {
  const resource = { foo: 'bar' };
  return create(userId, resource);
};

describe('rest controller', () => {
  afterAll(async () => {
    await dropTable(table.name);
  });

  afterEach(async () => {
    await deleteAll(table.name);
  });

  describe('userRequired', () => {
    it('should throw error, if owner missing', async () => {
      const resource = { foo: 'bar' };

      try {
        await create(null, resource);
        expect('Unreachable').toBe(true);
      } catch ({ message }) {
        expect(/Owner is required/u.test(message)).toBe(true);
      }

      try {
        await byId(null, resource);
        expect('Unreachable').toBe(true);
      } catch ({ message }) {
        expect(/Owner is required/u.test(message)).toBe(true);
      }

      try {
        await byOwner(null);
        expect('Unreachable').toBe(true);
      } catch ({ message }) {
        expect(/Owner is required/u.test(message)).toBe(true);
      }

      try {
        await update(null, { ...resource, baz: 'asd' });
        expect('Unreachable').toBe(true);
      } catch ({ message }) {
        expect(/Owner is required/u.test(message)).toBe(true);
      }

      try {
        await remove(null, resource);
        expect('Unreachable').toBe(true);
      } catch ({ message }) {
        expect(/Owner is required/u.test(message)).toBe(true);
      }
    });
  });

  describe('create', () => {
    it('should create one', async () => {
      const userId = 'foo';
      const resource = { foo: 'bar' };

      expect(await count(table.name)).toBe(0);

      await create(userId, resource);

      expect(await count(table.name)).toBe(1);
    });

    it('should override owner', async () => {
      const userId = 'foo';
      const resource = { foo: 'bar' };

      const fakeOwner = '1234';

      const created = await create(userId, { ...resource, owner: fakeOwner });

      expect((await byOwner(userId))[0]).toEqual(created);
      expect((await byOwner({ id: fakeOwner }))).toEqual([]);
    });

    it('should return created', async () => {
      const userId = 'foo';
      const resource = { foo: 'bar' };

      const created = await create(userId, resource);
      expect(created).toEqual(await byId(userId, { id: created.id }));
    });
  });

  describe('byId', () => {
    it('should find by id', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);
      const { id } = resource;

      const resourceById = await byId(userId, { id });

      expect(resourceById).toEqual(resource);
    });

    it('should not return resources of other users', async () => {
      const userId = 'foo';
      const userId2 = 'bar';

      const { id } = await createResource(userId);

      expect(await byId(userId, { id })).toBeTruthy();
      expect(await byId(userId2, { id })).toBeFalsy();
    });

    it('should not return owner', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);

      const result = await byId(userId, { id: resource.id });

      expect(result.owner).toBeFalsy();
    });
  });

  describe('byOwner', () => {
    it('should find all user resources', async () => {
      const userId = 'foo';

      const TIMES = 3;
      const promises = [];
      for (let i = 0; i < TIMES; i += 1) {
        promises.push(createResource(userId));
      }
      await Promise.all(promises);

      const results = await byOwner(userId);
      expect(results.length).toBe(TIMES);
    });

    it('should not return resources of other userIds', async () => {
      const userId = 'foo';
      await createResource(userId);

      const userId2 = 'bar';
      await createResource(userId2);

      expect(await count(table.name)).toBe(2);

      expect((await byOwner(userId)).length).toBe(1);
      expect((await byOwner(userId2)).length).toBe(1);
    });

    it('should not return owner', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);

      const results = await byOwner(userId);
      expect(results[0]).toEqual(resource);
      expect(results[0].owner).toBeFalsy();
    });
  });

  describe('update', () => {
    it('should update a resource', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);
      const { id } = resource;

      const foo = 'text2';
      expect(foo).not.toBe(resource.foo);

      await update(userId, { ...resource, foo });

      const updated = await byId(userId, { id });

      expect(updated).toEqual(expect.objectContaining({ foo }));
    });

    it('should not update owner', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);

      const fakeOwner = 'foo';
      expect(fakeOwner).not.toBe(resource.owner);

      await update(userId, { ...resource, owner: fakeOwner });

      expect((await byOwner(userId)).length).toBe(1);
      expect((await byOwner({ id: fakeOwner })).length).toBe(0);
    });

    it('should not update modified', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);
      const { id } = resource;

      const modified = 'foo';
      expect(modified).not.toBe(resource.modified);

      await update(userId, { ...resource, modified });

      const updated = await byId(userId, { id });
      expect(updated.modified).not.toBe(modified);
    });

    it('should not update id', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);
      const { id } = resource;

      const fakeId = `ABCDE${id.substring(5)}`;
      expect(fakeId).not.toBe(resource.id);

      await update(userId, { ...resource, id: fakeId });

      expect(await byId(userId, { id })).toBeTruthy();
      expect(await byId(userId, { id: fakeId })).toBeFalsy();
    });

    it('should not update resources of other users', async () => {
      const userId = 'foo';
      const resource = await createResource(userId);
      const { id } = resource;

      const foo = 'text2';
      expect(foo).not.toBe(resource.foo);

      const userId2 = 'bar';

      await update(userId2, { ...resource, foo });

      expect(await byId(userId, { id })).toEqual(resource);
    });
  });

  describe('remove', () => {
    it('should remove a resource', async () => {
      const userId = 'foo';
      const { id } = await createResource(userId);

      expect((await byOwner(userId)).length).toBe(1);

      await remove(userId, { id });

      expect((await byOwner(userId)).length).toBe(0);
    });

    it('should not remove resources of other users', async () => {
      const userId = 'foo';
      const { id } = await createResource(userId);

      expect((await byOwner(userId)).length).toBe(1);

      const userId2 = 'bar';
      await remove(userId2, { id });

      expect((await byOwner(userId)).length).toBe(1);
    });
  });

  describe('require user', () => {
    it('should support un auth access', async () => {
      await dropTable(table.name);
      const model = restModel(table, { userRequired: false });
      await model.init();

      const {
        create: createUnAuth,
        byId: byIdUnAuth,
        byOwner: byOwnerUnAuth,
        update: updateUnAuth,
        remove: removeUnAuth,
      } = restController(model, { userRequired: false });

      const resource = { foo: 'bar' };

      const { id } = await createUnAuth(null, resource);
      expect(await count(table.name)).toBe(1);

      const created = await byIdUnAuth(null, { id });
      expect(created).toEqual(expect.objectContaining(resource));

      expect((await byOwnerUnAuth(null)).length).toBe(await count(table.name));
      const { id: secondId } = await createUnAuth(null, resource);
      expect((await byOwnerUnAuth(null)).length).toBe(await count(table.name));
      await removeUnAuth(null, { id: secondId });

      const modified = { ...created, foo: 'baz' };
      expect(modified.foo).not.toBe(created.foo);

      await updateUnAuth(created, modified);

      const updated = await byIdUnAuth(null, { id });
      expect(updated.foo).toBe(modified.foo);

      await removeUnAuth(null, { id });
      expect(await count(table.name)).toBe(0);
    });
  });
});
