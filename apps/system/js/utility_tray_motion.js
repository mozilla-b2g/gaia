'use strict';
/* global Service */

(function(exports) {

/**
 * UtilityTrayMotion manages the scrolling and snapping behavior of the
 * UtilityTray.
 *
 * UtilityTrayMotion emits the following custom events from its root element:
 *
 * - "tray-motion-state", emitted when the element changes state.
 * - "tray-motion-footer-position", emitted when the tray moves in such a way
 *   that you might want to show or hide the fixed-position footer.
 *
 * The state of the utility tray motion (UtilityTrayMotion.state) will always
 * be one of "opening", "closing", "open", or "closed".
 *
 * Rather than manually intercepting touch events to provide momentum, we use
 * native scrolling to improve performance. A scrollable root div contains two
 * sections, one with the utility tray contents, and one transparent unclickable
 * area. When the tray is closed, only the invisible (dead area) fits on the
 * screen; when the tray is open, only the visible area fits onscreen. Hence
 * the screen is always overlaid with the utility tray, but the dead area
 * has "pointer-events: none". See the following layout diagram:
 *
 *
 *   +=====================================+
 *   | .tray          #utility-tray-motion |
 *   |   (scrollable)                      |
 *   | +-------------------------------------+
 *   | | .tray-content         #utility-tray |
 *   | |   (opaque, grabbable)               |
 *   | |                                     |
 *   | |=====================================|    <-.
 *   | | #tray-invisible-gripper             |      |
 *   | |   (transparent, grabbable)          |      |
 *   | |-------------------------------------|      | Visible Screen
 *   | | .tray-dead-area                     |      |   (in this diagram, the
 *   | |   (transparent, no touch events)    |      |    tray is fully closed.)
 *   | |                                     |      |
 *   | +-------------------------------------+    <-'
 *   +=====================================+
 *
 *
 * Note that we do _not_ use CSS scroll snapping here. As of July 2015, CSS
 * scroll snapping's velocity calculations do not include the element's current
 * scroll velocity when calculating fling velocity; this means that upon lifting
 * your finger, you would be unable to scroll the utility tray quickly. Instead,
 * we listen to scroll events, and based upon the current tray velocity and
 * position, we decide when to fling the tray ourselves.
 *
 * With this implementation, if you fling the tray really fast, we recognize
 * that the tray will make it to the final scroll position without assistance;
 * this triggers the platform bounce effects. If you fling the tray too slowly,
 * we'll recognize that the tray will get stuck in the middle of the screen,
 * so we push it the rest of the way with `scrollTo()`.
 *
 *------------------------------------------------------------------------------
 * TRACKING SCROLL POSITION
 *
 * Because we now support asynchronous scrolling (APZ), we can never predict
 * the element's exact scroll position at any given time. We can monitor touch
 * and scroll events, but `scrollTop` is always an out-of-date snapshot.
 * We cannot cancel scroll events synchronously, nor can we rely on touch events
 * to calculate the element's curent scroll offset, because the platform applies
 * momentum itself.
 *
 * Fortunately, we can compensate for this lack of control by tracking the
 * element's scrollTop whenever a touch or scroll event occurs. In this way,
 * we can update the tray state ('open', 'closed', 'opening', 'closing') in
 * response to changes in scroll position. When we need to move the tray
 * manually, we use `scrollTo({ behavior: 'smooth'})`.
 *
 * @param {Element} el
 */
function UtilityTrayMotion(el) {
  this.el = el;

  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((type) => {
    this.el.addEventListener(type, this._ontouch.bind(this));
  });
  this.el.addEventListener('scroll', this._onscroll.bind(this));

  // Since scroll events are unpredictable, we can't reliably calculate scroll
  // velocity without averaging over a few samples. This value is primarily
  // used to calculate whether or not the tray will close or open fully without
  // further assistance; it is cleared when the tray changes direction to
  // ensure quick velocity calculations in response to direction changes.
  const VELOCITY_WINDOW_MS = 200;
  this._velocityAverager = new TimeWindowedAverager(VELOCITY_WINDOW_MS);

  // It can take a moment for scroll events to catch up with touch gestures.
  // Don't force the tray to open or close until some time has passed.
  this._lastTouchTime = 0;

  this.isTouching = false;
  this.currentTouch = null; // used by UtilityTray for event forwarding


  // Begin closed. Note that scrollTop may be the inverse of what you'd expect;
  // a scrollTop of zero indicates the tray is open; a scrollTop of scrollTopMax
  // indicates the tray is closed.
  this._setState('closing');
  this.position = this.el.scrollTop = this.el.scrollTopMax;

  // We may need to reposition ourselves when the visible buttons change.
  // (CSS properly adjusts width and height, but the tray may be stuck in the
  // middle of the screen.)
  window.addEventListener('software-button-enabled',
    this.requestFuturePosition.bind(this));
  window.addEventListener('software-button-disabled',
    this.requestFuturePosition.bind(this));


  // When the window resizes (i.e. the device's orientation changes), we need
  // to immediately update the dimensions of our element; otherwise the tray
  // may appear stuck in the middle of the screen after the resize.
  window.addEventListener('resize', () => {
    this.markPosition('resize');
  });

  // Begin completely closed.
  this.markPosition('resize');
  this.close(true);
}

// We don't know that the element's scroll position has completely stopped until
// we see the scroll position not moving after a bit of time. Whenever we think
// the scroll position is changing, we set a timer to check the position again
// in the near future. See <https://bugzil.la/1172171> for a scrollend event
// proposal which could alleviate this issue.
//
// This value must be large enough that we expect to see a 'scroll' event
// in response to a .scrollTo() call within this amount of time, otherwise
// we will force the tray to close/open immediately.
const FUTURE_POSITION_DELAY_MS = 300;

UtilityTrayMotion.prototype = {
  /**
   * @member {string} state
   *   "opening", "closing", "open", or "closed"
   */
  get state() {
    return this._state;
  },

  /**
   * Update the state, setting the state as a class on this.el, and dispatching
   * the "tray-motion-state" event to notify observers.
   */
  _setState(newState) {
    var oldState = this._state;
    this._state = newState;
    if (oldState !== newState) {
      this.el.classList.remove(oldState);
      this.el.classList.add(newState);
      this.el.dispatchEvent(new CustomEvent('tray-motion-state', {
        detail: { previousValue: oldState, value: newState }
      }));
    }
  },

  /**
   * The velocity of the current scroll, in pixels per millisecond. Typical
   * values are mostly between -2 and 2, with larger values for faster flings.
   * Avoid relying on this number if possible. We take an average value here,
   * because the instantaneous scroll velocity may be unreliable, due to the
   * unpredictable timing of scroll events.
   */
  get velocity() {
    return this._velocityAverager.currentAverage;
  },

  /**
   * @member {number} percentVisible
   *   A value between 0 (fully closed) and 1 (fully open), inclusive.
   */
  get percentVisible() {
    return 1 - (this.position / this.maxPosition);
  },

  /**
   * The desired scroll offset (i.e. between 0 and this.el.scrollTopMax),
   * i.e. where the tray should rest if it is not currently being touched.
   * Remember that when the position is zero, the tray is visible; when position
   * is equal to scrollTopMax, the tray is hidden.
   *
   * If the velocity is zero, just continue to follow the orders of this.state.
   */
  get desiredPosition() {
    var velocity = this.velocity;
    if (velocity < 0) {
      return 0;
    } else if (velocity > 0) {
      return this.maxPosition;
    } else if (this.state === 'closing') {
      return this.maxPosition;
    } else if (this.state === 'opening') {
      return 0;
    } else {
      return this.position;
    }
  },

  /**
   * Schedule a near-future position check, usually because we just saw a touch
   * or scroll event, and need to revisit the scroll state momentarily to ensure
   * we respond to the touch/scroll events appropriately.
   */
  requestFuturePosition() {
    this.cancelRequestFuturePosition();
    this._rfp = setTimeout(() => {
      this._rfp = null;
      this.markPosition('timeout');
    }, FUTURE_POSITION_DELAY_MS);
  },

  cancelRequestFuturePosition() {
    if (this._rfp) {
      clearTimeout(this._rfp);
      this._rfp = null;
    }
  },

  isVelocityFastEnoughToFinishTheScrollWithoutHelp() {
    // Calculate how far we think the tray will slide, given the current
    // estimated velocity, accounting for some friction.

    // The system friction is defined as a pref here:
    // <http://mxr.mozilla.org/mozilla-central/source/gfx/thebes/gfxPrefs.h#159>
    // If the system friction changes, we should ideally update this value, but
    // we likely wouldn't see any ill effects. We're guessing at velocity
    // already, which makes this only an estimate at best.
    var friction = 0.002;
    var pixelsLeftToTraverse = Math.abs(this.desiredPosition - this.position);

    // This formula (the integral of the deceleration curve) provides the
    // estimated sliding distance, as described in platform here:
    // <http://mxr.mozilla.org/mozilla-central/source/gfx/layers/apz/src/AsyncPanZoomController.cpp#2164>
    var slidingDistance =
      Math.abs(-this.velocity / Math.log(1.0 - friction)) | 0;

    return pixelsLeftToTraverse < slidingDistance;
  },

  /**
   * Note the current scroll position, whether triggered by a touch, scroll,
   * or timeout. Because we leave the core scroll behavior up to the platform,
   * we can handle all of these events similarly: calculate our current
   * position and velocity, update state, and decide if we need to `scrollTo()`
   * to push the tray into its final position.
   *
   * @param {string} source
   *   The reason we're marking this position change.
   */
  markPosition(source) {
    this.requestFuturePosition();

    var previousVelocity = this.velocity;
    var previousPosition = this.position;
    var previousMaxPosition = this.maxPosition;
    this.position = this.el.scrollTop;
    this.maxPosition = this.el.scrollTopMax;
    this._velocityAverager.addPoint(Date.now(), this.position);

    if ((previousVelocity > 0 && this.velocity < 0) ||
        (previousVelocity < 0 && this.velocity > 0)) {
      this._lastTouchTime = Date.now();
    }

    // Check for window resizes and layout changes:
    if (previousMaxPosition !== this.maxPosition) {
      if (this.state === 'closed' || this.state === 'closing') {
        this.close(true);
      } else {
        this.open(true);
      }
    }

    var notRecentlyTouched =
      (this._lastTouchTime + FUTURE_POSITION_DELAY_MS < Date.now());

    // Are we stuck or moving really slow?
    if ((source === 'timeout' ||
         (source === 'scroll' &&
          !this.isVelocityFastEnoughToFinishTheScrollWithoutHelp())) &&
        notRecentlyTouched &&
        !this.isTouching) {
      if (this.desiredPosition !== this.position) {
        if (this.state === 'opening') {
          this.open();
        } else {
          this.close();
        }
      }
      else {
        this._setState(this.state === 'opening' || this.state === 'open' ?
          'open' : 'closed');
        this.cancelRequestFuturePosition();
      }
    } else {
      if (this.velocity < 0) {
        this._setState('opening');
      } else if (this.velocity > 0) {
        this._setState('closing');
      }
    }

    // For aesthetic reasons, if the tray is almost fully open (as position
    // approaches zero), start dispatching motion events to allow UtilityTray
    // to show or hide the fixed-position footer. Without this event,
    // the footer must wait until this.state === 'open', which takes a while
    // due to overscroll effects.
    var CLOSE_TO_BOTTOM_PX = 50 * window.devicePixelRatio;
    if (previousPosition < CLOSE_TO_BOTTOM_PX ||
        this.position < CLOSE_TO_BOTTOM_PX) {
      this.el.dispatchEvent(
        new CustomEvent('tray-motion-footer-position'));
    }
  },

  /**
   * We don't know how long it will take for the system to respond to our
   * scrollTo 'smooth' request. The FUTURE_POSITION_DELAY_MS timeout provides a
   * good estimate, but in the case of a very unresponsive system, we don't want
   * to fall into a loop of:
   *
   * 1. Requesting `scrollTo`
   * 2. Timeout fires but element hasn't scrolled yet; call scrollTo again
   *
   * The right action, if we aren't seeing action from 'behavior: smooth',
   * is to just fall back on an instant change, in which case we'll detect
   * with certainty that the element has finished scrolling to the destination.
   */
  reliablyScrollTo(top, immediately) {
    var prevOffset = this._previouslyRequestedOffset;
    this._previouslyRequestedOffset = top;
    if (prevOffset === top) {
      immediately = true;
    }

    // XXX: Some sort of rounding error causes 1px of the tray to remain visible
    // in certain configurations, but this fixes it:
    if (top === this.maxPosition) {
      top++;
    }

    this.el.scrollTo({
      left: 0,
      top: top,
      behavior: immediately ? 'auto' : 'smooth'
    });
  },

  /**
   * Open the tray if not already opened.
   *
   * @param {boolean} immediately
   */
  open(immediately) {
    this._setState('opening');
    this._velocityAverager.reset();
    this.markPosition('force');
    this.reliablyScrollTo(0, immediately);
  },

  /**
   * Close the tray if not already closed.
   *
   * @param {boolean} immediately
   */
  close(immediately) {
    this._setState('closing');
    this._velocityAverager.reset();
    this.markPosition('force');
    this.reliablyScrollTo(this.maxPosition, immediately);
  },

  _ontouch(evt) {
    if (Service.query('locked') || Service.query('isFtuRunning')) {
      evt.preventDefault();
      return;
    }

    this.isTouching = (evt.touches.length > 0);
    this.currentTouch = evt.touches && evt.touches[0];

    if (evt.type === 'touchstart') {
      this._velocityAverager.reset();
    }

    if (this.isTouching) {
      this._lastTouchTime = Date.now();
    }

    requestAnimationFrame(this.markPosition.bind(this, evt.type));
  },

  _onscroll(evt) {
    this._previouslyRequestedOffset = null;
    // We only need to track scroll events if the user isn't touching; otherwise
    // we would see a 'scroll' event corresponding with every 'touchmove' event.
    if (!this.isTouching) {
      requestAnimationFrame(this.markPosition.bind(this, 'scroll'));
    }
  }

};


/**
 * Computes a windowed average, excluding points a certain amount of time in
 * the past. Usage:
 *
 *   var averager = new TimeWindowedAverager(400);
 *   averager.addPoint(Date.now() - 100, 0);
 *   averager.addPoint(Date.now(), 50);
 *   console.log(averager.currentAverage); // => 0.5
 *
 * @param {int} maxTimeDelta
 *   The maximum number of milliseconds to include in the average. Values older
 *   than (now - maxTimeDelta) are discarded.
 */
function TimeWindowedAverager(maxTimeDelta) {
  /**
   * The current average value of all points.
   */
  this.currentAverage = 0;

  this._maxTimeDelta = maxTimeDelta;
  this._points = [];
}

TimeWindowedAverager.prototype = {
  /**
   * Reset the current window (leading to an instantaneous average of zero).
   */
  reset() {
    this._points.length = 0;
  },

  /**
   * Add a point (e.g. a velocity) at the given time to the averaging
   * calculation. (If the point is too old, it will be ignored). Old points
   * will be removed.
   */
  addPoint(time, value) {
    var now = Date.now();
    this._points.push({ time, value });
    // Discard points that are too old.
    while (this._points[0].time < now - this._maxTimeDelta) {
      this._points.shift();
    }
    // If we have enough points, compute a windowed average (distance / time).
    if (this._points.length < 2) {
      this.currentAverage = 0;
    } else {
      var totalDistance = 0;
      var totalTime = 0;
      for (var i = 1, len = this._points.length; i < len; i++) {
        var a = this._points[i - 1], b = this._points[i];
        totalDistance += b.value - a.value;
        totalTime += b.time - a.time;
      }
      this.currentAverage = totalDistance / totalTime;
    }
  }
};



exports.UtilityTrayMotion = UtilityTrayMotion;

})(window); // end function wrapper
