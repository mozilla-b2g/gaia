/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This is one of possible LockScreen unlockers, and is the default unlocker
 * would be used in Gaia. It's possible to follow the strategy pattern described
 * in the LockSreen to make more unlockers.
 */

(function(exports) {

  /**
   * We should care about the need of testing,
   * and make all stateful objects become instance-able.
   *
   * @param {LockScreen.intentionRouter} |ir|
   * @constructor
   */
  var LockScreenSlide = function(ir) {
    this.initialize(ir);
  };

  var LockScreenSlidePrototype = {
    canvas: null,
    arrows: {
      left: null, right: null,
      // Left and right drawing origin.
      ldraw: {x: null, y: null},
      rdraw: {x: null, y: null}
    },

    slides: {
      left: null,
      right: null
    },

    areas: {
      camera: null,
      unlock: null
    },

    // The handle area can touch by the user.
    area: null,
    overlay: null,

    width: 0, // We need dynamic length here.
    height: 80,
    center: {x: null, y: null},

    handle: {
      // Whether we need to auto extend the handle.
      autoExpand: {
        accFactorOriginal: 1.0,
        accFactor: 1.0,     // Accelerate sliding if user's finger crossed.
        accFactorMax: 1.3,
        accFactorInterval: 0.02,
        sentinelOffset: 40,  // How many pixels before reaching end.
        sentinelWidth: 0   // Max width - offset
      },
      bounceBackTime: 200,  // ms
      radius: 28, // The radius of the handle in pixel.
      lineWidth: 1.6,
      maxWidth: 0,  // We need dynamic length here.
      // If it slide across the boundary to color it.
      touchedColor: '0, 170, 204', // RGB
      // The intermediate color of touched color.
      touchedColorStop: '178, 229, 239'
    },

    states: {
      // Some elements can only be initialized after initialization...
      delayInitialized: false,
      initialized: false,
      sliding: false,
      slideReachEnd: false,
      slidingColorful: false,   // Start to color the handle.
      slidingColorGradientEnd: false, // Full color the handle.

      // Most of them need to be initialized later.
      touch: {
        direction: '',
        touched: false,
        initX: -1,
        pageX: -1,
        pageY: -1,
        tx: -1,
        prevX: -1,
        deltaX: 0  // Diff from prevX and current X
      }
    },

    // How we communicate with the LockScreen.
    intentionRouter: null
  };

  /**
   * Initialize this unlocker strategy.
   *
   * @param {IntentionRouter} |ir| see LockScreen's intentionRouter.
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype.initialize =
    function(ir) {
      this.intentionRouter = ir;
      this._initializeCanvas();
      ir.unlockerInitialize();
      this.states.initialized = true;
    };

  /**
   * The dispatcher. Unlocker would manager all its DOMs individually.
   *
   * @param {event} |evt|
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype.handleEvent =
    function(evt) {
      switch (evt.type) {
        case 'screenchange':
          // Don't lock if screen is turned off by promixity sensor.
          if (evt.detail.screenOffBy == 'proximity') {
            break;
          }

          // If the screen got blackout, we should restore the slide.
          this._clearCanvas();
          this._resetArrows();
          this._resetHandle();
          break;
        case 'click':
            if (evt.target === this.areas.unlock) {
              this.intentionRouter.activateUnlock();
            } else if (evt.target === this.areas.camera) {
              this.intentionRouter.activateCamera();
            }
            evt.preventDefault();
          break;

        case 'touchstart':
            if (evt.target === this.areas.unlock) {
              this.intentionRouter.activateUnlock();
            } else if (evt.target === this.areas.camera) {
              this.intentionRouter.activateCamera();
            } else if (evt.target === this.area) {
              this._onSlideBegin(this._dpx(evt.touches[0].pageX));
            }
            evt.preventDefault();
            window.addEventListener('touchend', this);
            window.addEventListener('touchmove', this);
          break;

        case 'touchmove':
          // Records touch states.
          this._onTouchMove(
            this._dpx(evt.touches[0].pageX),
            this._dpx(evt.touches[0].pageY)
          );
          if (this.states.sliding) {
            this._onSliding(this._dpx(evt.touches[0].pageX));
          }
          break;

        case 'touchend':
          window.removeEventListener('touchmove', this);
          window.removeEventListener('touchend', this);

          if (this.states.sliding) {
            this._onSlideEnd();
          }

          this.overlay.classList.remove('touched');
          break;
      }
    };

  /**
   * Initialize the canvas.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._initializeCanvas =
    function lss_initializeCanvas() {

      this.overlay = document.getElementById('lockscreen');
      this.area = document.getElementById('lockscreen-area');
      this.canvas = document.getElementById('lockscreen-canvas');
      this.areas.camera = document.getElementById('lockscreen-area-camera');
      this.areas.unlock = document.getElementById('lockscreen-area-unlock');

      this.area.addEventListener('touchstart', this);
      this.areas.camera.addEventListener('click', this);
      this.areas.unlock.addEventListener('click', this);

      var center = this.center;
      this.arrows.left = new Image();
      this.arrows.right = new Image();
      var larrow = this.arrows.left;
      var rarrow = this.arrows.right;
      larrow.src = '/style/lockscreen/images/larrow.png';
      rarrow.src = '/style/lockscreen/images/rarrow.png';

      // XXX: Bet it would be OK while user start to drag the slide.
      larrow.onload = (function() {
        this.arrows.ldraw.x =
              center.x - (this.arrows.left.width << 1);
        this.arrows.ldraw.y =
              center.y - (this.arrows.left.height >> 1);
        var ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.arrows.left,
            this.arrows.ldraw.x,
            this.arrows.ldraw.y);
      }).bind(this);
      rarrow.onload = (function() {
        this.arrows.rdraw.x =
              center.x + (this.arrows.right.width);
        this.arrows.rdraw.y =
              center.y - (this.arrows.right.height >> 1);
        var ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.arrows.right,
            this.arrows.rdraw.x,
            this.arrows.rdraw.y);
      }).bind(this);

      this.width = this._dpx(window.innerWidth);
      this.height = this._dpx(80);

      this.canvas.width = this.width;
      this.canvas.height = this.height;

      // Shrink the canvas back to keep the density.
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = 80 + 'px';

      this.center.x =
        this.canvas.offsetLeft + this.canvas.width >> 1;
      this.center.y =
        this.canvas.offsetHeight + this.canvas.height >> 1;

      this.handle.radius =
        this._dpx(this.handle.radius);

      this.handle.lineWidth =
        this._dpx(this.handle.lineWidth);

      this.handle.autoExpand.sentinelOffset =
        this._dpx(this.handle.autoExpand.sentinelOffset);

      this.canvas.getContext('2d').save();

      // Need to move the context toward right, to compensate the circle which
      // would be draw at the center, and make it align too left.
      this.canvas.getContext('2d', this.handle.radius << 1, 0);

      // Draw the handle.
      this._resetHandle();

      // We don't reset the arrows because it need to be draw while image
      // got loaded, which is a asynchronous process.
    };

  /**
   * Finalize the canvas: restore its default states.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._finalizeCanvas =
    function lss_finalizeCanvas() {
      this.states.slidingColorful = false;
      this.states.slidingColorGradientEnd = false,
      this._clearCanvas();
    };

  /**
   * Records how long the user's finger dragged.
   *
   * @param {number} |tx| The absolute coordinate of the touching position.
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._onSliding =
    function lss_onSliding(tx) {
      var mtx = this._mapCoord(tx, 0)[0];
      var isLeft = tx - this.center.x < 0;
      this._clearCanvas();

      var expandSentinelR = this.center.x +
        this.handle.autoExpand.sentinelWidth;

      var expandSentinelL = this.center.x -
        this.handle.autoExpand.sentinelWidth;

      var center = this.center;
      var radius = this.handle.radius;
      var ctx = this.canvas.getContext('2d');

      if (tx > expandSentinelR || tx < expandSentinelL) {
          var slow = false;
          if (isLeft) {
            slow = this.states.touch.deltaX > 0;
          } else {
            slow = this.states.touch.deltaX < 0;
          }
          // TODO: XXX: Where we use the previous 'mtx' ?
          mtx = this._accelerateSlide(tx, tx < expandSentinelL, slow);
      } else {
        this.handle.autoExpand.accFactor =
          this.handle.autoExpand.accFactorOriginal;
      }

      // Slide must overlay on arrows.
      this._drawArrowsTo(mtx);
      this._drawSlideTo(mtx);
    };

/**
   * Start slide the handle of the lockscreen.
   * Effect: Will set touch and sliding flag in this.
   *
   * @param {tx} The absolute coordinate X of the touch position.
   * @this {LockScreen}
   */
  LockScreenSlidePrototype._onSlideBegin =
    function lss_onSlideBegin(tx) {
      var trackLength = this.areas.unlock.offsetLeft -
                        this.areas.camera.offsetLeft +
                        this.areas.unlock.clientWidth;

      // Offset and clientWidth would be window size.
      trackLength = this._dpx(trackLength);

      // Because the canvas would draw from the center to one point
      // on the circle, it would add dimeter long distance for one side.
      var maxWidth = (trackLength -
          (this.handle.radius << 1)) >> 1;

      // Left 1 pixel each side for the border.
      maxWidth -= 2;

      // Because if we initialize this value while init the lockscreen,
      // the offset would be zero.
      if (true !== this.states.delayInitialized) {

        this.handle.maxWidth = maxWidth;

        this.handle.autoExpand.sentinelWidth =
          maxWidth - this.handle.autoExpand.sentinelOffset;

        this.delayInitialized = true;
      }

      var canvasCenterX = this.canvas.clientWidth >> 1;
      var center = this.center;

      // To see if the finger touch on the area of the center circle.
      var boundaryR = center.x + this.handle.radius;
      var boundaryL = center.x - this.handle.radius;

      if (tx > boundaryR || tx < boundaryL) {
        return; // Do nothing.
      }

      this.states.touch.initX = tx;

      this.states.sliding = true;
      this._lightIcons();
    };

  /**
   * When user released the finger, bounce it back.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._onSlideEnd =
    function lss_onSlideEnd() {
      var isLeft = this.states.touch.pageX - this.center.x < 0;
      var bounceEnd = (function _bounceEnd() {
        this._clearCanvas();
        this._resetArrows();
        this._resetHandle();
      }).bind(this);

      if (false === this.states.slideReachEnd) {
        this._bounceBack(this.states.touch.pageX, bounceEnd);
      } else {
        var intention = isLeft ? this.intentionRouter.activateCamera :
          this.intentionRouter.activateUnlock;
        intention();

        // Restore it only after screen changed.
        var appLaunchDelay = 400;
        setTimeout(bounceEnd, appLaunchDelay);
      }

      this._darkIcons();
    };

  /**
   * When touchmove event on, records the information.
   *
   * @param {number} |pageX| The absolute coordinate X of the finger.
   * @param {number} |pageY| The absolute coordinate Y of the finger.
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._onTouchMove =
    function ls_handleMove(pageX, pageY) {
      var touch = this.states.touch;

      if (!touch.touched) {

        // Do nothing if the user have not move the finger to the slide yet.
        if (!this.states.sliding)
          return;

        touch.touched = true;
        touch.initX = pageX;

        var overlay = this.overlay;
        overlay.classList.add('touched');
      }

      touch.tx = pageX - touch.initX;
      touch.pageX = pageX;

      if (-1 !== touch.pageX) {
        touch.deltaX = pageX - touch.prevX;
      }

      touch.prevX = pageX;
    };


  /**
   * Accelerate the slide when the finger is near the end.
   *
   * @param {number} |tx|
   * @param {boolean} |isLeft|
   * @param {boolean} |inverse| (Optional) true if you want to slow rather
   *                            than accelerate it.
   * @return {number}
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._accelerateSlide =
    function lss_accelerateSlide(tx, isLeft, inverse) {
      var accFactor = this.handle.autoExpand.accFactor;
      var accFactorMax = this.handle.autoExpand.accFactorMax;
      var accFactorOriginal =
        this.handle.autoExpand.accFactorOriginal;
      var interval = this.handle.autoExpand.accFactorInterval;
      var adjustedAccFactor = isLeft ? 1 / accFactor : accFactor;
      if (!inverse && accFactor + interval < accFactorMax)
        accFactor += interval;
      if (inverse && accFactor - interval > accFactorOriginal)
        accFactor -= interval;
      this.handle.autoExpand.accFactor = accFactor;
      return tx * adjustedAccFactor;
    };

  /**
   * Clear the canvas.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._clearCanvas =
    function lss_clearCanvas() {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

  /**
   * Bounce the handle back from the |tx|.
   *
   * @param {number} |tx| The absolute horizontal position of the finger.
   * @param {Function()} |cb| (Optional) Callback. Will be executed after
   * the animation ended.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._bounceBack =
    function lss_bounceBack(tx, cb) {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');

      // Absolute coordinate of the canvas center.
      var duration = this.handle.bounceBackTime;
      var center = this.center;
      var nextTx = tx;
      var tsBegin = null;
      var mspf = 0; // ms per frame.
      var interval = 1; // How many pixels per frame should draw.
      // Draw from the circle center to one end on the circle itself.
      var isLeft = tx - center.x < 0;

      var drawIt = (function _drawIt(ts) {
        if (null === tsBegin)
          tsBegin = ts;

        if (ts - tsBegin < duration) {
          if (0 === mspf)
            mspf = ts - tsBegin;  // Not an accurate way to determine mspf.
          interval = Math.abs(center.x - tx) / (duration / mspf);
          nextTx = isLeft ? nextTx + interval : nextTx - interval;
          if ((isLeft && nextTx < center.x) ||
              (!isLeft && nextTx >= center.x)) {
            this._clearCanvas();
            this._drawArrowsTo(nextTx);
            this._drawSlideTo(nextTx);
          }
          requestAnimationFrame(drawIt);
        } else {
          // Compensation from the current position to the center of the slide.
          this._clearCanvas();
          this._drawArrowsTo(center.x);
          this._drawSlideTo(center.x);
          if (cb)
            cb();
        }
      }).bind(this);
      requestAnimationFrame(drawIt);
    };

  /**
   * Dark the camera and unlocking icons when user leave our LockScreen.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._darkIcons =
    function lss_darkIcons() {
      this.areas.camera.classList.add('dark');
      this.areas.unlock.classList.add('dark');
    };

  /**
   * Draw the two arrows on the slide.
   *
   * @param {number} |tx| The absolute horizontal position of the target.
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._drawArrowsTo =
    function lss_drawArrows(tx) {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');
      var radius = this.handle.radius;
      var center = this.center;
      var offset = tx - center.x;
      var isLeft = offset < 0;

      if (this.handle.maxWidth < Math.abs(offset)) {
        this.states.slideReachEnd = true;
        return;
      }
      this.states.slideReachEnd = false;

      // The Y of arrows: need to put it from center to sink half of the arrow.
      if (isLeft) {
        // XXX:<<1: OK but don't know why!
        ctx.drawImage(this.arrows.left,
          tx - (this.arrows.left.width << 1),
          this.arrows.ldraw.y);
        ctx.drawImage(this.arrows.right,
          this.arrows.rdraw.x,
          this.arrows.ldraw.y);

      } else {
        ctx.drawImage(this.arrows.right,
          tx + this.arrows.right.width,
          this.arrows.rdraw.y);
        ctx.drawImage(this.arrows.left,
          this.arrows.ldraw.x,
          this.arrows.ldraw.y);
      }
    };

  /**
   * Extend the slide from its center to the specific position.
   *
   * @param {number} |tx| The absolute horizontal position of the target.
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._drawSlideTo =
    function lss_drawSlideTo(tx) {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');
      var maxWidth = this.handle.maxWidth;

      var offset = tx;
      var radius = this.handle.radius;
      var center = this.center;

      // The width and height of the rectangle.
      var rw = offset - center.x;
      var urw = Math.abs(rw);

      if (this.handle.maxWidth < urw) {
        offset = rw > 0 ? center.x + maxWidth : center.x - maxWidth;
      }

      // 1.5 ~ 0.5 is the right part of a circle.
      var startAngle = 1.5 * Math.PI;
      var endAngle = 0.5 * Math.PI;
      var fillAlpha = 0.0;
      var strokeStyle = 'white';
      const GRADIENT_LENGTH = 50;

      // If user move over 15px, fill the slide.
      if (urw > 15 && true !== this.states.slidingColorful) {
        // The color should be gradient in this length, from the origin.
        // It would decide how long the color turning to the touched color.

        fillAlpha = (urw - 15) / GRADIENT_LENGTH;
        if (fillAlpha > 1.0) {
          fillAlpha = 1.0;
          this.states.slidingColorGradientEnd = true;
        }

        // The border must disappear during the sliding,
        // so it's alpha would decrease to zero.
        var borderAlpha = 1.0 - fillAlpha;

        // From white to covered blue.
        strokeStyle = 'rgba(' + this.handle.touchedColorStop +
          ',' + borderAlpha + ')';

        // It's colorful now.
        this.states.slidingColorful = true;
      } else {

        // Has pass the stage of gradient color.
        if (true === this.states.slidingColorGradientEnd) {
          fillAlpha = 1.0;
          var color = this.handle.touchedColor;
        } else if (0 === urw) {  // Draw as the initial circle.
          fillAlpha = 0.0;
          var color = '255,255,255';
        } else {
          fillAlpha = (urw - 15) / GRADIENT_LENGTH;
          if (fillAlpha > 1.0) {
            fillAlpha = 1.0;
            this.states.slidingColorGradientEnd = true;
          }
          var color = this.handle.touchedColorStop;
        }
        var borderAlpha = 1.0 - fillAlpha;
        strokeStyle = 'rgba(' + color + ',' + borderAlpha + ')';
      }
      ctx.fillStyle = 'rgba(' + this.handle.touchedColor +
        ',' + fillAlpha + ')';
      ctx.lineWidth = this.handle.lineWidth;
      ctx.strokeStyle = strokeStyle;

      var counterclock = false;
      if (offset - center.x < 0) {
        counterclock = true;
      }

      // Start to draw it.
      // Can't use functions like rect or these individual parts
      // would show its borders.
      ctx.beginPath();

      ctx.arc(center.x, center.y,
          radius, endAngle, startAngle, counterclock);
      ctx.lineTo(center.x, center.y - radius);
      ctx.lineTo(center.x + (offset - center.x), center.y - radius);
      ctx.arc(offset, center.y, radius, startAngle, endAngle, counterclock);
      ctx.lineTo(center.x, center.y + radius);

      // Note: When setting both the fill and stroke for a shape,
      // make sure that you use fill() before stroke().
      // Otherwise, the fill will overlap half of the stroke.
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
    };

  /**
   * Return the mapping pixels according to the device pixel ratio.
   * This may need to be put int the shared/js.
   *
   * @param {number} |px|
   * @return {number}
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._dpx =
    function lss_dpx(px) {
      return px * window.devicePixelRatio;
    };

  /**
   * Light the camera and unlocking icons when user touch on our LockScreen.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._lightIcons =
    function lss_lightIcons() {
      this.areas.camera.classList.remove('dark');
      this.areas.unlock.classList.remove('dark');
    };

  /**
   * Map absolution X and Y to canvas' X and Y.
   * Note this should only be used when user want to draw something
   * follow the user's input. If the canvans need adjust its position,
   * the absolute coordinates should be used.
   *
   * @param {number} |x|
   * @param {number} |y|
   * @return {[number]} Array of single pair of X and Y
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._mapCoord =
    function lss_mapCoord(x, y) {
      var cw = this.canvas.clientWidth;
      var ch = this.canvas.clientHeight;

      return [cw * x / window.innerWidth,
              ch * y / window.innerHeight];
    };

  /**
   * Restore the arrow to the original position.
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._resetArrows =
    function lss_restoreArrows() {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');
      var center = this.center;
      ctx.drawImage(this.arrows.left,
          this.arrows.ldraw.x,
          this.arrows.ldraw.y);
      ctx.drawImage(this.arrows.right,
          this.arrows.rdraw.x,
          this.arrows.rdraw.y);
    };

  /**
   * Draw the handle with its initial states (a transparent circle).
   *
   * @this {LockScreenSlidePrototype}
   */
  LockScreenSlidePrototype._resetHandle =
    function lss_resetHandle() {
      this.states.slidingColorful = false;
      this.states.slidingColorGradientEnd = false;
      var canvas = this.canvas;
      var centerx = this.center.x;
      this._drawSlideTo(centerx);
    };

  LockScreenSlide.prototype = LockScreenSlidePrototype;
  exports.LockScreenSlide = LockScreenSlide;
})(window);
