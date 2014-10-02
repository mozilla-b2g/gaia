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
   * @param {Object} |opts| (Opional) addtional, options that may overwrite the
   *                        default settings.
   *                        The options should follow default settings above.
   * @constructor
   */
  var LockScreenSlide = function(opts) {
    this.initialize(opts);
  };

  var LockScreenSlidePrototype = {
    canvas: null,
    layout: '',
    /**
     * "new style" slider: as described in https://bugzil.la/950884
     * if this is set true, slider will be rendered as specified there
     * this module uses different render logics/data structures,
     * when useNewStyle is set to true
     * other callers of this module will see old-styled slider,
     * when useNewStyle is not specified
     */
    useNewStyle: false,
    track: {
      length: {tiny: '280', large: '410'},
      color: 'rgba(255, 255, 255, 0.4)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      from: 0,
      to: 0,
      radius: 0,
      width: 0 // We need dynamic length here.
    },

    trackNew: {
      length: {tiny: '276', large: '406'},
      strokeColorTop: 'rgba(0, 0, 0, 0.2)',
      strokeColorBottom: 'rgba(0, 0, 0, 0)',
      fillColorTop: 'rgba(0, 0, 0, 0.2)',
      fillColorBottom: 'rgba(0, 0, 0, 0)',
      backColor: 'rgba(51, 51, 51, 0.15)',
      from: 0,
      to: 0,
      radius: 0,
      width: 0 // We need dynamic length here.
    },

    arrows: {
      left: null, right: null,
      // Left and right drawing origin.
      ldraw: {x: null, y: null},
      rdraw: {x: null, y: null}
    },

    iconBG: {
      radius: 20,
      left: {
        color: 'rgba(255, 255, 255, 0.25)'
      },
      right: {
        color: 'rgba(255, 255, 255, 0.25)'
      }
    },

    slides: {
      left: null,
      right: null
    },

    areas: {
      left: null,
      right: null
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
        accState: 'normal', // In accelerating or not.
        accFactor: 1.02,     // Accelerate sliding (y = x^accFactor).
        sentinelOffset: 40,  // How many pixels before reaching end.
        sentinelWidth: 0   // Max width - offset
      },
      bounceBackTime: 200,  // ms
      radius: 28, // The radius of the handle in pixel.
      lineWidth: 1.6,
      maxWidth: 0,  // We need dynamic length here.

      // The colors here is the current color, which
      // will be alternated with another side's color
      // when user dragged across the center.

      // If it slide across the boundary to color it.
      touchedColor: '0, 170, 204', // RGB
      // The intermediate color of touched color.
      touchedColorStop: '178, 229, 239',
      // The initial stroke color.
      color: '255, 255, 255',
      // The initial handle background color.
      backgroundColor: '255, 255, 255',
      // The initial handle background color alpha value.
      backgroundAlpha: 0
    },

    handleNew: {
      // Whether we need to auto extend the handle.
      autoExpand: {
        accState: 'normal', // In accelerating or not.
        accFactor: 1.02,     // Accelerate sliding (y = x^accFactor).
        sentinelOffset: 40,  // How many pixels before reaching end.
        sentinelWidth: 0   // Max width - offset
      },
      bounceBackTime: 200,  // ms
      radius: 30, // The radius of the handle in pixel.
      innerRadius: 15,
      outerColor: 'rgba(255, 255, 255, 0.9)',
      innerColor: 'rgba(0, 0, 0, 0.05)',
      lineWidth: 1.6,
      maxWidth: 0,  // We need dynamic length here.
      towardLeft: false,

      // The colors here is the current color, which
      // will be alternated with another side's color
      // when user dragged across the center.

      // If it slide across the boundary to color it.
      touchedColor: '0, 170, 204', // RGB
      // The intermediate color of touched color.
      touchedColorStop: '178, 229, 239'
    },

    colors: {
      left: {
        touchedColor: '255, 255, 255',
        touchedColorStop: '255, 255, 255'
      },

      right: {
        touchedColor: '255, 255, 255',
        touchedColorStop: '255, 255, 255'
      }
    },

    states: {
      // Some elements can only be initialized after initialization...
      initialized: false,
      sliding: false,
      slideReachEnd: false,
      slidingColorful: false,   // Start to color the handle.
      slidingColorGradientEnd: false, // Full color the handle.

      // Most of them need to be initialized later.
      touch: {
        id: '',
        touched: false,
        initX: -1,
        pageX: -1,
        pageY: -1,
        tx: -1,
        prevX: -1,
        deltaX: 0  // Diff from prevX and current X
      }

    },

    // How to get elements.
    IDs: {
      overlay: 'lockscreen',
      area: 'lockscreen-area',
      canvas: 'lockscreen-canvas',
      areas: {
        left: 'lockscreen-area-camera',
        right: 'lockscreen-area-unlock'
      }
    },

    // Paths to access the resources.
    resources: {
      larrow: '/lockscreen/style/images/larrow.png',
      rarrow: '/lockscreen/style/images/rarrow.png'
    },

    resourcesNew: {
      larrow: '/lockscreen/style/images/lockscreen_toggle_arrow_left.png',
      rarrow: '/lockscreen/style/images/lockscreen_toggle_arrow_right.png'
    }
  };

  /**
   * Initialize this unlocker strategy.
   *
   * @param {Object} |opts| (Opional) addtional, options that may overwrite the
   *                        default settings.
   *                        The options should follow default settings above.
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype.initialize =
    function(opts) {
      if (opts) {
        this._overwriteSettings(opts);
      }
      if (opts.useNewStyle) {
        this.track = this.trackNew;
        this.handle = this.handleNew;
        this.resources = this.resourcesNew;
      }
      this._initializeCanvas();
      this.publish('lockscreenslide-unlocker-initializer');
      this.states.initialized = true;
    };

  LockScreenSlidePrototype.reset = function lss_reset() {
    this._clearCanvas();
    this._drawTrack();
    this._resetHandle();
    this._resetArrows();
    this._drawIconBG();
  };

  /**
   * Overwrite settings recursively.
   *
   * @param {Object} |options| options for overwrite default settings.
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._overwriteSettings =
    function(options) {
      var iterate = function _iterate(opts, settings) {
        for (var property in opts) {
          if (opts.hasOwnProperty(property)) {
              if ('object' === typeof opts[property]) {
                iterate(opts[property], settings[property]);
              }
              else {
                settings[property] = opts[property];
              }
          }
        }
      };

      iterate(options, this);
    };

  /**
   * The dispatcher. Unlocker would manager all its DOMs individually.
   *
   * @param {event} |evt| LockScreen Slide event.
   * @this {LockScreenSlide}
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
          this._drawTrack();
          this._resetHandle();
          this._resetArrows();
          this._drawIconBG();
          break;

        case 'touchstart':
          evt.preventDefault();
          if (evt.target !== this.area || evt.touches.length > 1) {
            return;
          }
          this.states.touch.id = evt.touches[0].identifier;
          this._onSlideBegin(this._dpx(evt.touches[0].pageX));
          window.addEventListener('touchend', this);
          window.addEventListener('touchmove', this);
          break;

        case 'touchmove':
          // In order to prevent pocket unlocks we reset the slide progress and
          // end the gesture detection if a new touch point appears on screen.
          if (evt.touches.length > 1) {
            this._endGesture();
            return;
          }
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
          if (evt.changedTouches[0].identifier !== this.states.touch.id) {
            return;
          }

          this._endGesture();
          break;
      }
    };

  /**
   * Initialize the canvas.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._initializeCanvas =
    function lss_initializeCanvas() {

      this.overlay = document.getElementById(this.IDs.overlay);
      this.area = document.getElementById(this.IDs.area);
      this.canvas = document.getElementById(this.IDs.canvas);
      this.areas.left = document.getElementById(this.IDs.areas.left);
      this.areas.right = document.getElementById(this.IDs.areas.right);

      this.area.addEventListener('touchstart', this);

      // Capture the first overlay change and do the delayed initialization.
      this.layout = (ScreenLayout && ScreenLayout.getCurrentLayout &&
                     ScreenLayout.getCurrentLayout()) ?
                      ScreenLayout.getCurrentLayout() : 'tiny';

      var center = this.center;
      this.arrows.left = new Image();
      this.arrows.right = new Image();
      var larrow = this.arrows.left;
      var rarrow = this.arrows.right;
      larrow.src = this.resources.larrow;
      rarrow.src = this.resources.rarrow;

      // XXX: Bet it would be OK while user start to drag the slide.
      larrow.onload = (function() {
        var offset =
          this.useNewStyle ?
          (this.arrows.left.width + this.handle.radius) :
          (this.arrows.left.width << 1);
        this.arrows.ldraw.x =
          center.x - offset;
        this.arrows.ldraw.y =
          center.y - (this.arrows.left.height >> 1);
        var ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.arrows.left,
          this.arrows.ldraw.x,
          this.arrows.ldraw.y,
          this.arrows.left.width,
          this.arrows.left.height);
      }).bind(this);
      rarrow.onload = (function() {
        var offset =
          this.useNewStyle ? this.handle.radius : this.arrows.right.width;
        this.arrows.rdraw.x =
          center.x + offset;
        this.arrows.rdraw.y =
          center.y - (this.arrows.right.height >> 1);
        var ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.arrows.right,
          this.arrows.rdraw.x,
          this.arrows.rdraw.y,
          this.arrows.right.width,
          this.arrows.right.height);
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
        this.canvas.offsetTop + this.canvas.height >> 1;

      this.handle.radius =
        this._dpx(this.handle.radius);

      if (this.useNewStyle) {
        this.handle.innerRadius =
          this._dpx(this.handle.innerRadius);
      }

      this.track.radius =
        this.handle.radius + this._dpx(this.useNewStyle ? 2 : 1);

      this.handle.lineWidth =
        this._dpx(this.handle.lineWidth);

      this.handle.autoExpand.sentinelOffset =
        this._dpx(this.handle.autoExpand.sentinelOffset);

      this.iconBG.radius = this._dpx(this.iconBG.radius);

      this.canvas.getContext('2d').save();

      // Need to move the context toward right, to compensate the circle which
      // would be draw at the center, and make it align too left.
      this.canvas.getContext('2d', this.handle.radius << 1, 0);

      // We don't reset the arrows because it need to be draw while image
      // got loaded, which is a asynchronous process.

      var trackLength = 'tiny' === this.layout ?
        this.track.length.tiny : this.track.length.large;

      // Offset and clientWidth would be window size.
      trackLength = this._dpx(trackLength);

      // Because the canvas would draw from the center to one point
      // on the circle, it would add dimeter long distance for one side.
      var maxWidth = (trackLength -
        (this.handle.radius << 1)) >> 1;

      // Left 1 pixel each side for the border.
      maxWidth -= 2;
      this.handle.maxWidth = maxWidth;
      this.handle.autoExpand.sentinelWidth =
        maxWidth - this.handle.autoExpand.sentinelOffset;

      this.track.width = trackLength;
      this.track.from = this.center.x - maxWidth;
      this.track.to = this.center.x + maxWidth;
      this.track.y = this.center.y;

      this._drawTrack();
      this._drawIconBG();

      // Draw the handle.
      this._resetHandle();
      this._resetTouchStates();
    };

  /**
   * Finalize the canvas: restore its default states.
   *
   * @this {LockScreenSlide}
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
   * @this {LockScreenSlide}
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
          var prevState = this.handle.autoExpand.accState;
          this.handle.autoExpand.accState = 'accelerating';
          var currentState = this.handle.autoExpand.accState;
          var slow = false;
          if (isLeft) {
            slow = this.states.touch.deltaX > 0;
            if (prevState !== currentState)
              this.publish('lockscreenslide-near-left',
                  {'currentState': currentState, 'prevState': prevState});
          } else {
            slow = this.states.touch.deltaX < 0;
            if (prevState !== currentState)
              this.publish('lockscreenslide-near-right',
                  {'currentState': currentState, 'prevState': prevState});
          }
      } else {
        var prevState = this.handle.autoExpand.accState;
        this.handle.autoExpand.accState = 'normal';
        var currentState = this.handle.autoExpand.accState;
        if (prevState !== currentState) {
          if (isLeft) {
            if (prevState !== currentState)
              this.publish('lockscreenslide-near-left',
                  {'currentState': currentState, 'prevState': prevState});
          } else {
            if (prevState !== currentState)
              this.publish('lockscreenslide-near-right',
                  {'currentState': currentState, 'prevState': prevState});
          }
        }
      }
      mtx = this._accelerateSlide(tx);

      // Order matters.
      this._drawTrack();
      this._drawArrowsTo(mtx);
      this._drawIconBG();
      this._drawSlideTo(mtx);
    };

  /**
   * Start slide the handle of the lockscreen.
   * Effect: Will set touch and sliding flag in this.
   *
   * @param {tx} The absolute coordinate X of the touch position.
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._onSlideBegin =
    function lss_onSlideBegin(tx) {
      var canvasCenterX = this.canvas.clientWidth >> 1;
      var center = this.center;

      // To see if the finger touch on the area of the center circle.
      var boundaryR = center.x + this.handle.radius;
      var boundaryL = center.x - this.handle.radius;

      if (tx > boundaryR || tx < boundaryL) {
        this.states.sliding = false;
        return; // Do nothing.
      }

      this.publish('lockscreenslide-unlocking-start');
      this.states.touch.initX = tx;
      this.states.sliding = true;
      this._lightIcons();
    };

  /**
   * Encapsulating all the cleanups needed at the end of a gesture.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._endGesture =
    function lss_endGesture() {
      window.removeEventListener('touchmove', this);
      window.removeEventListener('touchend', this);

      this.states.sliding = false;
      this._onSlideEnd();
      this._resetTouchStates();
      this.overlay.classList.remove('touched');
      this.states.slideReachEnd = false;
    };

  /**
   * When user released the finger, bounce it back.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._onSlideEnd =
    function lss_onSlideEnd() {

      var isLeft = this.states.touch.pageX - this.center.x < 0;
      if (false === this.states.slideReachEnd) {
        this._bounceBack(this.states.touch.pageX);
      } else {
        var intention = isLeft ? 'lockscreenslide-activate-left' :
          'lockscreenslide-activate-right';
        this.publish(intention);
      }

      this.publish('lockscreenslide-unlocking-stop');
      this._darkIcons();
    };

  /**
   * When touchmove event on, records the information.
   *
   * @param {number} |pageX| The absolute coordinate X of the finger.
   * @param {number} |pageY| The absolute coordinate Y of the finger.
   * @this {LockScreenSlide}
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
   * @param {number} |tx| The absolute coordinate of the touching position.
   * @return {number}
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._accelerateSlide =
    function lss_accelerateSlide(tx) {
      var isLeft = tx - this.center.x < 0;
      var dx = Math.abs(tx - this.center.x);
      var accFactor = this.handle.autoExpand.accFactor;
      var acc = Math.pow(dx, accFactor);
      var accTx = tx + acc;
      if (isLeft)
        accTx = tx - acc;

      if (accTx < 0)
        accTx = 0;
      return accTx;
    };

  /**
   * Clear the canvas.
   *
   * @this {LockScreenSlide}
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
   * @this {LockScreenSlide}
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
            this._drawTrack();
            this._drawArrowsTo(nextTx);
            this._drawIconBG();
            this._drawSlideTo(nextTx);
          }
          requestAnimationFrame(drawIt);
        } else {
          // Compensation from the current position to the center of the slide.
          this._clearCanvas();
          this._drawTrack();
          this._drawArrowsTo(center.x);
          this._drawIconBG();
          this._drawSlideTo(center.x);
          if (cb)
            cb();
        }
      }).bind(this);
      requestAnimationFrame(drawIt);
    };

  /**
   * Dark the left and right icons when user leave our LockScreen.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._darkIcons =
    function lss_darkIcons() {
      this.areas.left.classList.add('dark');
      this.areas.right.classList.add('dark');
    };

  /**
   * Draw the two arrows on the slide.
   *
   * @param {number} |tx| The absolute horizontal position of the target.
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._drawArrowsTo =
    function lss_drawArrows(tx) {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');
      var radius = this.handle.radius;
      var center = this.center;
      var offset = tx - center.x;
      var isLeft = offset < 0;
      var alpha = 1 - Math.min(1, Math.abs(offset) / this._dpx(30));

      if (this.handle.maxWidth < Math.abs(offset)) {
        this.states.slideReachEnd = true;
        return;
      }
      this.states.slideReachEnd = false;

      // The Y of arrows: need to put it from center to sink half of the arrow.
      if (isLeft) {
        // XXX:<<1: OK but don't know why!
        var position =
          this.useNewStyle ?
          (tx - this.arrows.left.width - this.handle.radius) :
          (tx - (this.arrows.left.width << 1));
        var oldAlpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.arrows.left,
          position,
          this.arrows.ldraw.y,
          this.arrows.left.width,
          this.arrows.left.height);
        ctx.globalAlpha = oldAlpha;
        ctx.drawImage(this.arrows.right,
          this.arrows.rdraw.x,
          this.arrows.rdraw.y,
          this.arrows.right.width,
          this.arrows.right.height);

      } else {
        var position =
          this.useNewStyle ?
          (tx + this.handle.radius) :
          (tx + this.arrows.right.width);
        var oldAlpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha;
        ctx.drawImage(this.arrows.right,
          position,
          this.arrows.rdraw.y,
          this.arrows.right.width,
          this.arrows.right.height);
        ctx.globalAlpha = oldAlpha;
        ctx.drawImage(this.arrows.left,
          this.arrows.ldraw.x,
          this.arrows.ldraw.y,
          this.arrows.left.width,
          this.arrows.left.height);
      }
    };

  /**
   * Draw the track of the slide.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._drawTrack =
    function lss_drawTrack() {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');

      var radius = this.track.radius;

      if (this.useNewStyle) {
        var startAngle = 1.5 * Math.PI;
        var endAngle = 0.5 * Math.PI;

        var draw = (function(fillStyle, strokeStyle) {
          ctx.beginPath();
          ctx.fillStyle = fillStyle;
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = this.handle.lineWidth;
          ctx.moveTo(this.track.from, this.track.y - radius);
          ctx.lineTo(this.track.to, this.track.y - radius);
          ctx.arc(this.track.to, this.track.y,
                  radius, startAngle, endAngle, false);
          ctx.lineTo(this.track.from, this.track.y + radius);
          ctx.arc(this.track.from, this.track.y,
                  radius, endAngle, startAngle, false);
          ctx.fill();
          ctx.closePath();
          ctx.stroke();
        }).bind(this);

        // single-color background
        draw(this.track.backColor, 'transparent');

        // actual gradient
        var gradientStroke =
          ctx.createLinearGradient(
            this.track.from - radius,
            this.track.y - radius,
            this.track.from - radius,
            this.track.y + radius
          );
        var gradientFill =
          ctx.createLinearGradient(
            this.track.from - radius,
            this.track.y - radius,
            this.track.from - radius,
            this.track.y + radius
          );
        gradientStroke.addColorStop(0, this.track.strokeColorTop);
        gradientStroke.addColorStop(1, this.track.strokeColorBottom);
        gradientFill.addColorStop(0, this.track.fillColorTop);
        gradientFill.addColorStop(1, this.track.fillColorBottom);

        draw(gradientFill, gradientStroke);

      } else {
        // 1.5 ~ 0.5 is the right part of a circle.
        var startAngle = 1.5 * Math.PI;
        var endAngle = 0.5 * Math.PI;
        var strokeStyle = this.track.color;

        ctx.fillStyle = this.track.backgroundColor;
        ctx.lineWidth = this.handle.lineWidth;
        ctx.strokeStyle = strokeStyle;

        // Start to draw it.
        // Can't use functions like rect or these individual parts
        // would show its borders.
        ctx.beginPath();

        ctx.arc(this.track.from, this.track.y,
            radius, endAngle, startAngle, false);
        ctx.lineTo(this.track.from, this.track.y - radius);
        ctx.lineTo(this.track.to, this.track.y - radius);
        ctx.arc(this.track.to, this.track.y,
          radius, startAngle, endAngle, false);
        ctx.lineTo(this.track.from, this.track.y + radius);

        ctx.fill();
        ctx.stroke();
        ctx.closePath();
      }
    };

  /**
   * Extend the slide from its center to the specific position.
   *
   * @param {number} |tx| The absolute horizontal position of the target.
   * @this {LockScreenSlide}
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

      var counterclock = false;
      if (offset - center.x < 0) {
        counterclock = true;
      }
      var isLeft = counterclock;

      var isLeft = counterclock;
      var isRight = offset - center.x > 0;

      if (isLeft) {
        this.handle.touchedColor = this.colors.left.touchedColor;
        this.handle.touchedColorStop = this.colors.left.touchedColorStop;
      } else if (isRight) {
        this.handle.touchedColor = this.colors.right.touchedColor;
        this.handle.touchedColorStop = this.colors.right.touchedColorStop;
      }

      // 1.5 ~ 0.5 is the right part of a circle.
      var startAngle = 1.5 * Math.PI;
      var endAngle = 0.5 * Math.PI;
      var fillAlpha = 0.0;
      var strokeStyle = 'white';
      const GRADIENT_LENGTH = 50;

      if (this.useNewStyle) {
        if (0 === urw) {  // Draw as the initial circle.
          // outer circle
          ctx.beginPath();

          ctx.arc(center.x, center.y,
              radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = this.handle.outerColor;

          // Note: When setting both the fill and stroke for a shape,
          // make sure that you use fill() before stroke().
          // Otherwise, the fill will overlap half of the stroke.
          ctx.closePath();
          ctx.fill();

          // outer circle
          ctx.beginPath();

          ctx.arc(center.x, center.y,
              this.handle.innerRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = this.handle.innerColor;

          // Note: When setting both the fill and stroke for a shape,
          // make sure that you use fill() before stroke().
          // Otherwise, the fill will overlap half of the stroke.
          ctx.closePath();
          ctx.fill();
        } else {
          // from 0.9 to 0.2
          fillAlpha = 0.9 - Math.min(0.7, (urw / this.handle.maxWidth) * 0.7);

          strokeStyle = 'transparent';

          ctx.fillStyle = 'rgba(' + this.handle.touchedColor + ', ' +
            fillAlpha + ')';
          ctx.strokeStyle = strokeStyle;

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
        }
      } else { // old style
        var fillColor;
        var strokeColor;
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

          // From white to covered color.
          strokeStyle = 'rgba(' + this.handle.touchedColorStop +
            ',' + borderAlpha + ')';

          // It's colorful now.
          this.states.slidingColorful = true;
        } else {

          if (0 === urw) {  // Draw as the initial circle.
            fillAlpha = this.handle.backgroundAlpha;
            strokeColor = this.handle.color;
            fillColor = this.handle.backgroundColor;
          } else {
            fillAlpha = (urw - 15) / GRADIENT_LENGTH;
            if (fillAlpha > 1.0) {
              fillAlpha = 1.0;
            }
            strokeColor = this.handle.touchedColorStop;
            fillColor = this.handle.touchedColor;
          }
          var borderAlpha = 1.0 - fillAlpha;
          strokeStyle = 'rgba(' + strokeColor + ',' + borderAlpha + ')';
        }
        ctx.fillStyle = 'rgba(' + fillColor + ',' + fillAlpha + ')';
        ctx.lineWidth = this.handle.lineWidth;
        ctx.strokeStyle = strokeStyle;

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
      }
    };

  /**
   * Return the mapping pixels according to the device pixel ratio.
   * This may need to be put int the shared/js.
   *
   * @param {number} |px| original px distance.
   * @return {number}
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._drawIconBG =
    function lss_dibg() {
      if (!this.useNewStyle)
        return;

      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');

      ctx.fillStyle = this.iconBG.left.color;
      ctx.strokeStyle = 'transparent';

      ctx.beginPath();
      ctx.arc(this.track.from, this.track.y,
              this.iconBG.radius, 0, 2 * Math.PI, false);
      ctx.stroke();
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = this.iconBG.right.color;
      ctx.beginPath();
      ctx.arc(this.track.to, this.track.y,
              this.iconBG.radius, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
    };

  /**
   * Return the mapping pixels according to the device pixel ratio.
   * This may need to be put int the shared/js.
   *
   * @param {number} |px| original px distance.
   * @return {number}
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._dpx =
    function lss_dpx(px) {
      return px * window.devicePixelRatio;
    };

  /**
   * Light the left and right icons when user touch on our LockScreen.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._lightIcons =
    function lss_lightIcons() {
      this.areas.left.classList.remove('dark');
      this.areas.right.classList.remove('dark');
    };

  /**
   * Map  and Y to canvas' X and Y.
   * Note this should only be used when user want to draw something
   * follow the user's input. If the canvans need adjust its position,
   * the absolute coordinates should be used.
   *
   * @param {number} |x| absolution X.
   * @param {number} |y| absolution Y.
   * @return {[number]} Array of single pair of X and Y.
   * @this {LockScreenSlide}
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
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._resetArrows =
    function lss_restoreArrows() {
      var canvas = this.canvas;
      var ctx = canvas.getContext('2d');
      var center = this.center;
      ctx.drawImage(this.arrows.left,
          this.arrows.ldraw.x,
          this.arrows.ldraw.y,
          this.arrows.left.width,
          this.arrows.left.height);
      ctx.drawImage(this.arrows.right,
          this.arrows.rdraw.x,
          this.arrows.rdraw.y,
          this.arrows.right.width,
          this.arrows.right.height);
    };

  /**
   * Draw the handle with its initial states.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._resetHandle =
    function lss_resetHandle() {
      this.states.slidingColorful = false;
      this.states.slidingColorGradientEnd = false;
      var canvas = this.canvas;
      var centerx = this.center.x;
      this._drawSlideTo(centerx);
    };

  /**
   * Reset the states of touch after it's end.
   *
   * @this {LockScreenSlide}
   */
  LockScreenSlidePrototype._resetTouchStates =
    function lss_resetTouchStates() {
      this.states.touch = {
        id: null,
        touched: false,
        initX: this.center.x,
        pageX: this.center.x,
        pageY: this.center.y,
        tx: 0,
        prevX: this.center.x,
        deltaX: 0
      };
    };

  LockScreenSlidePrototype.publish =
    function lss_publish(type, detail) {
      window.dispatchEvent(new CustomEvent(type, {'detail': detail}));
    };

  LockScreenSlide.prototype = LockScreenSlidePrototype;
  exports.LockScreenSlide = LockScreenSlide;
})(window);
