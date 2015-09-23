/* globals TaskManagerUtils, Sanitizer */
'use strict';

(function(exports) {

/**
 * A `Card` represents an individual app in the Task Manager.
 *
 * The `Card` class itself is inert; because TaskManager only updates its
 * display on launch, Card doesn't need to update its state in real time.
 * Card's swipe-up-to-delete behavior is handled by `SwipeToKillMotion`.
 */
function Card(app, disableScreenshots) {
  var el = document.createElement('li');
  this.app = app;
  this.element = el;

  this.title = (app.isBrowser() && app.title) ? app.title : app.name;
  this.subTitle = TaskManagerUtils.getDisplayUrlForApp(app);
  this.titleId = 'card-title-' + app.instanceID;

  el.classList.add('card');
  el.classList.toggle('private', !!app.isPrivate);
  el.classList.toggle('show-subtitle', !!this.subTitle);
  el.classList.toggle('browser', !!app.isBrowser());

  el.dataset.origin = app.origin; // for ease of testing
  el.dataset.ssl = app.getSSLState() || ''; // indiciate security when available

  el.setAttribute('aria-labelledby', this.titleId);
  el.setAttribute('role', 'presentation'); // The card is not semantic.

  el.innerHTML = this.getHtmlTemplate();

  var topMostWindow = app.getTopMostWindow();
  if (topMostWindow && topMostWindow.CLASS_NAME === 'TrustedWindow') {
    this.title = topMostWindow.name || '';
    el.classList.add('trustedui');
  } else if (!app.killable()) {
    el.querySelector('.close-button').style.visibility = 'hidden';
  }

  const ICON_SIZE = 40;
  TaskManagerUtils.loadAppIcon(app, el.querySelector('.appIcon'), ICON_SIZE);

  if (!disableScreenshots) {
    TaskManagerUtils.loadAppScreenshot(
      app, el.querySelector('.screenshotView'));
  } else {
    el.classList.add('appIconPreview');

    var iconId = 'card-appIcon-' + app.instanceID;
    el.querySelector('.appIcon').id = iconId;
    el.querySelector('.appIconView').style.backgroundImage =
      `-moz-element(#${iconId})`;
  }

  this.swipeAction = new SwipeToKillMotion(this.element, {
    setTranslateY: (y) => {
      this.translate({ y: y });
    }
  });
}

exports.Card = Card;

Card.prototype = {

  /**
   * To ensure animations run smoothly, cards are positioned exclusively with
   * CSS transforms. Unfortunately, since translateX and translateY must be set
   * simultaneously, we need a little additional boilerplate here: TaskManager
   * itself positions the cards on the x-axis, but each card's SwipeToKillMotion
   * maintains the y-axis positioning.
   *
   * NOTE: props.x and props.y must include units, e.g. 'px'.
   */
  translate(props) {
    if ('x' in props) {
      this._translateX = props.x;
    }
    if ('y' in props) {
      this._translateY = props.y;
    }
    this.element.style.transform =
      `translate(${this._translateX}, ${this._translateY})`;
  },

  _translateX: '0px',
  _translateY: '0px',

  getHtmlTemplate() {
    return Sanitizer.escapeHTML `
    <div class="titles">
      <h1 id="${this.titleId}" dir="auto" class="title">${this.title}</h1>
      <p class="subtitle">
        <span class="subtitle-url">${this.subTitle}</span>
      </p>
    </div>

    <div class="screenshotView bb-button" data-l10n-id="openCard" role="link">
    </div>
    <div class="privateOverlay"></div>
    <div class="appIconView"></div>

    <footer class="card-tray">
      <button class="appIcon pending" data-l10n-id="openCard"
              data-button-action="select" aria-hidden="true"></button>
     <menu class="buttonbar">
        <button class="close-button bb-button" data-l10n-id="closeCard"
                data-button-action="close" role="button">
        </button>
        <button class="favorite-button bb-button"
                data-button-action="favorite" role="button"
                style="visibility: hidden"></button>
      </menu>
    </footer>
    `;
  },

};


/**
 * Track vertical swipes across this element. If the element is flung with
 * enough upward velocity, make the element fly offscreen and emit an event
 * that indicates that the app should be killed.
 *
 * Extra care is taken here to allow a potential swipe-up to be interrupted.
 * For instance, if the parent container is scrolling horizontally, we must
 * prohibit this element from being flung (i.e. poor-man's axis lock).
 *
 * Emits:
 *   - "card-will-drag" when the element is grabbed and wants to be flung
 *     upward; this event is cancelable.
 *   - "card-dropped" with detail: { willKill: Boolean }
 *
 * @param {Element} el
 *   The element (i.e. card.element) to be made draggable.
 * @param {function} opts.setTranslateY
 *   This class will call setTranslateY whenever the Y-translation changes.
 *   See `Card.prototype.translate` for rationale on this unfortunate grossness.
 */
function SwipeToKillMotion(el, { setTranslateY }) {
  el.addEventListener('touchstart', this);
  el.addEventListener('touchmove', this);
  el.addEventListener('touchend', this);
  el.addEventListener('click', this);
  this.setTranslateY = setTranslateY;

  this.el = el;
}

exports.SwipeToKillMotion = SwipeToKillMotion;

// Anything less than MIN_DISTANCE will be ignored for swiping purposes.
const MIN_DISTANCE = 4;
// Track MAX_DRAG_DELTA_COUNT latest drag events, so that we can compute the
// current fling velocity.
const MAX_DRAG_DELTA_COUNT = 3;
// Even if the user flings upward, if they only fling a tiny amound, ignore it.
// Note that velocity is more important than swipe distance.
const MIN_SWIPE_DISTANCE = 10;

SwipeToKillMotion.prototype = {

  handleEvent(evt) {
    if (/touch/.test(evt.type)) {
      return this.handleTouchEvent(evt);
    } else if (evt.type === 'click') {
      // Ignore clicks if the element is already being dragged upward.
      if (this.activelyDragging) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    }
  },

  beginSwipe(evt) {
    this.firstTouch = evt.targetTouches[0];
    this.firstTouchTimestamp = Date.now();
    this.dragDeltas = [];
    this.activelyDragging = false;
    this.prohibitDragging = false;
    this.el.style.transition = 'none';
  },

  endSwipe(evt) {
    this.el.style.removeProperty('transition');
    // If we haven't moved far enough to cause a drag, there's nothing to do.
    if (!this.activelyDragging) {
      return;
    }

    var willKill = false;

    if (this.dragDeltas.length > 2) {
      var dy1 = this.dragDeltas[0];
      var dy2 = this.dragDeltas[this.dragDeltas.length - 1];
      // If the newer delta is substantially more negative than the older one,
      // it's time to kill the card.
      if (dy2 < dy1 - MIN_SWIPE_DISTANCE) {
        willKill = true;
      }
    }

    this.activelyDragging = false;

    this.el.dispatchEvent(new CustomEvent('card-dropped', {
      bubbles: true,
      detail: { willKill }
    }));

    if (willKill) {
      this.setTranslateY('-200%');
    } else {
      this.setTranslateY('0px');
    }
  },

  dragSwipe(evt) {
    var currentTouch = evt.targetTouches[0];
    var dy = (currentTouch.clientY - this.firstTouch.clientY);
    var dx = (currentTouch.clientX - this.firstTouch.clientX);

    // If they're swiping downward, clamp the card to the bottom.
    if (dy > 0) {
      dy = 0;
    }

    // If we're dragging, track the most recent few swipes so that we can
    // calculate a rough estimate of velocity, which is important in deciding
    // if we should swipe up to kill the app or return the app to y=0.
    if (this.activelyDragging) {
      this.dragDeltas.push(dy);
      if (this.dragDeltas.length > MAX_DRAG_DELTA_COUNT) {
        this.dragDeltas.shift();
      }
    }
    // If we're not actively dragging yet...
    else {
      // If we swiped along the X axis, scroll sideways instead.
      if (Math.abs(dx) > MIN_DISTANCE) {
        dy = 0;
        this.prohibitDragging = true;
      }
      // If we swiped along the Y axis, check to see if the scrollable container
      // thinks we should be allowed to swipe up right now. (If the container
      // has been scrolling recently, it'll tell us to hold off by canceling
      // the "card-will-drag" event).
      else if (Math.abs(dy) > MIN_DISTANCE) {
        if (this.el.dispatchEvent(new CustomEvent('card-will-drag', {
            bubbles: true,
            cancelable: true,
            detail: { firstTouchTimestamp: this.firstTouchTimestamp }}))) {
          this.activelyDragging = true;
        }
        // If the container told us we can't swipe, give up for now.
        else {
          dy = 0;
          this.prohibitDragging = true;
        }
      }
      // If we aren't sure that we should be swiping, clamp 'dy' to zero to
      // avoid looking janky if we decide to scroll.
      else if (Math.abs(dy) < MIN_DISTANCE) {
        dy = 0;
      }
    }

    this.setTranslateY(dy + 'px');
  },

  handleTouchEvent(evt) {
    evt.stopPropagation();

    // 'touchstart' and 'touchend' events aren't entirely relevant here;
    // we're touching the element if and only if evt.targetTouches.length > 0.
    var wasTouching = this.isTouching;
    this.isTouching = evt.targetTouches.length > 0;

    if (!wasTouching && this.isTouching) {
      this.beginSwipe(evt);
    } else if (wasTouching && !this.isTouching) {
      this.endSwipe(evt);
    }

    if (this.isTouching && !this.prohibitDragging) {
      this.dragSwipe(evt);
    }
  }
};

})(window);
