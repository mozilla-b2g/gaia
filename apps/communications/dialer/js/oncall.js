'use strict';

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  CallsHandler.setup();
  CallScreen.init();
  KeypadManager.init(true);
});

window.addEventListener('unload', function() {
  // When we end the call, we need to clean up the TonePlayer to reset the audio
  // context's channel back to "normal" to let other audio start playing again.
  // Otherwise, we'll have to wait until the cycle collector kills it, which
  // can take a while.
  TonePlayer.setChannel('normal');
});
