/* global SourceEvent */
'use strict';

/**
 * DOM event source for Stream. One Stream can collect events from multiple
 * sources, which pass different native events (not only DOM events)
 * to Stream.
 **/
(function(exports) {
  var DOMEventSource = function(configs) {
    this.configs = {
      events: configs.events || [],
    };
    this._collector = window.addEventListener.bind(window);
    this._decollector = window.removeEventListener.bind(window);
    this._forwardTo; // The forwarding target.

    // Some API you just can't bind it with the object,
    // but a function.
    this.onchange = this.onchange.bind(this);
  };

  DOMEventSource.prototype.start = function(forwardTo) {
    this.configs.events.forEach((ename) => {
      this._collector(ename, this.onchange);
    });
    this._forwardTo = forwardTo;
    return this;
  };

  DOMEventSource.prototype.stop = function() {
    this._forwardTo = null;
    this.configs.events.forEach((ename) => {
      this._decollector(ename, this.onchange);
    });
    return this;
  };

  /**
   * For forwarding to the target.
   */
  DOMEventSource.prototype.onchange = function(domevt) {
    if (this._forwardTo) {
      var sourceEvent = new SourceEvent(
        domevt.type, domevt.detail, domevt);
      this._forwardTo(sourceEvent);
    }
  };

  exports.DOMEventSource = DOMEventSource;
})(window);

