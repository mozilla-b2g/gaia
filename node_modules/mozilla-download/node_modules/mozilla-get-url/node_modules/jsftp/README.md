jsftp <a href="http://flattr.com/thing/1452098/" target="_blank"><img src="http://api.flattr.com/button/flattr-badge-large.png" alt="Flattr this" title="Flattr this" border="0" /></a>
=====

A client FTP library for NodeJS that focuses on correctness, clarity
and conciseness. It doesn't get in the way and plays nice with streaming APIs.

[![NPM](https://nodei.co/npm/jsftp.png)](https://nodei.co/npm/jsftp/)

**Warning: The latest version (1.0.0) of jsftp breaks API compatibility with previous
versions, it is NOT a drop-in replacement. Please be careful when upgrading. The
API changes are not drastic at all and it is all documented below. If you do not
want to upgrade yet you should stay with version 0.6.0, the last one before the
upgrade. The API docs below are updated for 1.0.**

Starting it up
--------------

```javascript
var JSFtp = require("jsftp");

var Ftp = new JSFtp({
  host: "myserver.com",
  port: 3331, // defaults to 21
  user: "user", // defaults to "anonymous"
  pass: "1234" // defaults to "@anonymous"
};
```

jsftp gives you access to all the raw commands of the FTP protocol in form of
methods in the `Ftp` object. It also provides several convenience methods for
actions that require complex chains of commands (e.g. uploading and retrieving
files, passive operations), as shown below.

When raw commands succeed they always pass the response of the server to the
callback, in the form of an object that contains two properties: `code`, which
is the response code of the FTP operation, and `text`, which is the complete
text of the response.

Raw (or native) commands are accessible in the form `Ftp.raw["command"](params, callback)`

Thus, a command like `QUIT` will be called like this:

```javascript
Ftp.raw.quit(function(err, data) {
    if (err) return console.error(err);

    console.log("Bye!");
});
```

and a command like `MKD` (make directory), which accepts parameters, looks like this:

```javascript
Ftp.raw.mkd("/new_dir", function(err, data) {
    if (err) return console.error(err);

    console.log(data.text); // Show the FTP response text to the user
    console.log(data.code); // Show the FTP response code to the user
});
```

API and examples
----------------

#### new Ftp(options)
  - `options` is an object with the following properties:

  ```javascript
  {
    host: 'localhost', // Host name for the current FTP server.
    port: 3333, // Port number for the current FTP server (defaults to 21).
    user: 'user', // Username
    pass: 'pass', // Password
  }
  ```

Creates a new Ftp instance.


#### Ftp.host

Host name for the current FTP server.

#### Ftp.port

Port number for the current FTP server (defaults to 21).

#### Ftp.socket

NodeJS socket for the current FTP server.

#### Ftp.features

Array of feature names for the current FTP server. It is
generated when the user authenticates with the `auth` method.

#### Ftp.system

Contains the system identification string for the remote FTP server.


### Methods

#### Ftp.raw.FTP_COMMAND([params], callback)
All the standard FTP commands are available under the `raw` namespace. These
commands might accept parameters or not, but they always accept a callback
with the signature `err, data`, in which `err` is the error response coming
from the server (usually a 4xx or 5xx error code) and the data is an object
that contains two properties: `code` and `text`. `code` is an integer indicating
the response code of the response and `text` is the response string itself.

#### Ftp.auth(username, password, callback)
Authenticates the user with the given username and password. If null or empty
values are passed for those, `auth` will use anonymous credentials. `callback`
will be called with the response text in case of successful login or with an
error as a first parameter, in normal Node fashion.

#### Ftp.ls(filePath, callback)
Lists information about files or directories and yields an array of file objects
with parsed file properties to the `callback`. You should use this function
instead of `stat` or `list` in case you need to do something with the individual
file properties.

```javascript
ftp.ls(".", function(err, res) {
  res.forEach(function(file) {
    console.log(file.name);
  });
});
```

#### Ftp.list(filePath, callback)
Lists `filePath` contents using a passive connection. Calls callback with an
array of strings with complete file information.

```javascript
ftp.list(remoteCWD, function(err, res) {
  res.forEach(function(file) {
    console.log(file.name);
  });
  // Prints something like
  // -rw-r--r--   1 sergi    staff           4 Jun 03 09:32 testfile1.txt
  // -rw-r--r--   1 sergi    staff           4 Jun 03 09:31 testfile2.txt
  // -rw-r--r--   1 sergi    staff           0 May 29 13:05 testfile3.txt
  // ...
});
```

#### Ftp.get(remotePath, callback)
Gives back a paused socket with the file contents ready to be streamed,
or calls the callback with an error if not successful.

```javascript
  var str = ""; // Will store the contents of the file
  ftp.get('remote/path/file.txt', function(err, socket) {
    if (err) return;

    socket.on("data", function(d) { str += d.toString(); })
    socket.on("close", function(hadErr) {
      if (hadErr)
        console.error('There was an error retrieving the file.');
    });
    socket.resume();
  });
```

#### Ftp.get(remotePath, localPath, callback)
Stores the remote file directly in the given local path.

```javascript
  ftp.get('remote/file.txt, 'local/file.txt, function(hadErr) {
    if (hadErr)
      console.error('There was an error retrieving the file.');
    else
      console.log('File copied successfully!');
  });
```

#### Ftp.put(source, remotePath, callback)
Uploads a file to `filePath`. It accepts a string with the local path for the
file or a `Buffer` as a `source` parameter.

```javascript
ftp.put(buffer, 'path/to/remote/file.txt', function(hadError) {
  if (!hadError)
    console.log("File transferred successfully!");
});
```

#### Ftp.rename(from, to, callback)
Renames a file in the server. `from` and `to` are both filepaths.

```javascript
ftp.rename(from, to, function(err, res) {
  if (!err)
    console.log("Renaming successful!");
});
```

#### Ftp.keepAlive()
Refreshes the interval thats keep the server connection active.

You can find more usage examples in the [unit tests](https://github.com/sergi/jsftp/blob/master/test/jsftp_test.js). This documentation
will grow as jsftp evolves.

Installation
------------

    npm install jsftp

Test coverage
-------------

In order to run coverage reports:

    npm install --dev
    make coverage

    Current overall coverage rate:
      lines......: 92.1% (316 of 343 lines)
      functions..: 91.0% (71 of 78 functions)


Tests
-----

To run tests:

    npm install --dev
    make test

License
-------

See LICENSE.
