// This module registers a key event listener and handles double space.
// It needs to run before the code that resisters the default key handler.
(function(exports) {
  'use strict';

  const DOUBLE_SPACE_INTERVAL_MS = 500;

  // When a key event is a space, set its timestamp here
  var lastKeyWasSpace = 0;

  // Remember whether we did a double space conversion on the last key event.
  // If we did and the next key event is backspace, we want to revert the
  // change.
  var convertedOnLastEvent = false;

  // Listen to key events from the keyboard
  KeyboardTouchHandler.addEventListener('key', handleKey);

  function handleKey(e) {
    var keyname = e.detail;

    if (keyname === 'SPACE') {
      // If the last key was a space and it wasn't very long ago, and
      // the text before the cursor ends with a non-space, non-punctuation
      // character followed by a space character, then convert
      // space space into period space.
      if (lastKeyWasSpace &&
          InputField.textBeforeCursor.match(/[^\s.?!;:] $/) &&
          (e.timeStamp - lastKeyWasSpace) < DOUBLE_SPACE_INTERVAL_MS * 1000) {
        InputField.replaceSurroundingText('. ', 1, 0);
        e.stopImmediatePropagation();
        lastKeyWasSpace = 0;
        convertedOnLastEvent = true;
      }
      else {
        lastKeyWasSpace = e.timeStamp;
        convertedOnLastEvent = false;
      }
    }
    else if (keyname === 'BACKSPACE' && convertedOnLastEvent) {
      InputField.replaceSurroundingText('  ', 2, 0);
      e.stopImmediatePropagation();
      lastKeyWasSpace = 0;
      convertedOnLastEvent = false;
    }
    else {
      lastKeyWasSpace = 0;
      convertedOnLastEvent = false;
    }
  }

  exports.DoubleSpace = {
    resetLastKeyWasSpace: function() {
      convertedOnLastEvent = false;
      lastKeyWasSpace = 0;
    }
  };
}(window));
