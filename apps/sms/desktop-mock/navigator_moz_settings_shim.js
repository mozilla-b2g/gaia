'use strict';

/* ***********************************************************

  Workaround to force the mozSettings in shim context use window one.
  Need to be removed once all the event listeners are ready for shim.

*********************************************************** */
(function(window) {

if (!opener || !opener.navigator.mozSettings) {
  console.error('mozSettings for main window context is not ready!');
  return;
}

navigator.mozSettings = opener.navigator.mozSettings;

}(window));
