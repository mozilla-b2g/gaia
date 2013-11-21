/*
 * This module is responsible for handling the shift key and for
 * auto-capitalization.
 */
(function(exports) {
  'use strict';

  var lastShiftTime = 0;

  // Max time bewteen taps on the shift key to go into locked mode
  const CAPS_LOCK_INTERVAL = 450;  // ms

  KeyboardTouchHandler.addEventListener('key', function handleKey(e) {
    var keyname = e.detail;

    // XXX: better to look up the key and switch on the key command 'shift'
    // instead of hardcoding the name here?
    switch (keyname) {
    case 'SHIFT':
      if (currentPageView.locked) {
        currentPageView.setShiftState(false, false);
      }
      else if (currentPageView.shifted) {
        if (lastShiftTime &&
            (e.timeStamp - lastShiftTime) / 1000 < CAPS_LOCK_INTERVAL) {
          currentPageView.setShiftState(true, true);
        }
        else {
          currentPageView.setShiftState(false, false);
        }
      }
      else {
        currentPageView.setShiftState(true, false);
      }
      lastShiftTime = e.timeStamp;
      e.stopImmediatePropagation();
      break;

    default:
      lastShiftTime = 0;
      break;
    }
  });

  // Listen to change events from the input field
  InputField.addEventListener('inputfieldchanged', stateChanged);
  InputField.addEventListener('inputstatechanged', stateChanged);

  function stateChanged() {
    // If caps lock is on we do nothing
    if (currentPageView.locked)
      return;

    // This is autocapitalization and also the code that turns off
    // the shift key after one capital letter.
    // XXX:
    // If we're in verbatim mode we don't want to automatically turn
    // the shift key on, but we do still want to turn it off after a
    // single use. So be careful when making this configurable.
    var newvalue = InputField.atSentenceStart();
    if (newvalue !== currentPageView.shifted) {
      currentPageView.setShiftState(newvalue, false);
    }
  }
}(window));
