const { string, object } = require('yup');
const { count, deleteAll, dropTable } = require('automata-db');

const restModel = require('.');

const columns = [{ name: 'foo', required: true, type: 'string' }];

const table = { columns, name: 'test' };

let model;
let client;

describe('rest-model', () => {
  beforeAll(() => {
    client = global.client;
    model = restModel(client, table, { userRequired: false });
  });

  afterAll(() => dropTable(client, table.name));

  afterEach(() => deleteAll(client, table.name));

  describe('insert', () => {
    it('should create one', async () => {
      const newResource = { foo: 'bar' };
      expect(await count(client, table.name)).toBe(0);

      await model.insertOne(newResource);

      expect(await count(client, table.name)).toBe(1);
      expect(await model.findOne(newResource)).toBeTruthy();
    });

    it('should not create invalid', async () => {
      expect(await count(client, table.name)).toBe(0);

      const newResource = { bar: 'bar' };

      try {
        await model.insertOne(newResource);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(client, table.name)).toBe(0);
      }
    });
  });

  describe('replace', () => {
    it('should replace one', async () => {
      const inserted = await model.insertOne({ foo: 'bar' });
      const modified = { ...inserted, foo: 'baz' };

      expect(inserted.foo).not.toBe(modified.foo);

      await model.replaceOne(inserted, modified);

      expect(await count(client, table.name)).toBe(1);
      const replaced = await model.findOne({ id: inserted.id });
      expect(replaced.foo).toBe(modified.foo);
    });

    it('should not replace invalid', async () => {
      const inserted = await model.insertOne({ foo: 'bar' });
      const modified = { bar: 'baz' };

      try {
        await model.replaceOne(inserted, modified);
      } catch (err) {
        expect(err).toBeTruthy();
      }

      expect(await model.findOne(inserted)).toBeTruthy();
    });
  });

  describe('delete', () => {
    it('should delete one', async () => {
      const existing = await model.insertOne({ foo: 'bar' });

      expect(await count(client, table.name)).toBe(1);

      await model.deleteOne(existing);

      expect(await count(client, table.name)).toBe(0);
    });

    it('should require id to delete', async () => {
      const { id, ...resource } = await model.insertOne({ foo: 'bar' });
      expect(await model.findOne(resource)).toBeTruthy();
      expect(await count(client, table.name)).toBe(1);

      await model.deleteOne(resource);

      expect(await model.findOne(resource)).toBeTruthy();
      expect(await count(client, table.name)).toBe(1);
    });

    it('should not delete randomly', async () => {
      const { id } = await model.insertOne({ foo: 'bar' });
      expect(await count(client, table.name)).toBe(1);

      try {
        await model.deleteOne(null);
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(client, table.name)).toBe(1);
      }

      try {
        await model.deleteOne();
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(client, table.name)).toBe(1);
      }

      try {
        await model.deleteOne({});
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(client, table.name)).toBe(1);
      }

      try {
        await model.deleteOne({ foo: '1234' });
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await count(client, table.name)).toBe(1);
      }

      expect(await model.findOne({ id })).toBeTruthy();
    });
  });

  describe('find', () => {
    it('should find many', async () => {
      const resource = { foo: 'bar' };
      await model.insertOne(resource);
      await model.insertOne(resource);
      await model.insertOne(resource);

      const results = await model.find(resource);

      expect(results.length).toBe(3);
    });

    it('should limit results', async () => {
      const resource = { foo: 'bar' };
      await model.insertOne({ foo: 'baz' });
      await model.insertOne(resource);
      await model.insertOne(resource);

      const results = await model.find(resource);

      expect(results.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should find one', async () => {
      await model.insertOne({ foo: '1' });
      await model.insertOne({ foo: '2' });
      await model.insertOne({ foo: '3' });

      const result = await model.findOne({ foo: '2' });

      expect(result).toEqual(expect.objectContaining({ foo: '2' }));
    });
  });

  describe('optional params', () => {
    beforeEach(async () => dropTable(client, table.name));

    describe('userRequired', () => {
      it('insert should require owner property', async () => {
        const aModel = restModel(client, table, { userRequired: true });
        await aModel.init();

        const resource = { foo: 'bar' };

        try {
          await aModel.insertOne(resource);
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/owner is a required field/u.test(message)).toBe(true);
        }

        const inserted = await aModel.insertOne({ ...resource, owner: 'owner' });
        expect(inserted).toEqual(expect.objectContaining(resource));
      });

      it('replace should require owner property', async () => {
        const aModel = restModel(client, table, { userRequired: true });
        await aModel.init();

        const inserted = await aModel.insertOne({ foo: 'bar', owner: 'baz' });
        const { id } = inserted;

        const modified = { foo: 'baz', id };
        expect(inserted.foo).not.toBe(modified.foo);

        try {
          await aModel.replaceOne(inserted, modified);
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/owner is a required field/u.test(message)).toBe(true);
        } finally {
          expect((await aModel.findOne({ id })).foo).toBe(inserted.foo);
        }

        await aModel.replaceOne(inserted, { ...modified, owner: 'owner' });
        expect((await aModel.findOne({ id })).foo).toBe(modified.foo);
      });
    });

    describe('validator', () => {
      it('should accept a custom validator', async () => {
        const validator = object({ foo: string().email().required() }).noUnknown().strict();
        const aModel = restModel(client, table, { userRequired: false, validator });
        await aModel.init();

        try {
          await aModel.insertOne({ foo: 'not-email' });
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/foo must be a valid email/u.test(message)).toBe(true);
        }

        const email = 'foo@example.com';
        const inserted = await aModel.insertOne({ foo: email });
        expect(inserted.foo).toBe(email);
      });
    });
  });

  describe('reserved fields', () => {
    it('insert should throw, if reserved field used as columns', () => {
      [
        'id',
        'modified',
        'owner',
      ].forEach((reserved) => {
        try {
          restModel(client, { ...table, columns: [{ name: reserved, type: 'string' }] });
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/reserved/u.test(message)).toBe(true);
        }
      });
    });
  });

  describe('type conversion', () => {
    it('should return right types', async () => {
      await dropTable(client, table.name);

      const aModel = restModel(
        client,
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
      await aModel.init();

      const obj = {
        bool: true,
        date: new Date(),
        nullVal: null,
        number: 1,
        object: { foo: 12 },
        string: 'str',
      };

      const { id } = await aModel.insertOne(obj);

      const saved = await aModel.findOne({ id });
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
