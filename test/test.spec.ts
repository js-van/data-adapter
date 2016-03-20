import {Adapt, denormalize, normalize} from '../lib/index';
import * as chai from 'chai';

class Foo {
  @Adapt({ name: 'baz' }) bar = 42;
  @Adapt({ denormalize: 1.618, normalize: 42 }) foobar = 42;
}

class Bar {
  baz = 12;
}

class Baz {
  @Adapt({ hide: true }) foo = 12;
  baz = 42;
}

class Foobar {
  @Adapt({ type: Foo }) foo = new Foo();
  @Adapt({ name: 'baz', type: Bar }) bar = new Bar();
}

const name = (obj: Object, name: string): string => {
  return 'baz';
};

const denormalizeCb = (obj: Object, prop: string): any => {
  return obj[prop] + 1;
};

class Bazfoo {
  @Adapt({ name, denormalize: denormalizeCb }) foo = 42;
}

class Foobaz {
  foo = {
    bar: 42
  };
}

class Foobaz2 {
  @Adapt({ name: 'baz' })
  foo = {
    bar: 42
  };
}

const genderToNumber = (obj, prop) => {
  return obj[prop] === 'male' ? 0 : 1;
};
const numberToGender = (obj, prop) => {
  return obj[prop] === 0 ? 'male' : 'female';
};

class Kid {
  @Adapt({ normalize: numberToGender, denormalize: genderToNumber })
  gender;
}

class Parent {
  @Adapt({ name: 'first_name' }) firstName;
  @Adapt({ name: 'last_name' }) lastName;
  @Adapt({ type: Kid })
  kids;
}

class Bazbarfoo {
  @Adapt({ name: 'foo' })
  bar = 42;
}

class Barfoo {
  @Adapt({ name: 'bar', type: Bazbarfoo })
  foo = [new Bazbarfoo(), new Bazbarfoo()];
}

describe('Data adapter', () => {
  describe('denormalize', () => {
    it('should work without decorators set', () => {
      const instance = { baz: 12 };
      chai.expect(denormalize(instance, Bar)).deep.equal({ baz: 12 });
    });
    it('should work without type set', () => {
      const instance = new Foo();
      chai.expect(denormalize(instance, Foo)).deep.equal({ baz: 42, foobar: 1.618 });
    });
    it('should work with "name" and "denormalize"', () => {
      const instance = { bar: 12, foobar: 45 };
      chai.expect(denormalize(instance, Foo)).deep.equal({ baz: 12, foobar: 1.618 });
    });
    it('should work with "hide"', () => {
      const instance = new Baz();
      chai.expect(denormalize(instance)).deep.equal({ baz: 42 });
    });
    it('should work with "complex" props', () => {
      const instance = new Foobar();
      chai.expect(denormalize(instance)).deep.equal({
        foo: {
          baz: 42,
          foobar: 1.618
        },
        baz: {
          baz: 12
        }
      });
    });
    it('should work with callbacks', () => {
      const instance = new Bazfoo();
      chai.expect(denormalize(instance)).deep.equal({ baz: 43  });
    });
    it('should work with arrays', () => {
      const instance = new Barfoo();
      chai.expect(denormalize(instance)).deep.equal({
        bar: [{ foo: 42 }, { foo: 42 }]
      });
    });
  });
  describe('normalize', () => {
    it('should normalize simple objects', () => {
      const instance = { baz: 12 };
      const denormalized = denormalize(instance, Bar);
      chai.expect(instance).deep.equal(normalize(denormalized, Bar));
    });
    it('should work with nested objects', () => {
      const data = new Foobaz();
      chai.expect(data).deep.equal(normalize(data, Foobaz));
    });
    it('should work with renamed objects', () => {
      const data = { baz: { bar: 42 } };
      chai.expect({ foo: { bar: 42 } }).deep.equal(normalize(data, Foobaz2));
    });
    it('should work with complex objects', () => {
      const instance = new Foobar();
      const denormalized = denormalize(instance, Foobar);
      chai.expect(instance).deep.equal(normalize(denormalized, Foobar));
    });
    it('should work with nested adapt rules', () => {
      const parent = new Parent();
      parent.firstName = 'foo';
      parent.lastName = 'bar';
      const kid1 = new Kid();
      kid1.gender = 'male';
      const kid2 = new Kid();
      kid2.gender = 'female';
      parent.kids = [kid1, kid2];
      const denormalized = denormalize(parent);
      chai.expect(denormalized).deep.equal({
        'first_name': 'foo',
        'last_name': 'bar',
        kids: [{
          gender: 0
        }, {
          gender: 1
        }]
      });
      const normalized = normalize(denormalized, Parent);
      chai.expect(normalized).deep.equal({
        firstName: 'foo',
        lastName: 'bar',
        kids: [{
          gender: 'male'
        }, {
          gender: 'female'
        }]
      });
    });
  });
});

