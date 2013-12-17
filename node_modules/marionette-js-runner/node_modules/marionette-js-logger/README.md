# Marionette JS Console plugin

[![Build
Status](https://travis-ci.org/lightsofapollo/marionette-js-logger.png)](https://travis-ci.org/lightsofapollo/marionette-js-logger)

Proxies console.* calls made in b2g-desktop or firefox directly to your
node host. Uses a websocket and the observer api (in firefox/b2g) to
give you reliable console.log notices without overriding the global.

## Usage

```js

// create the plugin. This must run before startSession.
client.plugin('logger', require('marionette-js-logger'));

client.startSession(function() {
  // server needs to be closed at some point (server.close());
  server = client.logger;

  // yey now console.log will be proxied to the node process!
  // you can optionally override the console.log behaviour
  server.handleMessage = function(event) {
    event.message; // raw string of message
    event.fileName; // name where it was called
    event.lineNumber; // line number of call
  };

  client.executeScript(function() {
    // this works too but more importantly all other console.log's in content work too
    console.log(document.location.href);
  });

  client.deleteSession();
});
```

## LICENSE

Copyright (c) 2013 Mozilla Foundation

Contributors: Sahaja James Lal jlal@mozilla.com

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
