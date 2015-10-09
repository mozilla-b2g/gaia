# Marionette Apps

A node library that manages Firefox OS applications through Marionette.

## Usage

```js
// create the plugin. Must come _before_ startSession
client.plugin('apps', require('marionette-apps'));

client.startSession(function() {
  // launch the app
  client.apps.launch('app://myorigin.com'); 

  // entrypoint variant
  client.apps.launch('app://myorigin.com', 'xfoo'); 

  // close a running application
  client.apps.close('app://myorigin.com');

  // entrypoint variant
  client.apps.close('app://myorigin.com', 'xfoo');

  // switch to the iframe of a given app origin  should run after launch
  client.apps.switchToApp('app://myorigin.com');
  // entrypoint variant
  client.apps.switchToApp('app://myorigin.com', 'xfoo');

  // find all apps
  var apps = client.apps.list();

  // find a single app
  var app = client.app.getApp('app://...');
  // entrypoint variant
  var appPoint = client.app.getApp('app://', 'entrypoint');

});


```

## License

Copyright (c) 2015 Mozilla Foundation

Contributors: Gareth Aye <gaye@mozilla.com>, James Lal <jlal@mozilla.com>

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
