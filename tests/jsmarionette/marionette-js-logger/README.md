# Marionette JS Console plugin

[![Build
Status](https://travis-ci.org/mozilla-b2g/marionette-js-logger.png)](https://travis-ci.org/mozilla-b2g/marionette-js-logger)

Installs code into the client to buffer all of the logged console messages.
Because of the presumed synchronous operation of marionette-js-runner, Messages
are retrieved when explicitly requested or as an implict byproduct of waiting
for specific log messages.



## Usage

```js

// create the plugin. This must run before startSession.
client.plugin('logger', require('marionette-js-logger'));

client.startSession(function() {
  logGrabber = client.logger;

  // You can listen for the 'message' event, it will be fired when calls cause
  // logs to be retrieved from the server.
  logGrabber.on('message', function(msg) {
    msg.window; // The URI of the document/window the log happened in
    msg.level; // log/info/warn/error/exception/debug
    msg.message; // raw string of message
    msg.filename; // source file log call was made from
    msg.lineNumber; // line number where call was made
    msg.functionName; // function name where call was made
    msg.timeStamp; // standard JS timestamp; milliseconds since the epoch (UTC) 
  };

  // Explicitly fetch all available logs from the server, emitting 'message'
  // events.
  logGrabber.grabLogMessages();

  // Fetch all available logs from the server, but if there aren't any there
  // yet, wait for at least one new message to be logged.  This will wait for
  // at least one turn of the event loop before returning for efficiency reasons
  // and to avoid mistaken understandings of the state of the device.  Do not
  // depend on this to leave certain messages on the device.
  logGrabber.grabAtLeastOneNewMessage();

  // Keep fetching logs from the server and calling the provided method until
  // it returns true indicating it found the log message it wanted.  'message'
  // events will still be emitted for all logs retrieved as a result of these
  // calls.  While the function will only be called on messages until it returns
  // true and will not be called for any messages retrieved after the first call
  // that returns true, 'message' events will be emitted for ALL retrieved logs.
  // Also, subsequent calls to waitForLogMessage will only call the function
  // for newly retrieved logs.
  logGrabber.waitForLogMessage(function checksEveryNewMessage(msg) {
    return /my car keys/.test(msg.message);
  });

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
