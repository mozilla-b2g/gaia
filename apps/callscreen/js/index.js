'use strict';
/* globals AudioCompetingHelper, CallsHandler, CallScreen,
   KeypadManager */

/**
 * Function invoked at onload time to initialize the application.
 */
function onLoadCallScreen(evt) {
  window.removeEventListener('load', onLoadCallScreen);

  CallsHandler.setup();
  AudioCompetingHelper.init('callscreen');
  CallScreen.init();
  KeypadManager.init(/* oncall */ true);
}

window.addEventListener('load', onLoadCallScreen);