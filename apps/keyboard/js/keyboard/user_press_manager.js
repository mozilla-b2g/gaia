'use strict';

// This file absorbs touch events and mouse events and convert them to
// fake "UserPress events". UserPress instances will contain the element
// which the user is moved on (located with document.elementFromPoint() since
// touch events always fired from the originating element).
//
// In the future this module can be responsible of events from
// hardware keyboard -- we will have to extend UserPress and make it store
// non-UI-specific information.
(function(exports) {

/**
 * UserPress instance represents a single user interaction, by touch or mouse.
 */
var UserPress = function(obj, coords) {
  // |target| is an abstract key object, not a DOM element
  this.target = obj;
  this.updateCoords(coords, false);
};

UserPress.prototype.updateCoords = function(coords, moved) {
  this.moved = moved;
  this.clientX = coords.clientX;
  this.clientY = coords.clientY;
};

/**
 * UserPressManager listen to touch and mouse event and call the callbacks
 * attached to the instance.
 */
var UserPressManager = function(app) {
  this._started = false;
  this._ignoreMouseEvents = false;

  // Use a ECMAScript 6 Map object so we won't cast touch.identifier to string.
  // http://mdn.io/map
  this.presses = new Map();
  // Count the # of touchstart events on a element, we need this to ensure
  // we didn't remove the event listeners prematurely.
  // This is a WeakMap because we obviously don't care about
  // elements already GC'd.
  this.touchstartCounts = new WeakMap();

  this.app = app;
};

UserPressManager.prototype.onpressstart = null;
UserPressManager.prototype.onpressmove = null;
UserPressManager.prototype.onpressend = null;

UserPressManager.prototype.MOVE_LIMIT = 5;

UserPressManager.prototype.start = function() {
  this.app.console.log('UserPressManager.start()');
  if (this._started) {
    throw new Error('UserPressManager: ' +
      'Instance should not be start()\'ed twice.');
  }
  this._started = true;

  this._container = this.app.getContainer();

  this._container.addEventListener('touchstart', this);
  this._container.addEventListener('mousedown', this);

  this._container.addEventListener('contextmenu', this);
};

UserPressManager.prototype.stop = function() {
  this.app.console.log('UserPressManager.stop()');
  if (!this._started) {
    throw new Error('UserPressManager: ' +
      'Instance was never start()\'ed but stop() is called.');
  }
  this._started = false;

  this._container.removeEventListener('touchstart', this);
  this._container.removeEventListener('mousedown', this);
  this._container.removeEventListener('mousemove', this);
  this._container.removeEventListener('mouseup', this);
  this._container.removeEventListener('mouseleave', this);

  this._container.removeEventListener('contextmenu', this);
};

UserPressManager.prototype.handleEvent = function(evt) {
  var touch, touchId, el, i, touchstartCount;
  switch (evt.type) {
    case 'contextmenu':
      // Prevent all contextmenu event so no context menu on B2G/Desktop
      evt.preventDefault();
      break;

    case 'touchstart':
      // Let the world know that we're using touch events and we should
      // not handle any presses from mouse events.
      this._ignoreMouseEvents = true;

      touchstartCount = this.touchstartCounts.get(evt.target) || 0;
      touchstartCount++;
      this.touchstartCounts.set(evt.target, touchstartCount);

      // Add touchmove and touchend listeners directly to the element so that
      // we will always hear these events, even if the element is removed from
      // the DOM and thus no longer the grandchild of the container.
      // This can happen when the keyboard switches cases, as well as when we
      // show the alternate characters menu for a key.
      evt.target.addEventListener('touchmove', this);
      evt.target.addEventListener('touchend', this);
      evt.target.addEventListener('touchcancel', this);

      for (i = 0; i < evt.changedTouches.length; i++) {
        touch = evt.changedTouches[i];
        touchId = touch.identifier;
        el = touch.target;

        this._handleNewPress(el, touch, touchId);
      }
      break;

    case 'touchmove':
      for (i = 0; i < evt.changedTouches.length; i++) {
        touch = evt.changedTouches[i];
        touchId = touch.identifier;

        if (!this._distanceReachesLimit(touchId, touch)) {
          continue;
        }

        el = document.elementFromPoint(touch.clientX, touch.clientY);

        this._handleChangedPress(el, touch, touchId);
      }
      break;

    case 'touchend': /* fall through */
    case 'touchcancel':
      touchstartCount = this.touchstartCounts.get(evt.target);
      touchstartCount--;
      if (touchstartCount) {
        this.touchstartCounts.set(evt.target, touchstartCount);
      } else {
        // Since this is the last event, remove event listeners here.
        evt.target.removeEventListener('touchmove', this);
        evt.target.removeEventListener('touchend', this);
        evt.target.removeEventListener('touchcancel', this);

        this.touchstartCounts.delete(evt.target);
      }

      // Quietly escape if we are already stopped.
      if (!this._started) {
        return;
      }

      for (i = 0; i < evt.changedTouches.length; i++) {
        touch = evt.changedTouches[i];
        touchId = touch.identifier;

        el = document.elementFromPoint(touch.clientX, touch.clientY);
        this._handleFinishPress(el, touch, touchId);
      }
      break;

    case 'mousedown':
      // Prevent loosing focus to the currently focused app
      // Otherwise, right after mousedown event,
      // the app will receive a focus event.
      //
      // This is only needed if we are inproc.
      evt.preventDefault();

      if (this._ignoreMouseEvents) {
        return;
      }

      // Also start monitoring mousemove and mouseup events
      // on entire container.
      this._container.addEventListener('mousemove', this);
      this._container.addEventListener('mouseup', this);
      this._container.addEventListener('mouseleave', this);
      this._handleNewPress(evt.target, evt, '_mouse');
      break;

    case 'mousemove':
      if (!this._distanceReachesLimit('_mouse', evt)) {
        return;
      }

      this._handleChangedPress(evt.target, evt, '_mouse');
      break;

    case 'mouseup': /* fall through */
    case 'mouseleave':
      // Stop monitoring so there won't be mouse event sequences involving
      // cursor moving out of/into the keyboard frame.
      this._container.removeEventListener('mousemove', this);
      this._container.removeEventListener('mouseup', this);
      this._container.removeEventListener('mouseleave', this);

      this._handleFinishPress(evt.target, evt, '_mouse');
      break;
  }
};

UserPressManager.prototype._handleNewPress = function(el, coords, id) {
  this.app.console.info('UserPressManager._handleNewPress()');
  var press =
    new UserPress(this.app.layoutRenderingManager.getTargetObject(el),
                  coords);
  this.presses.set(id, press);

  if (typeof this.onpressstart === 'function') {
    this.onpressstart(press, id);
  }
};

UserPressManager.prototype._handleChangedPress = function(el, coords, id) {
  this.app.console.info('UserPressManager._handleChangedPress()');
  var press = this.presses.get(id);
  press.target = this.app.layoutRenderingManager.getTargetObject(el);
  press.updateCoords(coords, true);

  if (typeof this.onpressmove === 'function') {
    this.onpressmove(press, id);
  }
};

UserPressManager.prototype._handleFinishPress = function(el, coords, id) {
  this.app.console.info('UserPressManager._handleFinishPress()');
  var press = this.presses.get(id);
  press.target = this.app.layoutRenderingManager.getTargetObject(el);
  press.updateCoords(coords,
    press.moved || this._distanceReachesLimit(id, coords));

  if (typeof this.onpressend === 'function') {
    this.onpressend(press, id);
  }

  this.presses.delete(id);
};

UserPressManager.prototype._distanceReachesLimit = function(id, newCoord) {
  var press = this.presses.get(id);

  var dx = press.clientX - newCoord.clientX;
  var dy = press.clientY - newCoord.clientY;
  var limit = this.MOVE_LIMIT;

  return (dx >= limit || dx <= -limit || dy >= limit || dy <= -limit);
};

exports.UserPress = UserPress;
exports.UserPressManager = UserPressManager;

})(window);
