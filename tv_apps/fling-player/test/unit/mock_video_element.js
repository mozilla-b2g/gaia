/**
 * This mock is for the case that just want a simple video element for testing.
 * Also, see Bug 1199985, because a real HTMLVideoElement cannot play video
 * on TV gecko, we can use it for a temp subtitude for test case that needs
 * a HTMLVideoElement.
 */
(function(exports) {
  'use strict';

  function MockVideoElement(config = {}) {
    var self = this;
    this.src = config.src || '';
    this.ended = config.ended || false;
    this.paused = config.paused || true;
    this.hidden = config.hidden || false;
    this.duration = config.duration || 0;
    this.currentTime = config.currentTime || 0;
    this.buffered = {
      length : 1,
      start : function () {
        return 0;
      },
      end : function () {
        return Math.max(self.currentTime + 10, self.duration);
      }
    };

    this._events = {};
  }

  var proto = MockVideoElement.prototype;

  proto.fireEvent = function (e) {

    var listeners = this._events[e.type];
    if (listeners) {

      listeners.forEach((listener) => {
        if (typeof listener == 'function') {
          listener.call(this, e);
        } else {
          listener.handleEvent(e);
        }
      });
    }
  };

  proto.addEventListener = function (type, listener) {

    var listeners = this._events[type];
    if (!listeners) {
      this._events[type] = listeners = [];
    }

    listeners.push(listener);
  };

  proto.removeAttribute = function (attr) {
    this[attr] = '';
  };

  proto.load =  function () {
    this.paused = false;
    this.currentTime = 0;
    this.fireEvent(new Event('loadedmetadata'));
  };

  proto.play = function () {
    this.paused = false;
    this.fireEvent(new Event('playing'));
  };

  proto.pause = function () {
    this.paused = true;
    this.fireEvent(new Event('pause'));
  };

  exports.MockVideoElement = MockVideoElement;

})(window);
