// This module registers a key event listener and handles double space.
// It needs to run before the code that resisters the default key handler.
'use strict';
(function(exports) {

  function DoubleSpace(app) {
    this._started = false;
    this.touchHandler = app.touchHandler;
    this.inputField = app.inputField;
  }

  DoubleSpace.prototype.DOUBLE_SPACE_INTERVAL_MS = 500;

  DoubleSpace.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    // When a key event is a space, set its timestamp here
    this.lastKeyWasSpace = 0;

    // Remember whether we did a double space conversion on the last key event.
    // If we did and the next key event is backspace, we want to revert the
    // change.
    this.convertedOnLastEvent = false;

    // Listen to key events from the keyboard
    this.touchHandler.addEventListener('key', this);
  };

  DoubleSpace.prototype.stop = function stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    this.lastKeyWasSpace = 0;
    this.convertedOnLastEvent = false;
    this.touchHandler.removeEventListener('key', this);
  };

  DoubleSpace.prototype.handleEvent = function handleEvent(evt) {
    var type = evt.type;
    if (type !== 'key') {
      throw 'DoubleSpace would only handle events with type=key';
    }

    var inputField = this.inputField;

    var keyname = evt.detail;

    if (keyname === 'SPACE') {
      // If the last key was a space and it wasn't very long ago, and
      // the text before the cursor ends with a non-space, non-punctuation
      // character followed by a space character, then convert
      // space space into period space.
      if (this.lastKeyWasSpace &&
          inputField.textBeforeCursor.match(/[^\s.?!;:] $/) &&
          (evt.timeStamp - this.lastKeyWasSpace) <
           this.DOUBLE_SPACE_INTERVAL_MS * 1000) {
        inputField.replaceSurroundingText('. ', 1, 0);
        evt.stopImmediatePropagation();
        this.lastKeyWasSpace = 0;
        this.convertedOnLastEvent = true;
      } else {
        this.lastKeyWasSpace = evt.timeStamp;
        this.convertedOnLastEvent = false;
      }
    } else if (keyname === 'BACKSPACE' && this.convertedOnLastEvent) {
      inputField.replaceSurroundingText('  ', 2, 0);
      evt.stopImmediatePropagation();
      this.lastKeyWasSpace = 0;
      this.convertedOnLastEvent = false;
    } else {
      this.lastKeyWasSpace = 0;
      this.convertedOnLastEvent = false;
    }
  };

  DoubleSpace.prototype.resetLastKeyWasSpace = function resetLastKeyWasSpace() {
    this.convertedOnLastEvent = false;
    this.lastKeyWasSpace = 0;
  };

  exports.DoubleSpace = DoubleSpace;
}(window));
