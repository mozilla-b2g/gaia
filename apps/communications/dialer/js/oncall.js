'use strict';

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  CallsHandler.setup();
  CallScreen.init();
  KeypadManager.init(true);
});
