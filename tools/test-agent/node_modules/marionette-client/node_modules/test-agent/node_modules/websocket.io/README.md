WebSocket.IO
============

[![Build Status](https://secure.travis-ci.org/learnboost/websocket.io.png)](http://travis-ci.org/learnboost/websocket.io)

WebSocket.IO is an abstraction of the websocket server previously used by Socket.IO.
It has the broadest support for websocket protocol/specifications and an API that
allows for interoperability with higher-level frameworks such as
[Engine](http://github.com/learnboost/engine.io),
[Socket.IO](http://github.com/learnboost/socket.io)'s realtime core.

## Features

- Fast
- Minimalistic
  - Offers an integration API for higher-level impls to handle authorization,
    routing, etc
- Widest support of protocols
  - Draft-75
  - Draft-76
  - Draft-00
  - Protocol version 7
  - Protocol version 8
  - Protocol version 13
- Written for Node 0.6

## How to use

### Server

#### (A) Listening on a port

```js
var ws = require('websocket.io')
  , server = ws.listen(3000)

server.on('connection', function (socket) {
  socket.on('message', function () { });
  socket.on('close', function () { });
});
```

#### (B) Intercepting WebSocket requests for a http.Server

```js
var ws = require('websocket.io')
  , http = require('http').createServer().listen(3000)
  , server = ws.attach(http)

server.on('connection', function (socket) {
  socket.on('message', function () { });
  socket.on('close', function () { });
});
```

#### (C) Passing in requests

```js
var ws = require('websocket.io')
  , server = new ws.Server()

server.on('connection', function (socket) {
  socket.send('hi');
});

// …
httpServer.on('upgrade', function (req, socket, head) {
  server.handleUpgrade(req, socket, head);
});
```

### Client-side example

```js
var ws = new WebSocket("ws://host:port/");        

socket.onopen = function() {
 //do something when connection estabilished
};

socket.onmessage = function(message) {
 //do something when message arrives
};

socket.onclose = function() {
 //do something when connection close
};

```

## API

<hr><br>

### Top-level

These are exposed by `require('websocket.io')`

#### Properties

- `version` _(String)_: protocol revision number
- `Server` _(Function)_: server constructor
- `Socket` _(Function)_: client constructor
- `Logger` _(Function)_: logger constructor
- `protocols` _(Object)_: hash of different `Socket` constructors for each protocol
    - `drafts` _(Function)_: client for drafts 75/76/00
    - `7` _(Function)_: client for protocol 7
    - `8` _(Function)_: client for protocol 8
    - `13` _(Function)_: client for protocol 13

#### Methods

- `listen`
    - Creates an `http.Server` which listens on the given port and attaches WS
      to it. It returns `501 Not Implemented` for regular http requests.
    - **Parameters**
      - `Number`: port to listen on.
      - `Function`: callback for `listen`. The options object can be supplied
        as second parameter as well.
      - `Object`: optional, options object. See `Server` constructor API for
        options.
    - **Returns** `Server`
- `attach`
    - Captures `upgrade` requests for a `http.Server`. In other words, makes
      a regular http.Server websocket-compatible.
    - **Parameters**
      - `http.Server`: server to attach to.
      - `Object`: optional, options object. See `Server` constructor API for
        options.
    - **Returns** `Server`

<hr><br>

### Server

#### Events

- `connection`
    - Fired when a new connection is established.
    - **Arguments**
      - `Socket`: a Socket object

#### Methods

- **constructor**
    - Initializes the server
    - **Parameters**
      - `Object`: optional, options object
    - **Options**
      - `logger` (`Object`/`Boolean`): logger object. If you want to customize the
        logger options, please supply a new `Logger` object (see API below). If you
        want to enable it, set this option to `true`.
- ``handleUpgrade``
    - Handles an incoming request that triggered an `upgrade` event
    - **Parameters**
      - `http.Request`: http request
      - `http.Stream`: request socket
      - `Buffer`: stream head
    - **Returns** `Server`

<hr><br>

### Socket

#### Events

- `message`
    - Fired when data is received.
    - **Arguments**
      - `String`: data
- `close`
    - Fired when the connection is closed.

#### Properties

- `open`
    - Whether the socket is open for writing
- `req`
    - `http.ServerRequest` that originated the connection
- `socket`
    - `net.Stream` that originated the connection

#### Methods

- ``send``
    - Sends data to the socket.
    - **Parameters**
      - `String`: data to send
    - **Returns** `Socket`
- ``close``
    - Closes the socket.
    - **Returns** `Socket`
- ``destroy``
    - Forcibly closes the socket.
    - **Returns** `Socket`

<hr><br>

### Logger

#### Methods

- **constructor**
    - Initializes the logger
    - **Parameters**
      - `Object`: optional, options object
    - **Options**
      - `enabled` (`Boolean`): whether to output to the console (`false`).
      - `log level` (`Number`): log level (`3`).
      - `colors` (`Boolean`): whether to output colors (`true`).

#### Methods

- **log**
- **debug**
- **warn**
- **info**

## Support

The support channels for `websocket.io` are the same as `socket.io`:

  * irc.freenode.net **#socket.io**
  * [Google Groups](http://groups.google.com/group/socket_io)
  * [Website](http://socket.io)

## Development

To contribute patches, run tests or benchmarks, make sure to clone the
repository:

```
git clone git://github.com/LearnBoost/websocket.io.git
```

Then:

```
cd websocket.io
npm install
```

## Tests

```
$ make test
```
## Benchmarks

```
$ make bench
```

## License 

(The MIT License)

Copyright (c) 2011 Guillermo Rauch &lt;guillermo@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
