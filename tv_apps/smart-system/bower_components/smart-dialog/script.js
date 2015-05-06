/**
 * Smart-Dialog
 *   - Event:
 *       1. will-open
 *       2. opened
 *       3. will-close
 *       4. closed
 *   - API:
 *       1. open - open a smart-dialog: closed -> opening -> opened
 *       2. close - close a smart-dialog: opened -> closing -> closed
 *   - Attribute:
 *       1. title - title of the smart-dialog
 *       2. esc-close - close dialog when ESC key is clicked (default true).
 * Default scale: 1920x1080 (2*sqrt(960*960 + 1080*1080) / 20 = 144.5)
 */

window.SmartDialog = (function(win) {
  'use strict';

  // The value of openDuration and closeDuration should be the same as
  // transitionDuration in opening and closing css class.
  const openDuration = 1000;
  const closeDuration = 650;

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function sd_createdCallback() {
    this.addEventListener('transitionend', this);
    document.addEventListener('keyup', this);
    this.transitionTimer = null;
    this.classList.add('closed');
    if (this.hasAttribute('background-color')) {
      this.style.backgroundColor = this.getAttribute('background-color');
    }
  };

  proto._onOpened = function sd_onOpened() {
    this.classList.remove('opening');
    this.classList.add('opened');
    this.fireEvent('opened');
  };

  proto._onClosed = function sd_onClosed() {
    this.classList.remove('closing');
    this.classList.add('closed');
    this.fireEvent('closed');
  };

  proto.open = function sd_open() {
    if (this.classList.contains('opened') ||
        this.classList.contains('opening')) {
      return;
    }
    this.fireEvent('will-open');
    this.classList.remove('closing');
    this.classList.remove('closed');
    this.classList.add('opening');
    // handle the case when transitionend event is not fired
    clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(function() {
      this._onOpened();
      this.transitionTimer = null;
    }.bind(this), openDuration);
  };

  proto.close = function sd_close() {
    if (this.classList.contains('closed') ||
        this.classList.contains('closing')) {
      return;
    }
    this.fireEvent('will-close');
    this.classList.remove('opening');
    this.classList.remove('opened');
    this.classList.add('closing');
    // handle the case when transitionend event is not fired
    clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(function() {
      this._onClosed();
      this.transitionTimer = null;
    }.bind(this), closeDuration);
  };

  proto.handleEvent = function sd_handleEvent(evt) {

    switch(evt.type) {
      case 'transitionend':
        if (evt.target === this && this.transitionTimer) {
          if (this.classList.contains('opening')) {
            this._onOpened();
          } else if (this.classList.contains('closing')) {
            this._onClosed();
          }
          clearTimeout(this.transitionTimer);
          this.transitionTimer = null;
        }
        break;
      case 'keyup':
        // close dialog when ESC is clicked
        if (this.getAttribute('esc-close') != 'false' &&
            (evt.keyCode === 27 || evt.key === 'Esc') &&
            this.classList.contains('opened')) {
          this.close();
        }
        break;
    }
  };


  proto.fireEvent = function sd_fireEvent(event, detail) {
    var evtObject = new CustomEvent(event, {
                                      bubbles: false,
                                      detail: detail || this
                                    });
    this.dispatchEvent(evtObject);
  };

  // Register and return the constructor
  return document.registerElement('smart-dialog', { prototype: proto });
})(window);
