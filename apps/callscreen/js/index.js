'use strict';

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  CallsHandler.setup();
  AudioCompetingHelper.init('callscreen');
  CallScreen.init();
  KeypadManager.init(true);
});

// Bug 1083729: add an empty unload event listener to circumvent bug 1078448.
window.addEventListener('unload', function unloadCallScreen(evt) { });

// Don't keep an audio channel open when the callscreen is not displayed
document.addEventListener('visibilitychange', function visibilitychanged() {
  if (document.hidden) {
    TonePlayer.trashAudio();
  } else {
    TonePlayer.ensureAudio();
  }
});
