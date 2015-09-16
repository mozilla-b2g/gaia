/* exported getMockBookmark */
'use strict';

function getMockBookmark(opts) {
  var data = {
    type: 'url',
    url: 'http://example.com/',
    name: 'Example',
    iconable: false
  };

  // Overwrite default values with whatever comes in "opts" from the test.
  if (opts) {
    for (var key in opts) {
      data[key] = opts[key];
    }
  }

  return data;
}
