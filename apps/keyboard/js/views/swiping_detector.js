'use strict';

(function(exports) {

function SwipingDetector(element) {
  this.element = element;
  this.state = this.STATE_INIT;
}

SwipingDetector.prototype.EVENT_TYPES = [
  'touchstart',
  'touchmove',
  'touchend'
];

SwipingDetector.prototype.VELOCITY_SMOOTHING = 0.5;

SwipingDetector.prototype.STATE_INIT = 0;
SwipingDetector.prototype.STATE_PANNING = 1;

SwipingDetector.prototype.onpan = null;
SwipingDetector.prototype.onswipe = null;

SwipingDetector.prototype.start = function() {
  this.EVENT_TYPES.forEach(function(type) {
    this.element.addEventListener(type, this);
  }, this);
};

SwipingDetector.prototype.stop = function() {
  this.EVENT_TYPES.forEach(function(type) {
    this.element.removeEventListener(type, this);
  }, this);
};

SwipingDetector.prototype.handleEvent = function(evt) {
  var current;
  var touch;

  switch (evt.type) {
    case 'touchstart':
      if (this.state === this.STATE_PANNING) {
        return;
      }

      touch = evt.touches[0];
      this.touchStartTimestamp = evt.timeStamp;
      this.startX = touch.pageX;
      this.startCoords = this.getCoordinates(evt, touch);
      this.last = this.startCoords;

      this.deltaX = 0;

      this.touchID = touch.identifier;
      this.vx = this.vy = null;

      if (typeof this.ontouchstart === 'function') {
        this.ontouchstart({
          position: this.getCoordinates(evt, touch)
        });
      }
      break;

    case 'touchmove':
      if (evt.timeStamp == this.last.timeStamp) {
        return;
      }

      touch = evt.touches[0];
      if (touch.identifier != this.touchID) {
        return;
      }

      this.state = this.STATE_PANNING;
      current = this.getCoordinates(evt, touch);

      if (typeof this.onpan === 'function') {
        this.onpan({
          dx: current.screenX - this.startX,
          position: this.getCoordinates(evt, touch)
        });
      }

      var dt = current.timeStamp - this.last.timeStamp;
      var vx = (current.screenX - this.last.screenX) / dt;
      var vy = (current.screenY - this.last.screenY) / dt;

      if (this.vx == null) { // first time; no average
        this.vx = vx;
        this.vy = vy;
      } else {
        this.vx = this.vx * this.VELOCITY_SMOOTHING +
          vx * (1 - this.VELOCITY_SMOOTHING);
        this.vy = this.vy * this.VELOCITY_SMOOTHING +
          vy * (1 - this.VELOCITY_SMOOTHING);
      }

      this.last = current;
      break;

    case 'touchend':
      for (var i = 0; i < evt.changedTouches.length; i++) {
        if (evt.changedTouches[i].identifier !== this.touchID) {
          continue;
        }
        // Emit a swipe event when the finger goes up.
        // Report start and end point, dx, dy, dt, velocity and direction
        current = this.getCoordinates(evt, evt.changedTouches[i]);
        var dx = current.screenX - this.startCoords.screenX;
        var dy = current.screenY - this.startCoords.screenY;

        // angle is a positive number of degrees, starting at 0 on the
        // positive x axis and increasing clockwise.
        var angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle < 0) {
          angle += 360;
        }
        var direction;
        if (angle >= 315 || angle < 45) {
          direction = 'right';
        } else if (angle >= 45 && angle < 135) {
          direction = 'down';
        } else if (angle >= 135 && angle < 225) {
          direction = 'left';
        } else if (angle >= 225 && angle < 315) {
          direction = 'up';
        }

        if (typeof this.onswipe === 'function') {
          this.onswipe({
            start: this.startCoords,
            end: current,
            dx: dx,
            dy: dy,
            dt: evt.timeStamp - this.startCoords.timeStamp,
            vx: this.vx,
            vy: this.vy,
            direction: direction,
            angle: angle
          });
        }
        this.state = this.STATE_INIT;
      }
      break;
  }
};

SwipingDetector.prototype.getCoordinates = function(event, touch) {
  return Object.freeze({
    screenX: touch.screenX,
    screenY: touch.screenY,
    clientX: touch.clientX,
    clientY: touch.clientY,
    timeStamp: event.timeStamp
  });
};

exports.SwipingDetector = SwipingDetector;

})(window);
