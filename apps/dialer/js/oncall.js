'use strict';
/* globals CallsHandler, CallScreen, KeypadManager, TonePlayer */

/**
 * Function invoked at onload time to initialize the application.
 */
function onLoadCallScreen(evt) {
  window.removeEventListener('load', onLoadCallScreen);

  // According to the UX sound spec, we should use the "system" type for the
  // dialer pad. See the attachment of the bug1068219.
  TonePlayer.init('telephony');
  CallsHandler.setup();
  CallScreen.init();
  KeypadManager.init(/* oncall */ true);
}

/**
 * Dummy function introduced in bug 1083729, see below.
 */
function unloadCallScreen(evt) { }

window.addEventListener('load', onLoadCallScreen);

// Bug 1083729: add an empty unload event listener to circumvent bug 1078448.
window.addEventListener('unload', unloadCallScreen);
