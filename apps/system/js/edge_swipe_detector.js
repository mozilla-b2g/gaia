'use strict';

const kEdgeIntertia = 250;
const kEdgeThreshold = 0.3;

var EdgeSwipeDetector = {
  previous: document.getElementById('left-panel'),
  next: document.getElementById('right-panel'),
  screen: document.getElementById('screen'),

  _touchForwarder: null,

  init: function esd_init() {
    window.addEventListener('homescreenopened', this);
    window.addEventListener('appopen', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('cardviewclosed', this);

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

  _settingEnabled: false,

  settingUpdate: function esd_settingUpdate(enabled) {
    this._settingEnabled = enabled;
    this._updateEnabled();
  },

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

  handleEvent: function esd_handleEvent(e) {
    switch (e.type) {
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
      case 'appopen':
        var app = e.detail;
        this.lifecycleEnabled = (app.origin !== FtuLauncher.getFtuOrigin());
        break;
      case 'homescreenopened':
        this.lifecycleEnabled = false;
        break;
      case 'launchapp':
        if (!e.detail.stayBackground) {
          this.lifecycleEnabled = true;
        }
        break;
      case 'cardviewclosed':
        if (e.detail && e.detail.newStackPosition) {
          this.lifecycleEnabled = true;
        }
        break;
    }
  },

  _updateEnabled: function esd_updateEnabled() {
    var enabled = this._lifecycleEnabled && this._settingEnabled;
    this.previous.classList.toggle('disabled', !enabled);
    this.next.classList.toggle('disabled', !enabled);
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
  _direction: null,
  _forwarding: null,

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
    this._forwarding = false;

    this._clearForwardTimeout();
    this._forwardTimeout = setTimeout((function longTouch() {
      // Didn't move for a while after the touchstart,
      // this isn't a swipe
      this._forwardTimeout = null;
      this._forwarding = true;
      this._touchForwarder.forward(this._touchStartEvt);
    }).bind(this), 300);

    SheetsTransition.begin(this._direction);
  },

  _touchMove: function esd_touchMove(e) {
    var touch = e.touches[0];
    this._updateProgress(touch);

    if (e.touches.length > 1 && !this._forwarding) {
      this._startForwarding(e);
      return;
    }

    if (this._forwarding) {
      this._touchForwarder.forward(e);
      return;
    }

    // Does it quack like a vertical swipe?
    if ((this._deltaX * 2 < this._deltaY) &&
        (this._deltaY > 5)) {
      this._startForwarding(e);
    }

    if (this._deltaX < 5) {
      return;
    }

    this._clearForwardTimeout();

    SheetsTransition.moveInDirection(this._direction, this._progress);
  },

  _touchEnd: function esd_touchEnd(e) {
    var touch = e.changedTouches[0];
    this._updateProgress(touch);

    if (this._forwarding) {
      this._touchForwarder.forward(e);
    } else if ((this._deltaX < 5) && (this._deltaY < 5)) {
      setTimeout(function(self, touchstart, touchend) {
        self._touchForwarder.forward(touchstart);
        self._touchForwarder.forward(touchend);
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
    this._deltaX = Math.abs(touch.clientX - this._startX);
    this._deltaY = Math.abs(touch.clientY - this._startY);
    this._progress = this._deltaX / this._winWidth;
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
    this._touchForwarder.forward(this._touchStartEvt);

    this._touchForwarder.forward(e);

    SheetsTransition.snapInPlace();
  }
};

EdgeSwipeDetector.init();
