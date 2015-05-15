# Mocha JSON Proxy Reporter

Mocha reporter for remoting test results from one process to another.

## Usage

### Reporter

Add mocha-json-reporter to your package.json.

Run mocha with the reporter:

```sh
./node_modules/.bin/mocha --reporter mocha-json-proxy/reporter
```

### Consumer

The consumer utilizes the output of the reporter to create a "runner"
which can be passed to another reporter.

```js 
var fork = require('child_process').fork,
    mocha = require('mocha'),
    Consumer = require('mocha-json-proxy/consumer');

var child = fork(
  './node_modules/.bin/_mocha', // path to mocha **must be _mocha**
  ['--reporter', 'mocha-json-proxy/reporter'], // options for mocha
  { envs: { MOCHA_PROXY_SEND_ONLY: 1  } } // turn on "fork" mode
);

var runner = new Consumer(child);
// transforms output from the proxy to this reporter format.
new mocha.reporters.Spec(runner); 
```

### Supported Reporters

  - Spec
  - List
  - Dot
  - Min
  - JSON
  - JSONStream
  - Nyan,
  - Progress
  - List

## LICENSE

Copyright (c) 2015 Mozilla Foundation

Contributors: James Lal <jlal@mozilla.com> (irc: lightsofapollo)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
