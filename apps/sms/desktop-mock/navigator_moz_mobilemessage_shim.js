'use strict';

/* ***********************************************************

  Workaround to force the mozMobileMessage in shim context use window one.
  Need to be removed once all the event listeners are ready for shim.

*********************************************************** */
(function(window) {
 
  if (!parent.navigator.mozMobileMessage) {
    console.error('mozMobileMessage for main window context is not ready!');
    return;
  }

  navigator.mozMobileMessage = parent.navigator.mozMobileMessage;

}(window));
