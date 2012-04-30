/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var LockScreen = {
  get overlay() {
    delete this.overlay;
    return this.overlay = document.getElementById('lockscreen');
  },

  locked: true,

  init: function lockscreen_init() {
    var events = ['touchstart', 'touchmove', 'touchend', 'keydown', 'keyup'];
    AddEventHandlers(LockScreen.overlay, this, events);
    this.update();
  },

  update: function lockscreen_update() {
    if (localStorage['lockscreen'] == 'false') {
      this.unlock(true);
      return;
    }

    this.lock(true);
  },

  lock: function lockscreen_lock(instant) {
    var style = this.overlay.style;

    if (this.locked) {
      if (instant) {
        style.MozTransition = style.MozTransform = '';
      } else {
        style.MozTransition = '-moz-transform 0.2s linear';
      }
      style.MozTransform = 'translateY(0)';
      return;
    }

    this.locked = true;
    if (instant) {
      style.MozTransition = style.MozTransform = '';
    } else {
      style.MozTransition = '-moz-transform 0.2s linear';
      style.MozTransform = 'translateY(0)';
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('locked', true, true, null);
    window.dispatchEvent(evt);
  },

  // Unlock the lockscreen, doing an animation for the specified time.
  // If no time is specified use a default of 0.2 seconds.
  // For backward compatibility, you can pass true as the first argument
  // for a time of 0.
  unlock: function lockscreen_unlock(time) {
    var style = this.overlay.style;
    var wasAlreadyUnlocked = !this.locked;

    if (time == undefined)
      time = 0.2;
    else if (time === true)
      time = 0;

    this.locked = false;
    if (time === 0)
      style.MozTransition = style.MozTransform = '';
    else
      style.MozTransition = '-moz-transform ' + time + 's linear';
    style.MozTransform = 'translateY(-100%)';

    if (!wasAlreadyUnlocked) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('unlocked', true, true, null);
      window.dispatchEvent(evt);
    }
  },

  onTouchStart: function lockscreen_touchStart(e) {
    this.startY = this.lastY = e.pageY;
    this.lastTime = e.timeStamp;
    this.velocity = 0;
    this.moving = true;
  },

  onTouchMove: function lockscreen_touchMove(e) {
    if (this.moving) {
      this.velocity = (this.lastY - e.pageY) / (e.timeStamp - this.lastTime);
      this.lastY = e.pageY;
      this.lastTime = e.timeStamp;
      var dy = Math.max(0, this.startY - e.pageY);
      var style = this.overlay.style;
      style.MozTransition = '';
      style.MozTransform = 'translateY(' + (-dy) + 'px)';
    }
  },

  // Tune these parameters to make the lockscreen unlock feel right
  FRICTION: 0.01,           // pixels/ms/ms
  UNLOCK_THRESHOLD: 0.25,    // fraction of screen height

  onTouchEnd: function lockscreen_touchend(e) {
    if (this.moving) {
      this.moving = false;

      // Physics:
      // An object moving with a velocity v against a frictional
      // deceleration a will travel a distance of 0.5*v*v/a before
      // coming to rest (I think).
      //
      // If the user's gesture plus the distance due to the gesture velocity
      // is more than the unlock threshold times screen height,
      // unlock the phone. Otherwise move the lockscreen back down again.
      //
      var dy = Math.max(0, this.startY - e.pageY);
      var distance = dy +
        0.5 * this.velocity * this.velocity / LockScreen.FRICTION;

      if (distance > window.innerHeight * LockScreen.UNLOCK_THRESHOLD) {
        // Perform the animation at the gesture velocity
        var distanceRemaining = window.innerHeight - dy;
        var timeRemaining = distanceRemaining / this.velocity / 1000;
        // But don't take longer than 1/2 second to complete it.
        timeRemaining = Math.min(timeRemaining, .5);
        this.unlock(timeRemaining);
      } else {
        this.lock();
      }
    }
  },

  handleEvent: function lockscreen_handleEvent(e) {
    switch (e.type) {
      case 'touchstart':
        this.onTouchStart(e.touches[0]);
        this.overlay.setCapture(false);
        break;

      case 'touchmove':
        this.onTouchMove(e.touches[0]);
        break;

      case 'touchend':
        this.onTouchEnd(e.changedTouches[0]);
        document.releaseCapture();
        break;

      case 'keydown':
        if (e.keyCode != e.DOM_VK_SLEEP || !navigator.mozPower.screenEnabled)
          return;

        this._timeout = window.setTimeout(function() {
          SleepMenu.show();
        }, 1500);
        break;

      case 'keyup':
        if (e.keyCode != e.DOM_VK_SLEEP || SleepMenu.visible)
          return;
        window.clearTimeout(this._timeout);

        if (navigator.mozPower.screenEnabled) {
          this.update();
          ScreenManager.turnScreenOff();
        } else {
          // XXX: screen could be turned off by idle service instead of us.
          // Update the lockscreen again when turning the screen on.
          // (home screen would still flash when USB is plugged in)
          this.update();
          ScreenManager.turnScreenOn();
        }

        e.preventDefault();
        e.stopPropagation();
        break;

      default:
        return;
    }
    e.preventDefault();
  }
};
