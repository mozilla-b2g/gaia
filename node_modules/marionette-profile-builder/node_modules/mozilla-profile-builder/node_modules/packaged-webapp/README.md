# Packaged App installer

Installs a webapp into an existing profile as a preloaded packaged app.

[![Build
Status](https://travis-ci.org/lightsofapollo/packaged-webapp.png)](https://travis-ci.org/lightsofapollo/packaged-webapp)


## Usage

```js

var webapp = require('packaged-webapp');
var profile = '/path/to/profile';

var options = {
  // source must contain a manifest.webapp file
  source: '/path/to/webapp',
  // origin of app usually in the following format:
  origin: 'mydomain.name'
};

webapp.installApp(profile, options, function() {
  // yey app is installed into profile
});

// multiple apps in parallel
webapp.installApps(profile, [optionsForA, ...], function() {
  // ...
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
