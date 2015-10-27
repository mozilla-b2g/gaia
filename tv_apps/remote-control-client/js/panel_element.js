'use strict';

(function(exports) {
  var DEBUG = false;

  var defaultOptions = {
    touchReportPeriod: 60,      // milliseconds
    dblClickTimeThreshold: 250, // milliseconds
    clickTimeThreshold: 200,    // milliseconds
    clickMoveThreshold: 10,     // pixels
    swipeMoveThreshold: 25,     // pixels
    touchingClass: null         // CSS class
  };

  function PanelElement(elem, options) {
    if (typeof options === 'function') {
      options = {
        handler: options
      };
    } else if (!options || typeof options !== 'object') {
      options = {};
    }

    this.options = {};
    for (var key in defaultOptions) {
      this.options[key] = (typeof options[key] === 'undefined') ?
        defaultOptions[key] : options[key];
    }

    if (typeof options.handler === 'function') {
      this._handler = options.handler.bind(elem);
    } else {
      this._handler = function(type, detail) {};
    }

    this._element = elem;

    this._hasMouseDown = false;
    this._eventIdentifier = null;
    this._startX = 0;
    this._startY = 0;
    this._prevDx = null;
    this._prevDy = null;
    this._startTime = 0;
    this._waitForClickTimer = null;
    this._pendingClickTimer = null;
    this._reportTimer = null;
    this._pendingMoveEvent = null;
    this._touchIdentifier = null;
    this._panelX = 0;
    this._panelY = 0;
    this._panelWidth = 0;
    this._panelHeight = 0;

    this._element.addEventListener('mousedown', this);
    window.addEventListener('mousemove', this);
    window.addEventListener('mouseup', this);

    this._element.addEventListener('touchstart', this);
    this._element.addEventListener('touchmove', this);
    this._element.addEventListener('touchend', this);

    window.addEventListener('resize', this);
    this.updatePanelInfo();
  }

  PanelElement.prototype = {
    uninit: function() {
      window.removeEventListener('resize', this);

      this._element.removeEventListener('touchend', this);
      this._element.removeEventListener('touchmove', this);
      this._element.removeEventListener('touchstart', this);

      window.removeEventListener('mouseup', this);
      window.removeEventListener('mousemove', this);
      this._element.removeEventListener('mousedown', this);

      this._element = null;
      this._handler = null;
      this.options = null;
    },

    updatePanelInfo: function() {
      var rect = this._element.getBoundingClientRect();
      this._panelX = Math.round(rect.left);
      this._panelY = Math.round(rect.top);
      this._panelWidth = Math.round(rect.width);
      this._panelHeight = Math.round(rect.height);
    },

    handleEvent: function(evt) {
      var touches, touch;

      switch(evt.type) {
        case 'resize':
          this.updatePanelInfo();
          break;
        case 'mousedown':
          if (evt.button === 0) {
            this._hasMouseDown = true;
            this.onStart(evt.clientX, evt.clientY);
            evt.preventDefault();
          }
          break;
        case 'mousemove':
          if (this._hasMouseDown) {
            this.onMove(evt.clientX, evt.clientY);
            evt.preventDefault();
          }
          break;
        case 'mouseup':
          if (this._hasMouseDown && evt.button === 0) {
            this._hasMouseDown = false;
            this.onEnd(evt.clientX, evt.clientY);
            evt.preventDefault();
          }
          break;
        case 'touchstart':
          if (this._touchIdentifier !== null) {
            evt.preventDefault();
            return;
          }
          touches = evt.changedTouches;
          if (touches.length == 1) {
            touch = touches[0];
            this._touchIdentifier = touch.identifier;
            this.onStart(touch.pageX - this._panelX,
                         touch.pageY - this._panelY);
            evt.preventDefault();
          }
          break;
        case 'touchmove':
        case 'touchend':
          touches = evt.changedTouches;
          touch = null;
          for(var i = 0; i < touches.length; i++) {
            if (touches[i].identifier == this._touchIdentifier) {
              touch = touches[i];
              break;
            }
          }
          if (touch) {
            if (evt.type == 'touchend') {
              this._touchIdentifier = null;
              this.onEnd(touch.pageX - this._panelX,
                         touch.pageY - this._panelY);
            } else {
              this.onMove(touch.pageX - this._panelX,
                          touch.pageY - this._panelY);
            }
          }
          evt.preventDefault();
          break;
      }
    },

    onStart: function(x, y) {
      document.activeElement.blur();

      if (this.options.touchingClass) {
        this._element.classList.add(this.options.touchingClass);
      }

      this._startX = x;
      this._startY = y;
      this._startTime = Date.now();

      var handleTouchStart = function() {
        this._waitForClickTimer = null;
        this.handleTouch('touchstart', 0, 0);
      }.bind(this);

      if (this.options.clickTimeThreshold) {
        this._waitForClickTimer = setTimeout(handleTouchStart,
          this.options.clickTimeThreshold);
      } else {
        handleTouchStart();
      }
    },

    onMove: function(x, y) {
      var dx = x - this._startX;
      var dy = y - this._startY;

      if (this._waitForClickTimer) {
        var clickMoveThreshold = this.options.clickMoveThreshold;
        if (Math.abs(dx) <= clickMoveThreshold &&
            Math.abs(dy) <= clickMoveThreshold) {
          return;
        }
        clearTimeout(this._waitForClickTimer);
        this._waitForClickTimer = null;
        this.handleTouch('touchstart', 0, 0);
      }

      this.handleTouch('touchmove', dx, dy);
    },

    onEnd: function(x, y) {
      var dx = x - this._startX;
      var dy = y - this._startY;

      if (this._waitForClickTimer) {
        clearTimeout(this._waitForClickTimer);
        this._waitForClickTimer = null;

        if (this.options.dblClickTimeThreshold) {
          if (this._pendingClickTimer) {
            clearTimeout(this._pendingClickTimer);
            this._pendingClickTimer = null;
            this.handleTouch('dblclick');
          } else {
            this._pendingClickTimer = setTimeout(function() {
              this._pendingClickTimer = null;
              this.handleTouch('click');
            }.bind(this), this.options.dblClickTimeThreshold);
          }
        } else {
          this.handleTouch('click');
        }
      } else {
        var direction;
        var distance = Math.round(Math.sqrt(dx * dx + dy * dy));
        if (distance >= this.options.swipeMoveThreshold) {
          var angle = Math.atan2(dy, dx) * 180 / Math.PI;
          if (angle < 0) {
            angle += 360;
          }
          if (angle >= 315 || angle < 45) {
            direction = 'right';
          } else if (angle >= 45 && angle < 135) {
            direction = 'down';
          } else if (angle >= 135 && angle < 225) {
            direction = 'left';
          } else if (angle >= 225 && angle < 315) {
            direction = 'up';
          }
        }

        this.handleTouch('touchend', dx, dy, direction);
      }

      if (this.options.touchingClass) {
        this._element.classList.remove(this.options.touchingClass);
      }
    },

    handleTouch: function(type, dx, dy, swipe) {
      if (DEBUG) {
        console.log('[PanelElement] handling ' + type);
      }

      switch (type) {
        case 'touchstart':
          this._prevDx = undefined;
          this._prevDy = undefined;
          // A simple unique identifier for server to distinguish touch events
          // between different clients.
          this._eventIdentifier =
            String(Date.now()) + String(Math.floor(Math.random() * 100));

          this._handler(type, {
            width: this._panelWidth,
            height: this._panelHeight,
            identifier: this._eventIdentifier
          });

          this._reportTimer = setInterval(function() {
            if (this._pendingMoveEvent) {
              this._handler(
                this._pendingMoveEvent.type,
                this._pendingMoveEvent.detail
              );
              this._pendingMoveEvent = null;
            }
          }.bind(this), this.options.touchReportPeriod);

          break;
        case 'touchmove':
          if (dx === this._prevDx && dy === this._prevDy) {
            return;
          }

          this._prevDx = dx;
          this._prevDy = dy;

          this._pendingMoveEvent = {
            type: type,
            detail: {
              dx: dx,
              dy: dy,
              identifier: this._eventIdentifier,
              duration: Date.now() - this._startTime
            }
          };

          break;
        case 'touchend':
          this._pendingMoveEvent = null;
          clearInterval(this._reportTimer);
          this._reportTimer = null;

          this._handler(type, {
            dx: dx,
            dy: dy,
            identifier: this._eventIdentifier,
            duration: Date.now() - this._startTime,
            swipe: swipe
          });

          this._eventIdentifier = null;
          break;
        case 'click':
        case 'dblclick':
          this._handler(type, {});
          break;
      }
    }
  };

  exports.PanelElement = PanelElement;
}(window));
