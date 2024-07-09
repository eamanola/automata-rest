const { string, object } = require('yup');

const { count, deleteAll, dropTable } = require('automata-db');

const restModel = require('.');

const columns = [{ name: 'foo', required: true, type: 'string' }];

const table = { columns, name: 'test' };

const {
  deleteOne,
  find,
  findOne,
  insertOne,
  replaceOne,
} = restModel(table, { userRequired: false });

describe('rest-model', () => {
  afterAll(() => dropTable(table.name));

  afterEach(() => deleteAll(table.name));

  describe('insert', () => {
    it('should create one', async () => {
      const newResource = { foo: 'bar' };
      expect(await count(table.name)).toBe(0);

      await insertOne(newResource);

      expect(await count(table.name)).toBe(1);
      expect(await findOne(newResource)).toBeTruthy();
    });

    it('should not create invalid', async () => {
      expect(await count(table.name)).toBe(0);

      const newResource = { bar: 'bar' };

      try {
        await insertOne(newResource);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(table.name)).toBe(0);
      }
    });
  });

  describe('replace', () => {
    it('should replace one', async () => {
      const inserted = await insertOne({ foo: 'bar' });
      const modified = { ...inserted, foo: 'baz' };

      expect(inserted.foo).not.toBe(modified.foo);

      await replaceOne(inserted, modified);

      expect(await count(table.name)).toBe(1);
      const replaced = await findOne({ id: inserted.id });
      expect(replaced.foo).toBe(modified.foo);
    });

    it('should not replace invalid', async () => {
      const inserted = await insertOne({ foo: 'bar' });
      const modified = { bar: 'baz' };

      try {
        await replaceOne(inserted, modified);
      } catch (err) {
        expect(err).toBeTruthy();
      }

      expect(await findOne(inserted)).toBeTruthy();
    });
  });

  describe('delete', () => {
    it('should delete one', async () => {
      const existing = await insertOne({ foo: 'bar' });

      expect(await count(table.name)).toBe(1);

      await deleteOne(existing);

      expect(await count(table.name)).toBe(0);
    });

    it('should require id to delete', async () => {
      const { id, ...resource } = await insertOne({ foo: 'bar' });
      expect(await findOne(resource)).toBeTruthy();
      expect(await count(table.name)).toBe(1);

      await deleteOne(resource);

      expect(await findOne(resource)).toBeTruthy();
      expect(await count(table.name)).toBe(1);
    });

    it('should not delete randomly', async () => {
      const { id } = await insertOne({ foo: 'bar' });
      expect(await count(table.name)).toBe(1);

      try {
        await deleteOne(null);
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(table.name)).toBe(1);
      }

      try {
        await deleteOne();
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(table.name)).toBe(1);
      }

      try {
        await deleteOne({});
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(table.name)).toBe(1);
      }

      try {
        await deleteOne({ foo: '1234' });
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(table.name)).toBe(1);
      }

      expect(await findOne({ id })).toBeTruthy();
    });
  });

  describe('find', () => {
    it('should find many', async () => {
      const resource = { foo: 'bar' };
      await insertOne(resource);
      await insertOne(resource);
      await insertOne(resource);

      const results = await find(resource);

      expect(results.length).toBe(3);
    });

    it('should limit results', async () => {
      const resource = { foo: 'bar' };
      await insertOne({ foo: 'baz' });
      await insertOne(resource);
      await insertOne(resource);

      const results = await find(resource);

      expect(results.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should find one', async () => {
      await insertOne({ foo: '1' });
      await insertOne({ foo: '2' });
      await insertOne({ foo: '3' });

      const result = await findOne({ foo: '2' });

      expect(result).toEqual(expect.objectContaining({ foo: '2' }));
    });
  });

  describe('optional params', () => {
    beforeEach(async () => dropTable(table.name));

    describe('userRequired', () => {
      it('insert should require owner property', async () => {
        const model = restModel(table, { userRequired: true });
        await model.init();

        const resource = { foo: 'bar' };

        try {
          await model.insertOne(resource);
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/owner is a required field/u.test(message)).toBe(true);
        }

        const inserted = await model.insertOne({ ...resource, owner: 'owner' });
        expect(inserted).toEqual(expect.objectContaining(resource));
      });

      it('replace should require owner property', async () => {
        const model = restModel(table, { userRequired: true });
        await model.init();

        const inserted = await model.insertOne({ foo: 'bar', owner: 'baz' });
        const { id } = inserted;

        const modified = { foo: 'baz', id };
        expect(inserted.foo).not.toBe(modified.foo);

        try {
          await model.replaceOne(inserted, modified);
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/owner is a required field/u.test(message)).toBe(true);
        } finally {
          expect((await model.findOne({ id })).foo).toBe(inserted.foo);
        }

        await model.replaceOne(inserted, { ...modified, owner: 'owner' });
        expect((await model.findOne({ id })).foo).toBe(modified.foo);
      });
    });

    describe('validator', () => {
      it('should accept a custom validator', async () => {
        const validator = object({ foo: string().email().required() }).noUnknown().strict();
        const model = restModel(table, { userRequired: false, validator });
        await model.init();

        try {
          await model.insertOne({ foo: 'not-email' });
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/foo must be a valid email/u.test(message)).toBe(true);
        }

        const email = 'foo@example.com';
        const inserted = await model.insertOne({ foo: email });
        expect(inserted.foo).toBe(email);
      });
    });
  });

  describe('reserved fields', () => {
    it('insert should throw, if reserved field used as columns', () => {
      ['id', 'modified', 'owner'].forEach((reserved) => {
        try {
          restModel({ ...table, columns: [{ name: reserved, type: 'string' }] });
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/reserved/u.test(message)).toBe(true);
        }
      });
    });
  });

  describe('type conversion', () => {
    it('should return right types', async () => {
      await dropTable(table.name);

      const model = restModel(
        {
          ...table,
          columns: [
            { name: 'bool', type: 'bool' },
            { name: 'date', type: 'date' },
            { name: 'nullVal', type: 'string' },
            { name: 'number', type: 'number' },
            { name: 'object', type: 'object' },
            { name: 'string', type: 'string' },
          ],
        },
        { userRequired: false },
      );
      await model.init();

      const obj = {
        bool: true,
        date: new Date(),
        nullVal: null,
        number: 1,
        object: { foo: 12 },
        string: 'str',
      };

      const { id } = await model.insertOne(obj);

      const saved = await model.findOne({ id });
      expect(saved).toEqual(expect.objectContaining(obj));
      expect(typeof saved.bool).toBe('boolean');
      expect(saved.date instanceof Date).toBe(true);
      expect(saved.nullVal).toBe(null);
      expect(typeof saved.number).toBe('number');
      expect(typeof saved.object).toBe('object');
      expect(typeof saved.string).toBe('string');
    });
  });
});
