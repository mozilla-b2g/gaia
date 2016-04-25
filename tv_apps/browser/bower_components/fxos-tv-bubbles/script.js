window.FxosTvBubbles = (function(win) {
  'use strict';

  var DEFAULT_INTERVAL = 100;

  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  proto.fireEvent = function(event, detail) {
    var evtObject = new CustomEvent(event, {
                                      bubbles: false,
                                      detail: detail || this
                                    });
    this.dispatchEvent(evtObject);
  };

  proto.handleEvent = function(evt) {
    switch(evt.type) {
      case 'animationend':
        this.fireEvent('item-bubbled', ++this._finishedAnimationCount);
        if (this._targetAnimationCount === this._finishedAnimationCount) {
          this.playing = false;
          [].forEach.call(this._elements, function(elem) {
            elem.classList.remove('fxos-tv-bubble-playing');
            // XXX:Usually we use <fxos-tv-button> within container of
            // fxos-tv-bubbles. If we remove style of fxos-tv-bubble-playing,
            // Gecko would apply original style of fxos-tv-button instead and it
            // has transition property too. This results in another transition
            // happens on <fxos-tv-button> while we thought we'd just stop
            // animation. That is why we need to add 'fxos-tv-bubble-stopped' here
            // to prevent unexpected animation from happening.
            elem.classList.add('fxos-tv-bubble-stopped');
            // use getComputedStyle to force flushing re-style
            window.getComputedStyle(elem).animationName;
            elem.classList.remove('fxos-tv-bubble-stopped');
            window.getComputedStyle(elem).animationName;
            elem.style.animationDelay = '';
          }.bind(this));
          this._elements = null;
          this.fireEvent('all-items-bubbled');
        }
        evt.currentTarget.removeEventListener('animationend', this);
        break;
    }
  };

  proto.play = function(elements) {
    this.stopImmediately();
    this._elements = elements;
    this._finishedAnimationCount = 0;
    this._targetAnimationCount = 0;
    var interval = parseInt(this.getAttribute('interval'), 10) ||
                   DEFAULT_INTERVAL;
    [].forEach.call(elements, function(elem) {
      this._targetAnimationCount++;
      var delay = this._targetAnimationCount * interval / 1000;
      elem.classList.add('fxos-tv-bubble-playing');
      elem.style.animationDelay = delay + 's';
      elem.addEventListener('animationend', this);
    }.bind(this));
    this.playing = true;
  };

  proto.stopImmediately = function() {
    if (!this.playing || !this._elements) {
      return;
    }
    [].forEach.call(this._elements, function(elem) {
      elem.classList.remove('fxos-tv-bubble-playing');
      elem.classList.add('fxos-tv-bubble-stopped');
      elem.removeEventListener('animationend', this);
      // use getComputedStyle to force flushing re-style
      window.getComputedStyle(elem).animationName;
      elem.classList.remove('fxos-tv-bubble-stopped');
    }.bind(this));
    this._elements = null;
    this.playing = false;
    this.fireEvent('all-items-stopped');
  };

  // Register and return the constructor
  return document.registerElement('fxos-tv-bubbles', { prototype: proto });
})(window);
