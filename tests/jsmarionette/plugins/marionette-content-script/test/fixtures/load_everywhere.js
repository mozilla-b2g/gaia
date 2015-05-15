/* global Components, Services, dump */
'use strict';
Components.utils.import('resource://gre/modules/Services.jsm');

try {
  Services.obs.addObserver(function(document) {
    if (!document || !document.location)
      return;

    var location = document.location.href;
    dump('\n\n' + location + '\n\n');

    try {
      let window = document.defaultView.wrappedJSObject;
      window.navigator.__defineGetter__('I_AM_HACKED', function() {
        return 'UNIQUE';
      });
    } catch (e) {
      dump('ERR: ' + e.toString() + '\n');
    }
  }, 'document-element-inserted', false);
} catch (e) {
  dump('ERR: ' + e.toString() + '\n');
}
