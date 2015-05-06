'use strict';

window.SmartBubbles = (function(win) {

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
        evt.currentTarget.classList.remove('smart-bubble-playing');
        evt.currentTarget.classList.add('smart-bubble-stopped');
        window.getComputedStyle(evt.currentTarget).animationName;
        evt.currentTarget.classList.remove('smart-bubble-stopped');
        window.getComputedStyle(evt.currentTarget).animationName;

        this.fireEvent('item-bubbled', ++this._finishedAnimationCount);
        if (this._targetAnimationCount === this._finishedAnimationCount) {
          this.playing = false;
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
      elem.classList.add('smart-bubble-playing');
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
      elem.classList.remove('smart-bubble-playing');
      elem.classList.add('smart-bubble-stopped');
      elem.removeEventListener('animationend', this);
      // use getComputedStyle to force flushing re-style
      window.getComputedStyle(elem).animationName;
      elem.classList.remove('smart-bubble-stopped');
    }.bind(this));
    this._elements = null;
    this.playing = false;
    this.fireEvent('all-items-stopped');
  };

  // Register and return the constructor
  return document.registerElement('smart-bubbles', { prototype: proto });
})(window);
