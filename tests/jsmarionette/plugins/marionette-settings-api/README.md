# Marionette Settings API

A node library that provides access to MozSettings through Marionette.

## Getting Started

    npm install

## Usage

```js
// create the plugin. Must come _before_ startSession
client.plugin('SettingsAPI', require('marionette-settings-api'));

client.startSession(function() {
  // get a setting
  currentLanguage = client.SettingsAPI.get('language.current');

  // set a setting
  client.SettingsAPI.set('language.current', 'en-GB');

});


```

## License

Copyright (c) 2015 Mozilla Foundation

Contributors: Bob Silverberg <bsilverberg@mozilla.com>, James Lal <jlal@mozilla.com>

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
