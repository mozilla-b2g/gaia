'use strict';

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  CallsHandler.setup();
  AudioCompetingHelper.init('callscreen');
  CallScreen.init();
  KeypadManager.init(true);
});

// Intentionally listening to unload event to turn off bfcache
// which would cause Bug 1030550. This won't be removed until
// Bug 1040565 is resolved.
window.addEventListener('unload', function onunload(evt) {
  window.removeEventListener('unload', onunload);
});

// Don't keep an audio channel open when the callscreen is not displayed
document.addEventListener('visibilitychange', function visibilitychanged() {
  if (document.hidden) {
    TonePlayer.trashAudio();
  } else {
    TonePlayer.ensureAudio();
  }
});
