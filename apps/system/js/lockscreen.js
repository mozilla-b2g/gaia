/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var LockScreen = {

  /**
   * Information of the canvas lockscreen.
   */
  _canvasDetails: {
    arrows: {
      left: null, right: null,
      // Left and right drawing origin.
      ldraw: {x: null, y: null},
      rdraw: {x: null, y: null}
    },
    width: 0, // We need dynamic length here.
    height: 80,
    center: {x: null, y: null},
    slidingColorful: false,   // Start to color the handle.
    slidingColorGradientEnd: false, // Full color the handle.
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
    }
  },

  /*
  * Boolean return true when initialized.
  */
  ready: false,

  /*
  * Boolean return the status of the lock screen.
  * Must not multate directly - use unlock()/lockIfEnabled()
  * Listen to 'lock' and 'unlock' event to properly handle status changes
  */
  locked: true,

  /*
  * Boolean return whether if the lock screen is enabled or not.
  * Must not multate directly - use setEnabled(val)
  * Only Settings Listener should change this value to sync with data
  * in Settings API.
  */
  enabled: true,

  /*
  * Boolean returns wether we want a sound effect when unlocking.
  */
  unlockSoundEnabled: true,

  /*
  * Boolean return whether if the lock screen is enabled or not.
  * Must not multate directly - use setPassCodeEnabled(val)
  * Only Settings Listener should change this value to sync with data
  * in Settings API.
  * Will be ignored if 'enabled' is set to false.
  */
  passCodeEnabled: false,

  /*
  * Four digit Passcode
  * XXX: should come for Settings
  */
  passCode: '0000',

  /*
  * The time to request for passcode input since device is off.
  */
  passCodeRequestTimeout: 0,

  /*
  * Store the first time the screen went off since unlocking.
  */
  _screenOffTime: 0,

  /*
  * Check the timeout of passcode lock
  */
  _passCodeTimeoutCheck: false,

  /*
  * If user is sliding.
  */
  _sliding: false,

  /*
  * If user had released the finger and the handle already
  * reached one of the ends.
  */
  _slideReachEnd: false,

  /*
  * Detect if sliding crossed the middle line.
  */
  _slidingToward: '',

  /*
  * How long did the user slide.
  */
  _slideCount: 0,

  /*
  * Current passcode entered by the user
  */
  passCodeEntered: '',

  /**
   * Are we currently switching panels ?
   */
  _switchingPanel: false,

  /*
  * Timeout after incorrect attempt
  */
  kPassCodeErrorTimeout: 500,

  /*
  * Counter after incorrect attempt
  */
  kPassCodeErrorCounter: 0,

  /*
  * Airplane mode
  */
  airplaneMode: false,

  /*
  * Timeout ID for backing from triggered state to normal state
  */
  triggeredTimeoutId: 0,

  /*
  * Max value for handle swiper up
  */
  HANDLE_MAX: 70,

  /*
  * Types of 2G Networks
  */
  NETWORKS_2G: ['gsm', 'gprs', 'edge'],

  /**
   * Object used for handling the clock UI element, wraps all related timers
   */
  clock: new Clock(),

  /**
   * Some additional information about other global data entries bound on
   * DOM elements:
   *
   * (We can't find a suitable place to put in these information, because
   *  we even doesn't get the elements directly. See `getAllElements`.)
   *
   * // If user input the correct passcode or not.
   * // Undefined by deleting it means there is no passcode had been inputted.
   * //
   * // 'success' | 'error' | undefined
   * overlay.dataset.passcodeStatus
   *
   * // The current panel.
   * // Undefined actually means the main panel.
   * //
   * // 'camera' | 'main' | 'passcode' | 'emergency-call' | undefined
   * overlay.dataset.panel
   *
   * @this
   */

  /* init */
  init: function ls_init() {

    if (this.ready) { // already initialized: just trigger a translation
      this.refreshClock(new Date());
      this.updateConnState();
      return;
    }
    this.ready = true;

    this.getAllElements();

    this.lockIfEnabled(true);
    this.writeSetting(this.enabled);

    // Start to draw the slide and handle.
    this._initializeCanvas();

    /* Status changes */
    window.addEventListener('volumechange', this);
    window.addEventListener('screenchange', this);
    document.addEventListener('visibilitychange', this);

    /* Telephony changes */
    if (navigator.mozTelephony) {
      navigator.mozTelephony.addEventListener('callschanged', this);
    }

    /* Gesture */
    this.area.addEventListener('touchstart', this);
    this.areaCamera.addEventListener('click', this);
    this.areaUnlock.addEventListener('click', this);
    this.altCamera.addEventListener('touchstart', this);
    this.iconContainer.addEventListener('touchstart', this);

    /* Unlock & camera panel clean up */
    this.overlay.addEventListener('transitionend', this);

    /* Passcode input pad*/
    this.passcodePad.addEventListener('click', this);

    /* switching panels */
    window.addEventListener('home', this);

    /* blocking holdhome and prevent Cards View from show up */
    window.addEventListener('holdhome', this, true);

    /* mobile connection state on lock screen */

    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var conn = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

    if (conn && conn.voice) {
      conn.addEventListener('voicechange', this);
      this.updateConnState();
      this.connstate.hidden = false;
    }

    /* icc state on lock screen */
    if (IccHelper.enabled) {
      IccHelper.addEventListener('cardstatechange', this);
      IccHelper.addEventListener('iccinfochange', this);
    }

    /* media playback widget */
    this.mediaPlaybackWidget = new MediaPlaybackWidget(this.mediaContainer);

    var self = this;

    SettingsListener.observe('lockscreen.enabled', true, function(value) {
      self.setEnabled(value);
    });

    SettingsListener.observe('ril.radio.disabled', false, function(value) {
      self.airplaneMode = value;
      self.updateConnState();
    });

    var wallpaperURL = new SettingsURL();

    SettingsListener.observe('wallpaper.image',
                             'resources/images/backgrounds/default.png',
                             function(value) {
                               self.updateBackground(wallpaperURL.set(value));
                               self.overlay.classList.remove('uninit');
                             });

    SettingsListener.observe(
      'lockscreen.passcode-lock.code', '0000', function(value) {
      self.passCode = value;
    });

    SettingsListener.observe(
        'lockscreen.passcode-lock.enabled', false, function(value) {
      self.setPassCodeEnabled(value);
    });

    SettingsListener.observe('lockscreen.unlock-sound.enabled',
      true, function(value) {
      self.setUnlockSoundEnabled(value);
    });

    SettingsListener.observe('lockscreen.passcode-lock.timeout',
      0, function(value) {
      self.passCodeRequestTimeout = value;
    });

  },

  /*
  * Set enabled state.
  * If enabled state is somehow updated when the lock screen is enabled
  * This function will unlock it.
  */
  setEnabled: function ls_setEnabled(val) {
    if (typeof val === 'string') {
      this.enabled = val == 'false' ? false : true;
    } else {
      this.enabled = val;
    }

    if (!this.enabled && this.locked) {
      this.unlock();
    }
  },

  setPassCodeEnabled: function ls_setPassCodeEnabled(val) {
    if (typeof val === 'string') {
      this.passCodeEnabled = val == 'false' ? false : true;
    } else {
      this.passCodeEnabled = val;
    }
  },

  setUnlockSoundEnabled: function ls_setUnlockSoundEnabled(val) {
    if (typeof val === 'string') {
      this.unlockSoundEnabled = val == 'false' ? false : true;
    } else {
      this.unlockSoundEnabled = val;
    }
  },

  /**
   * Light the camera and unlocking icons when user touch on our LockScreen.
   *
   * @this {LockScreen}
   */
  _lightIcons: function() {
    this.rightIcon.classList.remove('dark');
    this.leftIcon.classList.remove('dark');
  },

  /**
   * Dark the camera and unlocking icons when user leave our LockScreen.
   *
   * @this {LockScreen}
   */
  _darkIcons: function() {
    this.rightIcon.classList.add('dark');
    this.leftIcon.classList.add('dark');
  },

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        // Don't lock if screen is turned off by promixity sensor.
        if (evt.detail.screenOffBy == 'proximity') {
          break;
        }

        // If the screen got blackout, should restore the slide.
        this._clearCanvas();
        this._resetArrows();
        this._resetHandle();

        this.slideLeft.classList.remove('touched');
        this.slideCenter.classList.remove('touched');
        this.slideRight.classList.remove('touched');

        // XXX: If the screen is not turned off by ScreenManager
        // we would need to lock the screen again
        // when it's being turned back on
        if (!evt.detail.screenEnabled) {
          // Don't update the time after we're already locked otherwise turning
          // the screen off again will bypass the passcode before the timeout.
          if (!this.locked) {
            this._screenOffTime = new Date().getTime();
          }

          // Remove camera once screen turns off
          if (this.camera.firstElementChild)
            this.camera.removeChild(this.camera.firstElementChild);

          // Stop refreshing the clock when the screen is turned off.
          this.clock.stop();
        } else {
          var _screenOffInterval = new Date().getTime() - this._screenOffTime;
          if (_screenOffInterval > this.passCodeRequestTimeout * 1000) {
            this._passCodeTimeoutCheck = true;
          } else {
            this._passCodeTimeoutCheck = false;
          }

          // Resume refreshing the clock when the screen is turned on.
          this.clock.start(this.refreshClock.bind(this));

          // Show the unlock keypad immediately
          if (this.passCodeEnabled && this._passCodeTimeoutCheck) {
            this.switchPanel('passcode');
          }
        }

        this.lockIfEnabled(true);
        break;

      case 'voicechange':
      case 'cardstatechange':
      case 'iccinfochange':
        this.updateConnState();
        break;

      case 'click':
        if (evt.mozInputSource === 0 &&
            (evt.target === this.areaUnlock ||
             evt.target === this.areaCamera)) {
          evt.preventDefault();
          this.handleIconClick(evt.target);
          break;
        }

        if (!evt.target.dataset.key)
          break;

        // Cancel the default action of <a>
        evt.preventDefault();
        this.handlePassCodeInput(evt.target.dataset.key);
        break;

      case 'touchstart':
        if (evt.target === this.areaUnlock ||
           evt.target === this.areaCamera ||
           evt.target === this.altCamera) {
          evt.preventDefault();
          this.handleIconClick(evt.target);
          break;
        }

        var leftTarget = this.areaCamera;
        var rightTarget = this.areaUnlock;
        var overlay = this.overlay;
        var target = evt.target;
        this._touch = {
          direction: '',
          touched: false,
          leftTarget: leftTarget,
          rightTarget: rightTarget,
          overlayWidth: this.overlay.offsetWidth
        };

        if (evt.target === this.area) {
          this._onSlideBegin(evt);
        }

        window.addEventListener('touchend', this);
        window.addEventListener('touchmove', this);

        this._touch.touched = true;
        this._touch.initX = evt.touches[0].pageX;
        this._touch.initY = evt.touches[0].pageY;
        overlay.classList.add('touched');
        break;

      case 'touchmove':
        this.handleMove(
          evt.touches[0].pageX,
          evt.touches[0].pageY
        );
        if (this._sliding) {
          this._onSliding(evt);
        }
        break;

      case 'touchend':
        window.removeEventListener('touchmove', this);
        window.removeEventListener('touchend', this);

        this.handleMove(
          evt.changedTouches[0].pageX,
          evt.changedTouches[0].pageY
        );

        if (this._sliding) {
          this._onSlideEnd();
        }

        delete this._touch;
        this.overlay.classList.remove('touched');

        break;

      case 'transitionend':
        if (evt.target !== this.overlay)
          return;

        if (this.overlay.dataset.panel !== 'camera' &&
            this.camera.firstElementChild) {
          this.camera.removeChild(this.camera.firstElementChild);
        }

        if (!this.locked)
          this.switchPanel();
        break;

      case 'home':
        if (this.locked) {
          if (this.passCodeEnabled) {
            this.switchPanel('passcode');
          } else {
            this.switchPanel();
          }
          evt.stopImmediatePropagation();
        }
        break;

      case 'holdhome':
        if (!this.locked)
          return;

        evt.stopImmediatePropagation();
        evt.stopPropagation();
        break;

      case 'callschanged':
        var emergencyCallBtn = this.passcodePad.querySelector('a[data-key=e]');
        if (!!navigator.mozTelephony.calls.length) {
          emergencyCallBtn.classList.add('disabled');
        } else {
          emergencyCallBtn.classList.remove('disabled');
        }
        // Return to main panel once call state changes.
        if (this.locked)
          this.switchPanel();
        break;
    }
  },

  handleMove: function ls_handleMove(pageX, pageY) {
    var touch = this._touch;

    if (!touch.touched) {

      // Do nothing if the user have not move the finger to the slide yet.
      if (!this._sliding)
        return;

      touch.touched = true;
      touch.initX = pageX;
      touch.initY = pageY;

      var overlay = this.overlay;
      overlay.classList.add('touched');
    }

    var dy = pageY - touch.initY;
    var ty = Math.max(- this.HANDLE_MAX, dy);
    var base = - ty / this.HANDLE_MAX;
    touch.ty = ty;

    touch.tx = pageX - touch.initX;
    touch.pageX = pageX;
    touch.pageY = pageY;
  },

  /**
   * Start slide the handle of the lockscreen.
   * Effect: Will set touch and sliding flag in this.
   *
   * @param {event} |evt| The touch event.
   * @this {LockScreen}
   */
  _onSlideBegin: function ls_onSlideBegin(evt) {

    // Because if we initialize this value while init the lockscreen,
    // the offset would be zero.
    var trackLength = this.rightIcon.offsetLeft -
                      this.leftIcon.offsetLeft +
                      this.rightIcon.clientWidth;

    // Because the canvas would draw from the center to one point
    // on the circle, it would add dimeter long distance for one side.
    var maxWidth = (trackLength -
        (this._canvasDetails.handle.radius << 1)) >> 1;

    // Left 1 pixel each side for the border.
    maxWidth -= 2;
    this._canvasDetails.handle.maxWidth = this._dpx(maxWidth);

    this._canvasDetails.handle.radius =
      this._dpx(this._canvasDetails.handle.radius);

    this._canvasDetails.handle.lineWidth =
      this._dpx(this._canvasDetails.handle.lineWidth);

    this._canvasDetails.handle.autoExpand.sentinelOffset =
      this._dpx(this._canvasDetails.handle.autoExpand.sentinelOffset);

    this._canvasDetails.handle.autoExpand.sentinelWidth =
      maxWidth - this._canvasDetails.handle.autoExpand.sentinelOffset;

    var tx = evt.touches[0].pageX;
    var ty = evt.touches[0].pageY;

    var canvasCenterX = this.canvas.clientWidth >> 1;

    var center = this._canvasDetails.center;

    // To see if the finger touch on the area of the center circle.
    var boundaryR = center.x + this._canvasDetails.handle.radius;
    var boundaryL = center.x - this._canvasDetails.handle.radius;

    if (tx > boundaryR || tx < boundaryL) {
      return; // Do nothing.
    }

    this._touch.initX = tx;
    this._touch.initY = ty;

    this._sliding = true;
    this._lightIcons();
  },

  /**
   * Initialize the canvas.
   *
   * @this {LockScreen}
   */
  _initializeCanvas: function ls_initializeCanvas() {
    var center = this._canvasDetails.center;
    this._canvasDetails.arrows.left = new Image();
    this._canvasDetails.arrows.right = new Image();
    var larrow = this._canvasDetails.arrows.left;
    var rarrow = this._canvasDetails.arrows.right;
    larrow.src = '/style/lockscreen/images/larrow.png';
    rarrow.src = '/style/lockscreen/images/rarrow.png';

    // XXX: Bet it would be OK while user start to drag the slide.
    larrow.onload = (function() {
      this._canvasDetails.arrows.ldraw.x =
            center.x - (this._canvasDetails.arrows.left.width << 1);
      this._canvasDetails.arrows.ldraw.y =
            center.y - (this._canvasDetails.arrows.left.height >> 1);
      var ctx = this.canvas.getContext('2d');
      ctx.drawImage(this._canvasDetails.arrows.left,
          this._canvasDetails.arrows.ldraw.x,
          this._canvasDetails.arrows.ldraw.y);
    }).bind(this);
    rarrow.onload = (function() {
      this._canvasDetails.arrows.rdraw.x =
            center.x + (this._canvasDetails.arrows.right.width);
      this._canvasDetails.arrows.rdraw.y =
            center.y - (this._canvasDetails.arrows.right.height >> 1);
      var ctx = this.canvas.getContext('2d');
      ctx.drawImage(this._canvasDetails.arrows.right,
          this._canvasDetails.arrows.rdraw.x,
          this._canvasDetails.arrows.rdraw.y);
    }).bind(this);

    this._canvasDetails.width = this._dpx(window.innerWidth);
    this._canvasDetails.height = this._dpx(80);

    this.canvas.width = this._canvasDetails.width;
    this.canvas.height = this._canvasDetails.height;

    this._canvasDetails.center.x =
      this.canvas.offsetLeft + this.canvas.width >> 1;
    this._canvasDetails.center.y =
      this.canvas.offsetHeight + this.canvas.height >> 1;

    this.canvas.getContext('2d').save();

    // Need to move the context toward right, to compensate the circle which
    // would be draw at the center, and make it align too left.
    this.canvas.getContext('2d', this._canvasDetails.handle.radius << 1, 0);

    // Draw the handle.
    this._resetHandle();

    // We don't reset the arrows because it need to be draw while image
    // got loaded, which is a asynchronous process.
  },

  /**
   * Finalize the canvas: restore its default state.
   *
   * @this {LockScreen}
   */
  _finalizeCanvas: function ls_finalizeCanvas() {
    this._canvasDetails.slidingColorful = false;
    this._canvasDetails.slidingColorGradientEnd = false,
    //this.canvas.getContext('2d').restore();
    this._clearCanvas();
  },

  /**
   * Records how long the user's finger dragged.
   *
   * @param {event} |evt| The touch event.
   * @this {LockScreen}
   */
  _onSliding: function ls_onSliding(evt) {
    var tx = evt.touches[0].pageX;
    var mtx = this._mapCoord(tx, 0)[0];
    this._clearCanvas();

    var expandSentinelR = this._canvasDetails.center.x +
      this._canvasDetails.handle.autoExpand.sentinelWidth;

    var expandSentinelL = this._canvasDetails.center.x -
      this._canvasDetails.handle.autoExpand.sentinelWidth;

    if (tx > expandSentinelR || tx < expandSentinelL) {
      mtx = this._accelerateSlide(tx, tx < expandSentinelL);
    } else {
      this._canvasDetails.handle.autoExpand.accFactor =
        this._canvasDetails.handle.autoExpand.accFactorOriginal;
    }

    // Slide must overlay on arrows.
    this._drawArrowsTo(mtx);
    this._drawSlideTo(mtx);
  },

  /**
   * Accelerate the slide when the finger is near the end.
   *
   * @param {number} |tx|
   * @param {boolean} |isLeft|
   * @return {number}
   * @this {LockScreen}
   */
  _accelerateSlide: function ls_accelerateSlide(tx, isLeft) {
    var accFactor = this._canvasDetails.handle.autoExpand.accFactor;
    var accFactorMax = this._canvasDetails.handle.autoExpand.accFactorMax;
    var interval = this._canvasDetails.handle.autoExpand.accFactorInterval;
    var adjustedAccFactor = isLeft ? 1 / accFactor : accFactor;
    if (accFactor + interval < accFactorMax)
      accFactor += interval;
    this._canvasDetails.handle.autoExpand.accFactor = accFactor;
    return tx * adjustedAccFactor;
  },

  _clearCanvas: function ls_clearCanvas() {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },

  /**
   * Map absolution X and Y to canvas' X and Y.
   * Note this should only be used when user want to draw something
   * follow the user's input. If the canvans need adjust its position,
   * the absolute coordinates should be used.
   *
   * @param {number} |x|
   * @param {number} |y|
   * @return {[number]} Array of single pair of X and Y
   * @this {LockScreen}
   */
  _mapCoord: function ls_mapCoord(x, y) {
    var cw = this.canvas.width;
    var ch = this.canvas.height;

    return [cw * x / window.innerWidth,
            ch * y / window.innerHeight];
  },

  /**
   * Extend the handle to one end of the slide.
   * This would help user to be apt to to drag to one of the ends.
   * The |tx| is necessary to detect which side should be the end.
   *
   * @param {number} |tx| The absolute horizontal position of the finger.
   * @this {LockScreen}
   */
  _extendHandle: function ls_extendHandle(tx) {

    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    var center = {'x': canvas.width >> 1,
                  'y': canvas.height >> 1};
    // In fact, we don't care Y, so set it as 0.
    var offset = this._mapCoord(tx, 0)[0];
  },

  /**
   * Bounce the handle back from the |tx|.
   *
   * @param {number} |tx| The absolute horizontal position of the finger.
   * @param {Function()} |cb| (Optional) Callback. Will be executed after
   * the animation ended.
   *
   * @this {LockScreen}
   */
  _bounceBack: function ls_bounceBack(tx, cb) {

    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');

    // Absolute coordinate of the canvas center.
    var duration = this._canvasDetails.handle.bounceBackTime;
    var center = this._canvasDetails.center;
    var nextTx = tx;
    var tsBegin = null;
    var mspf = 0; // ms per frame.
    var interval = 1; // How many pixels per frame should draw.
    // This means: draw from the circle center to one end on the circle itself.
    var isLeft = tx - center.x < 0;

    var drawIt = (function _drawIt(ts) {
      if (null === tsBegin)
        tsBegin = ts;

      if (ts - tsBegin < duration) {
        if (0 === mspf)
          mspf = ts - tsBegin;  // Not an accurate way to determine mspf.
        interval = Math.abs(center.x - tx) / (duration / mspf);
        nextTx = isLeft ? nextTx + interval : nextTx - interval;
        if ((isLeft && nextTx < center.x) || (!isLeft && nextTx >= center.x)) {
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
  },

  /**
   * Draw the handle with its initial state (a transparent circle).
   *
   * @this {LockScreen}
   */
  _resetHandle: function ls_resetHandle() {
    this._canvasDetails.slidingColorful = false;
    this._canvasDetails.slidingColorGradientEnd = false;
    var canvas = this.canvas;
    var centerx = this._canvasDetails.center.x;
    this._drawSlideTo(centerx);
  },

  /**
   * Drag the slide to the specific position.
   * Need this because we need to show the arrows.
   *
   * @this {LockScreen}
   */
  _dragSlideTo: function ls_dragSlideTo(tx) {
    var center = this._canvasDetails.center;
    var offset = tx - center.x;
    var isLeft = offset < 0;

    if (this._canvasDetails.handle.maxWidth < Math.abs(offset)) {
      this._slideReachEnd = true;
      return;
    }
    this._slideReachEnd = false;

    if (isLeft) {
      this.slideLeft.style.transform = 'translateX(' + offset + 'px)';
    } else {
      this.slideRight.style.transform = 'translateX(' + offset + 'px)';
    }
  },
  /**
   * Draw the two arrows on the slide.
   * TODO
   *
   * @param {number} |tx| The absolute horizontal position of the target.
   * @this {LockScreen}
   */
  _drawArrowsTo: function ls_drawArrows(tx) {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    var radius = this._canvasDetails.handle.radius;
    var center = this._canvasDetails.center;
    var offset = tx - center.x;
    var isLeft = offset < 0;

    if (this._canvasDetails.handle.maxWidth < Math.abs(offset)) {
      this._slideReachEnd = true;
      return;
    }
    this._slideReachEnd = false;

    // The Y of arrows: need to put it from center to sink half of the arrow.
    if (isLeft) {
      ctx.drawImage(this._canvasDetails.arrows.left,
        tx - (this._canvasDetails.arrows.left.width << 1),
        this._canvasDetails.arrows.ldraw.y);  // XXX:<<1: OK but don't know why!
      ctx.drawImage(this._canvasDetails.arrows.right,
        this._canvasDetails.arrows.rdraw.x,
        this._canvasDetails.arrows.ldraw.y);

    } else {
      ctx.drawImage(this._canvasDetails.arrows.right,
        tx + this._canvasDetails.arrows.right.width,
        this._canvasDetails.arrows.rdraw.y);
      ctx.drawImage(this._canvasDetails.arrows.left,
        this._canvasDetails.arrows.ldraw.x,
        this._canvasDetails.arrows.ldraw.y);
    }
  },

  /**
   * Restore the arrow to the original position.
   * TODO
   *
   * @this {LockScreen}
   */
  _resetArrows: function ls_restoreArrows() {
    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    var center = this._canvasDetails.center;
    ctx.drawImage(this._canvasDetails.arrows.left,
        this._canvasDetails.arrows.ldraw.x,
        this._canvasDetails.arrows.ldraw.y);
    ctx.drawImage(this._canvasDetails.arrows.right,
        this._canvasDetails.arrows.rdraw.x,
        this._canvasDetails.arrows.rdraw.y);
  },

  /**
   * Extend the slide from its center to the specific position.
   *
   * @param {number} |tx| The absolute horizontal position of the target.
   * @this {LockScreen}
   */
  _drawSlideTo: function ls_drawSlideTo(tx) {

    var canvas = this.canvas;
    var ctx = canvas.getContext('2d');
    var maxWidth = this._canvasDetails.handle.maxWidth;

    var offset = tx;
    var radius = this._canvasDetails.handle.radius;
    var center = this._canvasDetails.center;

    // The width and height of the rectangle.
    var rw = offset - center.x;
    var urw = Math.abs(rw);

    if (this._canvasDetails.handle.maxWidth < urw) {
      offset = rw > 0 ? center.x + maxWidth : center.x - maxWidth;
    }

    // 1.5 ~ 0.5 is the right part of a circle.
    var startAngle = 1.5 * Math.PI;
    var endAngle = 0.5 * Math.PI;
    var fillAlpha = 0.0;
    var strokeStyle = 'white';
    const GRADIENT_LENGTH = 50;

    // If user move over 15px, fill the slide.
    if (urw > 15 && true !== this._canvasDetails.slidingColorful) {
      // The color should be gradient in this length, from the origin.
      // It would decide how long the color turning to the touched color.

      fillAlpha = (urw - 15) / GRADIENT_LENGTH;
      if (fillAlpha > 1.0) {
        fillAlpha = 1.0;
        this._canvasDetails.slidingColorGradientEnd = true;
      }

      // The border must disappear during the sliding,
      // so it's alpha would decrease to zero.
      var borderAlpha = 1.0 - fillAlpha;

      // From white to covered blue.
      strokeStyle = 'rgba(' + this._canvasDetails.handle.touchedColorStop +
        ',' + borderAlpha + ')';

      // It's colorful now.
      this._canvasDetails.slidingColorful = true;
    } else {

      // Has pass the stage of gradient color.
      if (true === this._canvasDetails.slidingColorGradientEnd) {
        fillAlpha = 1.0;
        var color = this._canvasDetails.handle.touchedColor;
      } else if (0 === urw) {  // Draw as the initial circle.
        fillAlpha = 0.0;
        var color = '255,255,255';
      } else {
        fillAlpha = (urw - 15) / GRADIENT_LENGTH;
        if (fillAlpha > 1.0) {
          fillAlpha = 1.0;
          this._canvasDetails.slidingColorGradientEnd = true;
        }
        var color = this._canvasDetails.handle.touchedColorStop;
      }
      var borderAlpha = 1.0 - fillAlpha;
      strokeStyle = 'rgba(' + color + ',' + borderAlpha + ')';
    }
    ctx.fillStyle = 'rgba(' + this._canvasDetails.handle.touchedColor +
      ',' + fillAlpha + ')';
    ctx.lineWidth = this._canvasDetails.handle.lineWidth;
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
  },

  /**
   * When user released the finger, bounce it back.
   *
   * @param {event} |evt| The touch event.
   * @this {LockScreen}
   */
  _onSlideEnd: function ls_onSlideEnd(evt) {
    var isLeft = this._touch.pageX - this._canvasDetails.center.x < 0;
    var bounceEnd = (function _bounceEnd() {
      this._clearCanvas();
      this._resetArrows();
      this._resetHandle();
    }).bind(this);

    if (false === this._slideReachEnd) {
      this._bounceBack(this._touch.pageX, bounceEnd);
    } else {
      this.handleIconClick(isLeft ?
        this.leftIcon : this.rightIcon);

      // Restore it only after screen changed.
      var appLaunchDelay = 400;
      setTimeout(bounceEnd, appLaunchDelay);
    }

    this._darkIcons();
    this._restoreSlide();
  },

  /**
   * Restore the left and right slide.
   *
   * @param {boolean} |instant| (Optional) true if restore it immediately
   * @this {LockScreen}
   */
  _restoreSlide: function(instant) {
    var bounceBackSec = '0.0s';
    if (!instant) {
      // The magic number: it's subtle to keep the arrows sync with the slide.
      bounceBackSec = (0.07 + this._canvasDetails.handle.bounceBackTime / 1000)
        .toString() + 's';
    }

    var tsEndLeft = (function(evt) {
      this.slideLeft.removeEventListener('transition', tsEndLeft);

      // Clear them all because we don't want to calc if the affecting slide is
      // left or right here.
      this.slideLeft.style.transition = '';
      this.slideRight.style.transition = '';
    }).bind(this);

    var tsEndRight = (function(evt) {
      this.slideRight.removeEventListener('transition', tsEndRight);
      this.slideRight.style.transition = '';
      this.slideLeft.style.transition = '';
    }).bind(this);

    this.slideLeft.style.transition = 'transform ease ' +
      bounceBackSec + ' 0s';
    this.slideRight.style.transition = 'transform ease ' +
      bounceBackSec + ' 0s';

    this.slideLeft.addEventListener('transitionend', tsEndLeft);
    this.slideRight.addEventListener('transitionend', tsEndRight);

    // Run it.
    this.slideLeft.style.transform = '';
    this.slideRight.style.transform = '';

    this._sliding = false;
    this._slideReachEnd = false;
  },

  /**
   * Return the mapping pixels according to the device pixel ratio.
   * This may need to be put int the shared/js.
   *
   * @param {number} |px|
   * @return {number}
   * @this {LockScreen}
   */
  _dpx: function ls_dpx(px) {
    return px * window.devicePixelRatio;
  },

  handleIconClick: function ls_handleIconClick(target) {
    var self = this;
    switch (target) {
      case this.areaCamera:
      case this.altCamera:
        var panelOrFullApp = function panelOrFullApp() {
          // If the passcode is enabled and it has a timeout which has passed
          // switch to secure camera
          if (self.passCodeEnabled && self._passCodeTimeoutCheck) {
            // Go to secure camera panel
            self.switchPanel('camera');
            return;
          }

          self.unlock(/* instant */ null, /* detail */ { areaCamera: true });

          var a = new MozActivity({
            name: 'record',
            data: {
              type: 'photos'
            }
          });
          a.onerror = function ls_activityError() {
            console.log('MozActivity: camera launch error.');
          };
        };

        panelOrFullApp();
        break;

      case this.areaUnlock:
        var passcodeOrUnlock = function passcodeOrUnlock() {
          if (!self.passCodeEnabled || !self._passCodeTimeoutCheck) {
            self.unlock();
          } else {
            self.switchPanel('passcode');
          }
        };
        passcodeOrUnlock();
        break;
    }
  },

  handlePassCodeInput: function ls_handlePassCodeInput(key) {
    switch (key) {
      case 'e': // 'E'mergency Call
        this.switchPanel('emergency-call');
        break;

      case 'c': // 'C'ancel
        this.switchPanel();
        break;

      case 'b': // 'B'ackspace for correction
        if (this.overlay.dataset.passcodeStatus)
          return;

        this.passCodeEntered =
          this.passCodeEntered.substr(0, this.passCodeEntered.length - 1);
        this.updatePassCodeUI();

        break;
      default:
        if (this.overlay.dataset.passcodeStatus)
          return;

        this.passCodeEntered += key;
        this.updatePassCodeUI();

        if (this.passCodeEntered.length === 4)
          this.checkPassCode();
        break;
    }
  },

  lockIfEnabled: function ls_lockIfEnabled(instant) {
    if (FtuLauncher && FtuLauncher.isFtuRunning()) {
      this.unlock(instant);
      return;
    }

    if (this.enabled) {
      this.lock(instant);
    } else {
      this.unlock(instant);
    }
  },

  unlock: function ls_unlock(instant, detail) {
    // This file is loaded before the Window Manager in order to intercept
    // hardware buttons events. As a result WindowManager is not defined when
    // the device is turned on and this file is loaded.
    var currentApp =
      'WindowManager' in window ? WindowManager.getDisplayedApp() : null;

    var currentFrame = null;

    if (currentApp) {
      currentFrame = WindowManager.getAppFrame(currentApp).firstChild;
      WindowManager.setOrientationForApp(currentApp);
    }

    var wasAlreadyUnlocked = !this.locked;
    this.locked = false;

    var repaintTimeout = 0;
    var nextPaint = (function() {
      clearTimeout(repaintTimeout);

      if (currentFrame)
        currentFrame.removeNextPaintListener(nextPaint);

      if (instant) {
        this.overlay.classList.add('no-transition');
        this.switchPanel();
      } else {
        this.overlay.classList.remove('no-transition');
      }

      this.mainScreen.classList.remove('locked');

      if (!wasAlreadyUnlocked) {
        // Any changes made to this,
        // also need to be reflected in apps/system/js/storage.js
        this.dispatchEvent('unlock', detail);
        this.writeSetting(false);

        if (instant)
          return;

        if (this.unlockSoundEnabled) {
          var unlockAudio = new Audio('./resources/sounds/unlock.ogg');
          unlockAudio.play();
        }
      }
    }).bind(this);

    if (currentFrame)
      currentFrame.addNextPaintListener(nextPaint);

    repaintTimeout = setTimeout(function ensureUnlock() {
      nextPaint();
    }, 200);

    this.mainScreen.focus();
    this.dispatchEvent('will-unlock');

    // The lockscreen will be hidden, stop refreshing the clock.
    this.clock.stop();
  },

  lock: function ls_lock(instant) {
    var wasAlreadyLocked = this.locked;
    this.locked = true;

    this.switchPanel();

    this.overlay.focus();
    if (instant)
      this.overlay.classList.add('no-transition');
    else
      this.overlay.classList.remove('no-transition');

    this.mainScreen.classList.add('locked');
    screen.mozLockOrientation(OrientationManager.defaultOrientation);

    if (!wasAlreadyLocked) {
      if (document.mozFullScreen)
        document.mozCancelFullScreen();

      // Any changes made to this,
      // also need to be reflected in apps/system/js/storage.js
      this.dispatchEvent('lock');
      this.writeSetting(true);
    }
  },

  loadPanel: function ls_loadPanel(panel, callback) {
    this._loadingPanel = true;
    switch (panel) {
      case 'passcode':
      case 'main':
        if (callback)
          setTimeout(callback);
        break;

      case 'emergency-call':
        // create the <iframe> and load the emergency call
        var frame = document.createElement('iframe');

        frame.src = './emergency-call/index.html';
        frame.onload = function emergencyCallLoaded() {
          if (callback)
            callback();
        };
        this.panelEmergencyCall.appendChild(frame);

        break;

      case 'camera':
        // create the <iframe> and load the camera
        var frame = document.createElement('iframe');

        frame.src = './camera/index.html';
        var mainScreen = this.mainScreen;
        frame.onload = function cameraLoaded() {
          mainScreen.classList.add('lockscreen-camera');
          if (callback)
            callback();
        };
        this.overlay.classList.remove('no-transition');
        this.camera.appendChild(frame);

        break;
    }
  },

  unloadPanel: function ls_unloadPanel(panel, toPanel, callback) {
    switch (panel) {
      case 'passcode':
        // Reset passcode panel only if the status is not error
        if (this.overlay.dataset.passcodeStatus == 'error')
          break;

        delete this.overlay.dataset.passcodeStatus;
        this.passCodeEntered = '';
        this.updatePassCodeUI();
        break;

      case 'camera':
        this.mainScreen.classList.remove('lockscreen-camera');
        break;

      case 'emergency-call':
        var ecPanel = this.panelEmergencyCall;
        ecPanel.addEventListener('transitionend', function unloadPanel() {
          ecPanel.removeEventListener('transitionend', unloadPanel);
          ecPanel.removeChild(ecPanel.firstElementChild);
        });
        break;

      case 'main':
      default:
        var self = this;
        var unload = function unload() {
          self.overlay.classList.remove('triggered');
          clearTimeout(self.triggeredTimeoutId);
        };

        if (toPanel !== 'camera') {
          unload();
          break;
        }

        this.overlay.addEventListener('transitionend',
          function ls_unloadDefaultPanel(evt) {
            if (evt.target !== this)
              return;

            self.overlay.removeEventListener('transitionend',
                                             ls_unloadDefaultPanel);
            unload();
          }
        );

        break;
    }

    if (callback)
      setTimeout(callback);
  },

  /**
   * Switch the panel to the target type.
   * Will actually call the load and unload panel function.
   *
   * @param {PanelType} panel Could be 'camera', 'passcode', 'emergency-call' or
   *                          undefined. Undefined means the main panel.
   * @this
   */
  switchPanel: function ls_switchPanel(panel) {
    if (this._switchingPanel) {
      return;
    }

    panel = panel || 'main';
    var overlay = this.overlay;
    var currentPanel = overlay.dataset.panel;

    if (currentPanel && currentPanel === panel) {
      return;
    }

    var self = this;

    this._switchingPanel = true;
    this.loadPanel(panel, function panelLoaded() {
      self.unloadPanel(overlay.dataset.panel, panel,
        function panelUnloaded() {
          self.dispatchEvent('lockpanelchange', { 'panel': panel });

          overlay.dataset.panel = panel;
          self._switchingPanel = false;
        });
    });
  },

  refreshClock: function ls_refreshClock(now) {
    if (!this.locked)
      return;

    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = _('shortTimeFormat');
    var dateFormat = _('longDateFormat');
    var time = f.localeFormat(now, timeFormat);
    this.clockNumbers.textContent = time.match(/([012]?\d).[0-5]\d/g);
    this.clockMeridiem.textContent = (time.match(/AM|PM/i) || []).join('');
    this.date.textContent = f.localeFormat(now, dateFormat);
  },

  updateConnState: function ls_updateConnState() {

    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    var conn = window.navigator.mozMobileConnection ||
      window.navigator.mozMobileConnections &&
        window.navigator.mozMobileConnections[0];

    if (!conn)
      return;

    if (!IccHelper.enabled)
      return;

    navigator.mozL10n.ready(function() {
      var connstateLine1 = this.connstate.firstElementChild;
      var connstateLine2 = this.connstate.lastElementChild;
      var _ = navigator.mozL10n.get;

      var updateConnstateLine1 = function updateConnstateLine1(l10nId) {
        connstateLine1.dataset.l10nId = l10nId;
        connstateLine1.textContent = _(l10nId) || '';
      };

      var self = this;
      var updateConnstateLine2 = function updateConnstateLine2(l10nId) {
        if (l10nId) {
          self.connstate.classList.add('twolines');
          connstateLine2.dataset.l10nId = l10nId;
          connstateLine2.textContent = _(l10nId) || '';
        } else {
          self.connstate.classList.remove('twolines');
          delete(connstateLine2.dataset.l10nId);
          connstateLine2.textContent = '';
        }
      };

      // Reset line 2
      updateConnstateLine2();

      if (this.airplaneMode) {
        updateConnstateLine1('airplaneMode');
        return;
      }

      var voice = conn.voice;

      // Possible value of voice.state are:
      // 'notSearching', 'searching', 'denied', 'registered',
      // where the latter three mean the phone is trying to grab the network.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=777057
      if ('state' in voice && voice.state == 'notSearching') {
        updateConnstateLine1('noNetwork');
        return;
      }

      if (!voice.connected && !voice.emergencyCallsOnly) {
        // "Searching"
        // voice.state can be any of the latter three values.
        // (it's possible that the phone is briefly 'registered'
        // but not yet connected.)
        updateConnstateLine1('searching');
        return;
      }

      if (voice.emergencyCallsOnly) {
        updateConnstateLine1('emergencyCallsOnly');

        switch (IccHelper.cardState) {
          case 'unknown':
            updateConnstateLine2('emergencyCallsOnly-unknownSIMState');
            break;

          case 'absent':
            updateConnstateLine2('emergencyCallsOnly-noSIM');
            break;

          case 'pinRequired':
            updateConnstateLine2('emergencyCallsOnly-pinRequired');
            break;

          case 'pukRequired':
            updateConnstateLine2('emergencyCallsOnly-pukRequired');
            break;

          case 'networkLocked':
            updateConnstateLine2('emergencyCallsOnly-networkLocked');
            break;

          case 'serviceProviderLocked':
            updateConnstateLine2('emergencyCallsOnly-serviceProviderLocked');
            break;

          case 'corporateLocked':
            updateConnstateLine2('emergencyCallsOnly-corporateLocked');
            break;

          default:
            updateConnstateLine2();
            break;
        }
        return;
      }

      var operatorInfos = MobileOperator.userFacingInfo(conn);
      var is2G = this.NETWORKS_2G.some(function checkConnectionType(elem) {
        return (conn.voice.type == elem);
      });
      if (this.cellbroadcastLabel && is2G) {
        self.connstate.classList.add('twolines');
        connstateLine2.textContent = this.cellbroadcastLabel;
      } else if (operatorInfos.carrier) {
        self.connstate.classList.add('twolines');
        connstateLine2.textContent = operatorInfos.carrier + ' ' +
          operatorInfos.region;
      }

      var operator = operatorInfos.operator;

      if (voice.roaming) {
        var l10nArgs = { operator: operator };
        connstateLine1.dataset.l10nId = 'roaming';
        connstateLine1.dataset.l10nArgs = JSON.stringify(l10nArgs);
        connstateLine1.textContent = _('roaming', l10nArgs);

        return;
      }

      delete connstateLine1.dataset.l10nId;
      connstateLine1.textContent = operator;
    }.bind(this));
  },

  updatePassCodeUI: function lockscreen_updatePassCodeUI() {
    var overlay = this.overlay;

    if (overlay.dataset.passcodeStatus)
      return;
    if (this.passCodeEntered) {
      overlay.classList.add('passcode-entered');
    } else {
      overlay.classList.remove('passcode-entered');
    }
    var i = 4;
    while (i--) {
      var span = this.passcodeCode.childNodes[i];
      if (this.passCodeEntered.length > i) {
        span.dataset.dot = true;
      } else {
        delete span.dataset.dot;
      }
    }
  },

  checkPassCode: function lockscreen_checkPassCode() {
    if (this.passCodeEntered === this.passCode) {
      var self = this;
      this.overlay.dataset.passcodeStatus = 'success';
      this.passCodeError = 0;
      this.kPassCodeErrorTimeout = 500;
      this.kPassCodeErrorCounter = 0;

      var transitionend = function() {
        self.passcodeCode.removeEventListener('transitionend', transitionend);
        self.unlock();
      };
      this.passcodeCode.addEventListener('transitionend', transitionend);
    } else {
      this.overlay.dataset.passcodeStatus = 'error';
      this.kPassCodeErrorCounter++;
      //double delay if >5 failed attempts
      if (this.kPassCodeErrorCounter > 5) {
        this.kPassCodeErrorTimeout = 2 * this.kPassCodeErrorTimeout;
      }
      if ('vibrate' in navigator)
        navigator.vibrate([50, 50, 50]);

      var self = this;
      setTimeout(function error() {
        delete self.overlay.dataset.passcodeStatus;
        self.passCodeEntered = '';
        self.updatePassCodeUI();
      }, this.kPassCodeErrorTimeout);
    }
  },

  updateBackground: function ls_updateBackground(value) {
    var panels = document.querySelectorAll('.lockscreen-panel');
    var url = 'url(' + value + ')';
    for (var i = 0; i < panels.length; i++) {
      panels[i].style.backgroundImage = url;
    }
  },

  /**
   * To get all elements this component will use.
   * Note we do a name mapping here: DOM variables named like 'passcodePad'
   * are actually corresponding to the lowercases with hyphen one as
   * 'passcode-pad', then be prefixed with 'lookscreen'.
   *
   * @this
   */
  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['connstate', 'clock-numbers', 'clock-meridiem',
        'date', 'area', 'area-unlock', 'area-camera', 'icon-container',
        'area-handle', 'area-slide', 'media-container', 'passcode-code',
        'alt-camera', 'alt-camera-button', 'slide-handle',
        'passcode-pad', 'camera', 'accessibility-camera',
        'accessibility-unlock', 'panel-emergency-call', 'canvas'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('lockscreen-' + name);
    }).bind(this));

    this.overlay = document.getElementById('lockscreen');
    this.mainScreen = document.getElementById('screen');

    this.slideLeft = this.slideHandle.getElementsByTagName('div')[0];
    this.slideCenter = this.slideHandle.getElementsByTagName('div')[1];
    this.slideRight = this.slideHandle.getElementsByTagName('div')[2];

    var slcLeft = '#lockscreen-icon-container .lockscreen-icon-left';
    var slcRight = '#lockscreen-icon-container .lockscreen-icon-right';
    this.leftIcon = document.querySelector(slcLeft);
    this.rightIcon = document.querySelector(slcRight);
  },

  dispatchEvent: function ls_dispatchEvent(name, detail) {
    var evt = document.createEvent('CustomEvent');
    var evt = new CustomEvent(name, {
      'bubbles': true,
      'cancelable': true,
      // Set event detail if needed for the specific event 'name' (relevant for
      // passing which button triggered the event)
      'detail': detail
    });
    window.dispatchEvent(evt);
  },

  writeSetting: function ls_writeSetting(value) {
    if (!window.navigator.mozSettings)
      return;

    SettingsListener.getSettingsLock().set({
      'lockscreen.locked': value
    });
  },

  // Used by CellBroadcastSystem to notify the lockscreen of
  // any incoming CB messages that need to be displayed.
  setCellbroadcastLabel: function ls_setCellbroadcastLabel(label) {
    this.cellbroadcastLabel = label;
    this.updateConnState();
  }
};

// Bug 836195 - [Homescreen] Dock icons drop down in the UI
// consistently when using a lockcode and visiting camera
LockScreen.init();

navigator.mozL10n.ready(LockScreen.init.bind(LockScreen));

