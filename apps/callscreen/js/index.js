'use strict';
/* globals AudioCompetingHelper, CallsHandler, CallScreen,
   KeypadManager, TonePlayer */

window.addEventListener('load', function callSetup(evt) {
  window.removeEventListener('load', callSetup);

  CallsHandler.setup();
  AudioCompetingHelper.init('callscreen');
  CallScreen.init();
  KeypadManager.init(true);
});

window.addEventListener('unload', function unloadCallScreen(evt) {
  console.debug('Unloaded callscreen.');
});

// Don't keep an audio channel open when the callscreen is not displayed
document.addEventListener('visibilitychange', function visibilitychanged() {
  if (document.hidden) {
    TonePlayer.trashAudio();
  } else {
    TonePlayer.ensureAudio();
  }
});
