define(function() {
  'use strict';

  var ZoomBar = function ZoomBar(element) {
    this.element = element;
    this.innerElement = element.querySelector('.zoom-bar-inner');
    this.handleElement = element.querySelector('.zoom-bar-handle');

    var innerHeight = this.innerElement.offsetHeight;
    var rotation = 0;

    var getTouchFromEvent = function(evt) {
      return evt.touches ? evt.touches[0] : {
        pageX: evt.pageX,
        pageY: evt.pageY
      };
    };

    var self = this;
    var lastTouch = null;

    var touchStartHandler = function(evt) {
      lastTouch = getTouchFromEvent(evt);
      innerHeight = self.innerElement.offsetHeight;

      var transform = window.getComputedStyle(element).transform;
      switch (transform) {
        case 'matrix(1, 0, 0, 1, 0, 0)':
          rotation = 0;
          break;
        case 'matrix(0, -1, 1, 0, 0, 0)':
          rotation = 90;
          break;
        case 'matrix(-1, 0, 0, -1, 0, 0)':
          rotation = 180;
          break;
        case 'matrix(0, 1, -1, 0, 0, 0)':
          rotation = 270;
          break;
        default:
          break;
      }

      evt.stopPropagation();
    };

    var touchMoveHandler = function(evt) {
      if (!lastTouch) {
        return;
      }

      var touch = getTouchFromEvent(evt);

      var delta = {
        x: lastTouch.pageX - touch.pageX,
        y: lastTouch.pageY - touch.pageY
      };

      var scale = self._maximum / innerHeight;
      
      delta.x *= scale;
      delta.y *= scale;

      switch (rotation) {
        case 0:
          self.setValue(self._value + delta.y);
          break;
        case 90:
          self.setValue(self._value + delta.x);
          break;
        case 180:
          self.setValue(self._value - delta.y);
          break;
        case 270:
          self.setValue(self._value - delta.x);
          break;
        default:
          break;
      }

      lastTouch = touch;
    };

    var touchEndHandler = function(evt) {
      if (!lastTouch) {
        return;
      }

      lastTouch = null;
    };

    element.addEventListener('touchstart', touchStartHandler);
    element.addEventListener('mousedown',  touchStartHandler);

    window.addEventListener('touchmove', touchMoveHandler);
    window.addEventListener('mousemove', touchMoveHandler);

    window.addEventListener('touchend', touchEndHandler);
    window.addEventListener('mouseup',  touchEndHandler);
  };

  ZoomBar.prototype = {
    constructor: ZoomBar,

    element: null,
    innerElement: null,
    handleElement: null,

    _minimum: 0,

    getMinimum: function() {
      return this._minimum;
    },

    setMinimum: function(minimum) {
      this._minimum = minimum;
      this.setValue(this._value);
    },

    _maximum: 100,

    getMaximum: function() {
      return this._maximum;
    },

    setMaximum: function(maximum) {
      this._maximum = maximum;
      this.setValue(this._value);
    },

    _value: 0,

    getValue: function() {
      return this._value;
    },

    setValue: function(value) {
      var lastValue = this._value;

      this._value = Math.min(Math.max(value, this._minimum), this._maximum);

      if (this._value === lastValue) {
        return;
      }

      this.innerElement.style.background = 'linear-gradient(to top, ' +
        'rgba(255,255,255,1) ' + this._value + '%, ' +
        'rgba(113,145,155,0.75) ' + this._value + '%)';

      this.handleElement.style.bottom = this._value + '%';

      var changeEvent = new CustomEvent('change', {
        detail: this._value
      });

      this.element.dispatchEvent(changeEvent);
    }
  };

  return ZoomBar;
});
