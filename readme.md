# Introduction

Library for data adaptation using decorators. You can declaratively state how your data should look when being send to the server.

## Example

```ts
import {Adapt, adapt} from 'data-adapter';

const genderTransform = (obj, field) => {
  return obj[field] === 'male' ? 0 : 1;
};

class Person {
  @Adapt({ name: 'first_name' }) firstName = 'John Doe';
  @Adapt({ valueCallback: genderTransform }) gender = 'male';
}

// { first_name: 'John Doe', gender: 0 }
adapt(new Person());
```

## Roadmap

- [ ] Allow adaptation in the opposite direction.

## License

MIT

