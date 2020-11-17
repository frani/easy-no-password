# Easy No Password

The increasing scrutiny over weak passwords has been leading more and more developers to opt for passwordless login flows and two-factor authentication.

Passwordless login and two-factor authentication usually involve emailing or texting a unique token to a user, and giving them a certain amount of time to enter that token into the login screen.

This library is unique because it uses cryptography techniques to generate timestamped tokens, eliminating the need for a database to store tokens. The tokens themselves contain all the information needed to check for their validity.

## Installation

    $ npm install  @frani/easy-no-password

## Quick Start

```javascript
const enp = require('@frani/easy-no-password')

// Creating a token
let userid = 'frani'
let secret = 'shh-this-is-our-secret'
let token = await enp.create(userid, secret) // '8ejx73k9z01'

// Validating a token
let token = '8ejx73k9z01'
let userid = 'frani'
let secret = 'shh-this-is-our-secret'
let validated = await enp.validate(token, userid, secret) // TRUE or FALSE
```

## More Details

The tokens are 64-bit values encoded into 10-11 ASCII characters. Tokens are generated with a millisecond timestamp resolution. This means that with the default window of 15 minutes, at any point in time, 9e5 tokens are valid out of a total space of 2^64 (0.000000000005%).

## Contributing

Contributions are welcome. Before submitting a pull request, please check for errors by running the tests and the JavaScript linter.

    $ cd /path/to/easy-no-password
    $ npm run test
    $ npm run lint

Please also run your changes with an newer version of Node.js; this library supports from to Node.js version 10.x
Github Actions will fail if you write code incompatible with Node.js version 10.x

## License

MIT

## Inspiration

[sffc's repository](https://github.com/sffc/easy-no-password)
