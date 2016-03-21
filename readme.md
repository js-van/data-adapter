# Introduction

Library for data adaptation using decorators. You can declaratively state how your data should look when being send to the server.

## How to use?

```
npm install data-adapter
```

## Example

### Using class adapter

```ts
import {AdaptClass, denormalize, normalize} from 'data-adapter';

@AdaptClass({
  name: snakeCase
})
class Human {
  firstName: string = 'foo';
  lastName: string = 'bar';
  age: number = 42;
}

// { first_name: 'foo', last_name: 'bar', age: 42 }
denormalize(new Human());

// { firstName: 'foo', lastName: 'bar', age: 42 }
normalize({ first_name: 'foo', last_name: 'bar', age: 42 }, Human);

```

### Using property adapters

```ts
import {Adapt, denormalize, normalize} from 'data-adapter';

const denormalize = (obj, field) => {
  return obj[field] === 'male' ? 0 : 1;
};

const normalize = (obj, field) => {
  return obj[field] === 0 ? 'male' : 'female';
};

class Kid {
  @Adapt({ normalize, denormalize })
  gender;
}

class Parent {
  @Adapt({ name: 'first_name' }) firstName;
  @Adapt({ name: 'last_name' }) lastName;
  @Adapt({ type: Kid })
  kids;
}

let parent = new Parent();
parent.firstName = 'John';
parent.lastName = 'Doe';

let kid1 = new Kid();
kid1.gender = 'male';
let kid2 = new Kid();
kid2.gender = 'female';

// { first_name: 'John', last_name: 'Doe', kids: [{ gender: 0 }, { gender: 1 }] }
const denormalized = denormalize(new Person());

// { firstName: 'John', lastName: 'Doe', kids: [{ gender: 'male' }, { gender: 'female' }] }
const normalized = normalize(denormalized);
```

## License

MIT

