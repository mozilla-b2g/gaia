'use strict';
/* global SettingsListener */
/* global Service */
/* global SheetsTransition */
/* global StackManager */
/* global TouchForwarder */

(function(exports) {

  const kEdgeIntertia = 250;
  const kEdgeThreshold = 0.3;
  const kEdgeAngleThreshold = Math.PI / 6;
  const kSignificant = 5 * window.devicePixelRatio;

  /**
   * Detects user gestures for moving between apps using edge gestures.
   * Gestures are listened for on the previous/next elements, which is
   * above the app container. Forwards events when they are not relevant to
   * the app iframe.
   * @class EdgeSwipeDetector
   */
  function EdgeSwipeDetector() {}

  EdgeSwipeDetector.prototype = {
    previous: document.getElementById('left-panel'),
    next: document.getElementById('right-panel'),
    screen: document.getElementById('screen'),

    _touchForwarder: null,

    /**
     * Starts EdgeSwipeDetector and begins listening for events.
     * @memberof EdgeSwipeDetector.prototype
     */
    start: function esd_init() {
      window.addEventListener('homescreenopened', this);
      window.addEventListener('appopened', this);
      window.addEventListener('cardviewclosed', this);
      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('updatepromptshown', this);
      window.addEventListener('updateprompthidden', this);
      window.addEventListener('installpromptshown', this);
      window.addEventListener('installprompthidden', this);
      window.addEventListener('shrinking-start', this);
      window.addEventListener('shrinking-stop', this);
      window.addEventListener('hierarchychanged', this);
      window.addEventListener('hierarchytopmostwindowchanged', this);

      ['touchstart', 'touchmove', 'touchend',
       'mousedown', 'mousemove', 'mouseup'].forEach(function(e) {
        this.previous.addEventListener(e, this);
        this.next.addEventListener(e, this);
      }, this);
      this._touchForwarder = new TouchForwarder();

      SettingsListener.observe('edgesgesture.enabled', false,
                               this.settingUpdate.bind(this));
      SettingsListener.observe('edgesgesture.debug', false,
                               this.debugUpdate.bind(this));
    },

    /**
     * Whether or not the setting is enabled.
     * @memberof EdgeSwipeDetector.prototype
     */
    _settingEnabled: false,

    /**
     * Called when the edgesgesture.enabled setting is changed.
     * @memberof EdgeSwipeDetector.prototype
     */
    settingUpdate: function esd_settingUpdate(enabled) {
      this._settingEnabled = enabled;
      this._updateEnabled();
    },

    /**
     * Called when the edgesgesture.debug setting is changed.
     * @memberof EdgeSwipeDetector.prototype
     */
    debugUpdate: function esd_debugUpdate(enabled) {
      this.screen.classList.toggle('edges-debug', enabled);
    },

    _lifecycleEnabled: false,

    get lifecycleEnabled() {
      return this._lifecycleEnabled;
    },
    set lifecycleEnabled(enable) {
      this._lifecycleEnabled = enable;
      this._updateEnabled();
    },

    /**
     * General event handler.
     * @param {Object} e
     * @memberof EdgeSwipeDetector.prototype
     */
    handleEvent: function esd_handleEvent(e) {
      switch (e.type) {
        case 'hierarchychanged':
        case 'hierarchytopmostwindowchanged':
          // XXX: Use this.appWindowManager instead if
          // we become part of appWindowManager submodules.
          // i.e., Service.query('getTopMostUI') === this.parent
          if (Service.query('getTopMostUI') &&
              Service.query('getTopMostUI').name === 'AppWindowManager') {
            if (Service.query('getTopMostWindow') &&
                !Service.query('getTopMostWindow').isHomescreen &&
                !Service.query('isFtuRunning')) {
              this.lifecycleEnabled = true;
            } else {
              this.lifecycleEnabled = false;
            }
          } else {
            this.lifecycleEnabled = false;
          }
          break;
        case 'mousedown':
        case 'mousemove':
        case 'mouseup':
          // Preventing gecko reflows until
          // https://bugzilla.mozilla.org/show_bug.cgi?id=1005815 lands
          e.preventDefault();
          break;
        case 'touchstart':
          e.preventDefault();
          this._touchStart(e);
          break;
        case 'touchmove':
          e.preventDefault();
          this._touchMove(e);
          break;
        case 'touchend':
          e.preventDefault();
          this._touchEnd(e);
          break;
        case 'appopened':
          var app = e.detail;
          if (!app.stayBackground) {
            this.lifecycleEnabled =
              (app.origin !== Service.query('getFtuOrigin'));
          }
          break;
        case 'shrinking-start':
          this.lifecycleEnabled = false;
          break;
        case 'cardviewclosed':
          if (e.detail && e.detail.newStackPosition) {
            this.lifecycleEnabled = true;
          }
          break;
        case 'mozChromeEvent':
            if (e.detail.type !== 'accessibility-control') {
              break;
            }
            var details = JSON.parse(e.detail.details);
            switch (details.eventType) {
              case 'edge-swipe-right':
                this.autoSwipe('ltr');
                break;
              case 'edge-swipe-left':
                this.autoSwipe('rtl');
                break;
            }
            break;
        case 'updatepromptshown':
        case 'installpromptshown':
          this.lifecycleEnabled = false;
          break;
        // XXX: Move install/update dialog into system dialog
        // and then we could remove this.
        case 'updateprompthidden':
        case 'installprompthidden':
        case 'shrinking-stop':
          if (Service.query('getTopMostWindow') &&
              !Service.query('getTopMostWindow').isHomescreen) {
            this.lifecycleEnabled = true;
          }
          break;
      }
    },

    /**
     * Enables or disables the previous/next triggers.
     * @memberof EdgeSwipeDetector.prototype
     */
    _updateEnabled: function esd_updateEnabled() {
      var enabled = this._lifecycleEnabled && this._settingEnabled;
      this.previous.classList.toggle('disabled', !enabled);
      this.next.classList.toggle('disabled', !enabled);

      if (!enabled && this._touchStartEvt) {
        this._touchStartEvt = null; // we ignore the rest of the gesture
        SheetsTransition.snapInPlace();
      }
    },

    _touchStartEvt: null,
    _startDate: null,
    _startX: null,
    _deltaX: null,
    _startY: null,
    _deltaY: null,
    _forwardTimeout: null,

    _progress: null,
    _winWidth: null,
    _beganTransition: null,
    _moved: null,
    _direction: null,
    _forwarding: null,
    _redispatching: null,

    _touchStart: function esd_touchStart(e) {
      this._winWidth = window.innerWidth;
      this._direction = (e.target == this.next) ? 'rtl' : 'ltr';
      this._touchStartEvt = e;
      this._startDate = Date.now();

      var iframe = StackManager.getCurrent().getTopMostWindow().iframe;
      this._touchForwarder.destination = iframe;

      var touch = e.changedTouches[0];
      this._startX = touch.clientX;
      this._startY = touch.clientY;
      this._deltaX = 0;
      this._deltaY = 0;
      this._beganTransition = false;
      this._moved = false;
      this._forwarding = false;
      this._redispatching = false;

      this._clearForwardTimeout();
      this._forwardTimeout = setTimeout((function longTouch() {
        // Didn't move for a while after the touchstart,
        // this isn't a swipe
        this._forwardTimeout = null;
        this._forwarding = true;
        this._forward(this._touchStartEvt);
      }).bind(this), 300);
    },

    _touchMove: function esd_touchMove(e) {
      if (!this._touchStartEvt) {
        return;
      }
      var touch = e.touches[0];
      this._updateProgress(touch);
      var delta = Math.max(Math.abs(this._deltaX), Math.abs(this._deltaY));

      // If we already started forwarding we just continue
      if (this._forwarding) {
        this._forward(e);
        return;
      }

      // If it's a pinch gesture we start forwarding
      if (e.touches.length > 1) {
        this._startForwarding(e);
        return;
      }

      // If the gesture isn't horizontal we start forwarding
      if (delta > kSignificant && !this._horizontalGesture()) {
        this._startForwarding(e);
        return;
      }

      // Preparing to move the sheets...
      if (!this._beganTransition) {
        SheetsTransition.begin(this._direction);
        this._clearForwardTimeout();
        this._beganTransition = true;
      }

      // after a small threshold
      if ((this._deltaX < kSignificant || this._outsideApp(e)) &&
          !this._moved) {
        return;
      }

      SheetsTransition.moveInDirection(this._direction, this._progress);
      this._moved = true;
    },

    _touchEnd: function esd_touchEnd(e) {
      if (!this._touchStartEvt) {
        return;
      }

      // Edge gestures are never multi-touch
      var touches = e.touches.length + e.changedTouches.length;
      if (touches > 1 && !this._forwarding) {
        this._touchStartEvt = null;
        SheetsTransition.snapInPlace();
        return;
      }

      var touch = e.changedTouches[0];
      this._updateProgress(touch);

      if (this._forwarding) {
        this._forward(e);
      } else if ((this._deltaX < kSignificant) &&
                 (this._deltaY < kSignificant)) {
        setTimeout(function(self, touchstart, touchend) {
          self._forward(touchstart);
          setTimeout(function() {
            self._forward(touchend);
          }, 100);
        }, 0, this, this._touchStartEvt, e);
        this._forwarding = true;
      }

      this._clearForwardTimeout();

      var deltaT = Date.now() - this._startDate;
      var speed = this._progress / deltaT; // progress / ms
      var inertia = speed * kEdgeIntertia; // ms of intertia
      var adjustedProgress = (this._progress + inertia);

      if (adjustedProgress < kEdgeThreshold || this._forwarding) {
        SheetsTransition.snapInPlace();
        return;
      }

      var direction = this._direction;
      if (direction == 'ltr') {
        SheetsTransition.snapBack(speed);
        StackManager.goPrev();
      } else {
        SheetsTransition.snapForward(speed);
        StackManager.goNext();
      }
    },

    _updateProgress: function esd_updateProgress(touch) {
      this._deltaX = touch.clientX - this._startX;
      this._deltaY = touch.clientY - this._startY;

      if (this._direction == 'rtl') {
        this._deltaX *= -1;
        this._deltaY *= -1;
      }
      this._progress = this._deltaX / this._winWidth;
    },

    _horizontalGesture: function esd_horizontalGesture() {
      var angle = Math.atan2(this._deltaX, this._deltaY);
      var horizontalAngle = Math.PI / 2;

      return Math.abs(angle - horizontalAngle) < kEdgeAngleThreshold;
    },

    _clearForwardTimeout: function esd_clearForwardTimeout() {
      if (this._forwardTimeout) {
        clearTimeout(this._forwardTimeout);
        this._forwardTimeout = null;
      }
    },

    _startForwarding: function esd_startForwarding(e) {
      this._clearForwardTimeout();
      this._forwarding = true;
      this._forward(this._touchStartEvt);

      this._forward(e);

      if (this._beganTransition) {
        SheetsTransition.snapInPlace();
      }
    },

    /**
     * Once we identify the gesture as something other than an horizontal
     * swipe we replay and start forwarding the touch events:
     *
     * * either sending them to the current app through the sendTouchEvent
     *   mozbrowser API
     * * or redispatching the events to the system app if they were outside
     *   the app frame
     *
     * When redispatching, since we don't know on which element they should be
     * dispatched (the target is always the gesture-panel) we send a custom
     * event instead.
     * @memberof EdgeSwipeDetector.prototype
     */
    _forward: function esd_forward(e) {
      if (this._moved) {
        return;
      }

      // We continue dispatching/forwarding where we started.
      if (this._outsideApp(e) || this._redispatching) {
        window.dispatchEvent(new CustomEvent('edge-touch-redispatch', {
          bubbles: true,
          detail: e
        }));
        this._redispatching = true;
      } else {
        this._touchForwarder.forward(e);
      }
    },

    /**
     * Detects whether or not a touch event is outside of an app container.
     * @param {Object} e The relevant touch event.
     * @memberof EdgeSwipeDetector.prototype
     */
    _outsideApp: function esd_outsideApp(e) {
      var touch = (e.type === 'touchend') ? e.changedTouches[0] : e.touches[0];

      var x = touch.pageX;
      var y = touch.pageY;

      // In fullscreen_layout mode the app frame will always be fullscreen
      // but we still want to redispatch touch events to the "overlayed"
      // software home button
      var softwareButtonOverlayed =
        Service.query('getTopMostWindow') &&
        Service.query('getTopMostWindow').isFullScreenLayout();
      var width = Service.query('LayoutManager.width');
      var height = Service.query('LayoutManager.height');
      if (softwareButtonOverlayed) {
        var sbWidth = Service.query('SoftwareButtonManager.width');
        var sbHeight = Service.query('SoftwareButtonManager.height');
        return x > (width - sbWidth) || y > (height - sbHeight);
      }
      return (x > width || y > height);
    },

    /**
     * Swipes a page when we receive an event from gecko.
     * @param {String} direction
     * @memberof EdgeSwipeDetector.prototype
     */
    autoSwipe: function esd_autoSwipe(direction) {
      if (!this._lifecycleEnabled) {
        return;
      }
      SheetsTransition.begin(direction);
      if (direction === 'ltr') {
        SheetsTransition.snapBack(1);
        StackManager.goPrev();
      } else {
        SheetsTransition.snapForward(1);
        StackManager.goNext();
      }
    }
  };

  exports.EdgeSwipeDetector = EdgeSwipeDetector;

}(window));

