/* global Components, ctypes */
'use strict';
suite('crash', function() {
  var client = marionette.client();

  test('crash me', function() {
    client.scope({ context: 'chrome' }).executeScript(function() {
      const Cu = Components.utils;
      Cu.import('resource://gre/modules/ctypes.jsm');

      var dies = function() {
        var zero = new ctypes.intptr_t(8);
        var badptr = ctypes.cast(zero, ctypes.PointerType(ctypes.int32_t));
        badptr.contents;
      };

      dump('Et tu, Brute?');
      dies();
    });
  });
});

