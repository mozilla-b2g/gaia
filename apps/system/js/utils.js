/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
* Debug method
*/
var DEBUG = false;
SettingsListener.observe('debug.trace-system.enabled', false, function(value) {
  DEBUG = value;
});
function debug(msg, optObject) {
  if (DEBUG) {
    var output = '[DEBUG # System]: ' + msg;
    if (optObject) {
      output += JSON.stringify(optObject);
    }
    console.log(output);
  }
}
