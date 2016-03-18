import {Adapt, denormalize} from '../lib/index';
import * as chai from 'chai';

class Foo {
  @Adapt({ name: 'baz' }) bar = 42;
  @Adapt({ value: 1.618 }) foobar = 42;
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
  @Adapt({ name: 'baz' }) bar = new Bar();
}

const name = (obj: Object, name: string): string => {
  return 'baz';
};

const value = (obj: Object, field: string): any => {
  return obj[field] + 1;
};

class Bazfoo {
  @Adapt({ name, value }) foo = 42;
}

describe('Data adapter', () => {
  it('should work without decorators set', () => {
    const instance = { baz: 12 };
    chai.expect(denormalize(instance, Bar)).deep.equal({ baz: 12 });
  });
  it('should work without type set', () => {
    const instance = new Foo();
    chai.expect(denormalize(instance, Foo)).deep.equal({ baz: 42, foobar: 1.618 });
  });
  it('should work with "name" and "value"', () => {
    const instance = { bar: 12, foobar: 45 };
    chai.expect(denormalize(instance, Foo)).deep.equal({ baz: 12, foobar: 1.618 });
  });
  it('should work with "hide"', () => {
    const instance = new Baz();
    chai.expect(denormalize(instance)).deep.equal({ baz: 42 });
  });
  it('should work with "complex" fields', () => {
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
});

