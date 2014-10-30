# Mozilla Profiler Builder

[![Build
Status](https://travis-ci.org/lightsofapollo/mozilla-profile-builder.png)](https://travis-ci.org/lightsofapollo/mozilla-profile-builder)

Create profiles for mozilla runtimes (like firefox or b2g
desktop).


### Usage 

Example of using all options:

``` js
var profile = require('mozilla-profile-builder');

var options = {
  // special gaia base profile
  profile: ['gaia', '/Applications/B2G.app']
  // or use the baseProfile directly
  profile: ['baseProfile', '/Applications/B2G.app/Contents/MacOS/gaia'],
  // omit profile for a blank directory to be used as base
  
  profile: '~/workspace/gaia/profile', // or give it a string to use this profile only (no copying)

  // launch about:config in firefox for more pref names.
  prefs: {
    // turn on dump so it will output to stdout
    'browser.dom.window.dump.enabled': true,

    // bump up max workers
    'dom.workers.maxPerDomain': 100
  },

  settings: {
    // turn off first run experience
    'ftu.manifestURL': null
  },

  // also apps can be preloaded (packaged apps)
  apps: {
    'origin-for-my-app.com': '/path/to/app'
  },

  // copy files into profile once it has been created. Used for
  // copying prebuilt databases and other files into profiles.
  extracts: '/path/to/extract/dir'
};

profile.create(options, function(err, instance) {
 // instance.path
 // instance.destroy(function() {});
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
