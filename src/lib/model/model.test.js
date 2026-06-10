const { string, object } = require('yup');

const restModel = require('.');

const columns = [
  { name: 'foo', required: true, type: 'string' },
];

const table = { columns, name: 'test' };

let model;
const { db } = global;

describe('rest-model', () => {
  beforeAll(() => {
    model = restModel(db, table, { userRequired: false });
  });

  afterAll(() => db.dropTable(table.name));

  afterEach(() => db.deleteAll(table.name));

  describe('insert', () => {
    it('should create one', async () => {
      const newResource = { foo: 'bar' };
      expect(await db.count(table.name)).toBe(0);

      await model.insertOne(newResource);

      expect(await db.count(table.name)).toBe(1);
      expect(await model.findOne(newResource)).toBeTruthy();
    });

    it('should not create invalid', async () => {
      expect(await db.count(table.name)).toBe(0);

      const newResource = { bar: 'bar' };

      try {
        await model.insertOne(newResource);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await db.count(table.name)).toBe(0);
      }
    });
  });

  describe('update', () => {
    it('should update one', async () => {
      const inserted = await model.insertOne({ foo: 'bar' });
      const modified = { ...inserted, foo: 'baz' };

      expect(inserted.foo).not.toBe(modified.foo);

      await model.updateOne(inserted, modified);

      expect(await db.count(table.name)).toBe(1);
      const updated = await model.findOne({ id: inserted.id });
      expect(updated.foo).toBe(modified.foo);
    });

    it('should not update invalid', async () => {
      const inserted = await model.insertOne({ foo: 'bar' });
      const modified = { bar: 'baz' };

      try {
        await model.updateOne(inserted, modified);
      } catch (err) {
        expect(err).toBeTruthy();
      }

      expect(await model.findOne(inserted)).toBeTruthy();
    });
  });

  describe('delete', () => {
    it('should delete one', async () => {
      const existing = await model.insertOne({ foo: 'bar' });

      expect(await db.count(table.name)).toBe(1);

      await model.deleteOne(existing);

      expect(await db.count(table.name)).toBe(0);
    });

    it('should require id to delete', async () => {
      const { id, ...resource } = await model.insertOne({ foo: 'bar' });
      expect(await model.findOne(resource)).toBeTruthy();
      expect(await db.count(table.name)).toBe(1);

      await model.deleteOne(resource);

      expect(await model.findOne(resource)).toBeTruthy();
      expect(await db.count(table.name)).toBe(1);
    });

    it('should not delete randomly', async () => {
      const { id } = await model.insertOne({ foo: 'bar' });
      expect(await db.count(table.name)).toBe(1);

      try {
        await model.deleteOne(null);
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await db.count(table.name)).toBe(1);
      }

      try {
        await model.deleteOne();
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await db.count(table.name)).toBe(1);
      }

      try {
        await model.deleteOne({});
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await db.count(table.name)).toBe(1);
      }

      try {
        await model.deleteOne({ foo: '1234' });
        expect('Should not reach').toBe(true);
      } catch (err) {
        expect(err).toBeTruthy();
      } finally {
        expect(await db.count(table.name)).toBe(1);
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
    beforeEach(async () => db.dropTable(table.name));

    describe('userRequired', () => {
      it('insert should require owner property', async () => {
        const aModel = restModel(db, table, { userRequired: true });
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

      it('update should require owner property', async () => {
        const aModel = restModel(db, table, { userRequired: true });
        await aModel.init();

        const inserted = await aModel.insertOne({ foo: 'bar', owner: 'baz' });
        const { id } = inserted;

        const modified = { foo: 'baz', id };
        expect(inserted.foo).not.toBe(modified.foo);

        try {
          await aModel.updateOne(inserted, modified);
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/owner is a required field/u.test(message)).toBe(true);
        } finally {
          expect((await aModel.findOne({ id })).foo).toBe(inserted.foo);
        }

        await aModel.updateOne(inserted, { ...modified, owner: 'owner' });
        expect((await aModel.findOne({ id })).foo).toBe(modified.foo);
      });
    });

    describe('validator', () => {
      it('should accept a custom validator', async () => {
        const validator = object({ foo: string().email().required() }).noUnknown().strict();
        const aModel = restModel(db, table, { userRequired: false, validator });
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
          restModel(db, { ...table, columns: [{ name: reserved, type: 'string' }] });
          expect('unreachable').toBe(true);
        } catch ({ message }) {
          expect(/reserved/u.test(message)).toBe(true);
        }
      });
    });
  });

  describe('type conversion', () => {
    it('should return right types', async () => {
      await db.dropTable(table.name);

      const aModel = restModel(
        db,
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
