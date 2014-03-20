'use strict';

(function(exports) {
  /**
   * This module is responsible for handling the shift key and for
   * auto-capitalization.
   *
   * @class ShiftKey
   */
  function ShiftKey(app) {
    this._started = false;
    this.app = app;
    this.touchHandler = app.touchHandler;
  }

  // Max time bewteen taps on the shift key to go into locked mode
  ShiftKey.prototype.CAPS_LOCK_INTERVAL = 450;  // ms

  ShiftKey.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    this.lastShiftTime = 0;

    this.touchHandler.addEventListener('key', this);

    this.app.inputField.addEventListener('inputfieldchanged', this);
    this.app.inputField.addEventListener('inputstatechanged', this);
  };

  ShiftKey.prototype.stop = function stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    this.lastShiftTime = 0;

    this.touchHandler.removeEventListener('key', this);

    this.app.inputField.removeEventListener('inputfieldchanged', this);
    this.app.inputField.removeEventListener('inputstatechanged', this);
  };

  ShiftKey.prototype.handleEvent = function handleEvent(evt) {
    switch (evt.type) {
      case 'key':
        // XXX: pass event object here.
        this.handleKey(evt);
        break;

      case 'inputfieldchanged':
      case 'inputstatechanged':
        this.stateChanged();
        break;
    }
  };

  ShiftKey.prototype.handleKey = function handleKey(evt) {
    var keyname = evt.detail;
    var currentPageView = this.app.currentPageView;

    // XXX: better to look up the key and switch on the key command 'shift'
    // instead of hardcoding the name here?
    switch (keyname) {
      case 'SHIFT':
        if (currentPageView.locked) {
          currentPageView.setShiftState(false, false);
        } else if (currentPageView.shifted) {
          var interval = (evt.timeStamp - this.lastShiftTime) / 1000;
          if (this.lastShiftTime &&
              interval < this.CAPS_LOCK_INTERVAL) {
            currentPageView.setShiftState(true, true);
          } else {
            currentPageView.setShiftState(false, false);
          }
        } else {
          currentPageView.setShiftState(true, false);
        }
        this.lastShiftTime = evt.timeStamp;
        evt.stopImmediatePropagation();
        break;

      default:
        this.lastShiftTime = 0;
        break;
    }
  };

  ShiftKey.prototype.stateChanged = function stateChanged() {
    var currentPageView = this.app.currentPageView;

    // If caps lock is on we do nothing
    if (currentPageView.locked) {
      return;
    }

    // This is autocapitalization and also the code that turns off
    // the shift key after one capital letter.
    // XXX:
    // If we're in verbatim mode we don't want to automatically turn
    // the shift key on, but we do still want to turn it off after a
    // single use. So be careful when making this configurable.
    var newvalue = this.app.inputField.atSentenceStart();
    if (newvalue !== currentPageView.shifted) {
      currentPageView.setShiftState(newvalue, false);
    }
  };

  exports.ShiftKey = ShiftKey;
}(window));
