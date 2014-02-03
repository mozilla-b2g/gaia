'use strict';

var EdgeSwipeDetector = {
  previous: document.getElementById('left-panel'),
  next: document.getElementById('right-panel'),
  screen: document.getElementById('screen'),

  _touchForwarder: null,

  init: function esd_init() {
    window.addEventListener('homescreenopening', this);
    window.addEventListener('appopen', this);
    window.addEventListener('launchapp', this);

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

  handleEvent: function esd_handleEvent(e) {
    switch (e.type) {
      case 'mousedown':
      case 'mousemove':
      case 'mouseup':
        // Preventing gecko reflows
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
        this.screen.classList.add('edges');
        break;
      case 'homescreenopening':
        this.screen.classList.remove('edges');
        this._lifecycleEnabled = false;
        this._updateEnabled();
        break;
      case 'launchapp':
        if (!e.detail.stayBackground) {
          this._lifecycleEnabled = true;
          this._updateEnabled();
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

    var iframe = StackManager.getCurrent().iframe;
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

    if (this._forwarding) {
      this._touchForwarder.forward(e);
      return;
    }

    this._checkIfSwiping(e);

    if (this._deltaX > 5) {
      this._clearForwardTimeout();
      SheetsTransition.moveInDirection(this._direction, this._progress);
    }
  },

  _touchEnd: function esd_touchEnd(e) {
    var touch = e.changedTouches[0];
    this._updateProgress(touch);

    if (this._forwarding) {
      this._touchForwarder.forward(e);
    } else if ((this._deltaX < 5) && (this._deltaY < 5)) {
      this._touchForwarder.forward(this._touchStartEvt);
      this._touchForwarder.forward(e);
      this._forwarding = true;
    }

    this._clearForwardTimeout();

    var deltaT = Date.now() - this._startDate;
    var speed = this._progress / deltaT; // progress / ms
    var inertia = speed * 120; // 120 ms of intertia
    var adjustedProgress = (this._progress + inertia);

    if (adjustedProgress < 0.33 || this._forwarding) {
      SheetsTransition.snapInPlace();
      SheetsTransition.end();
      return;
    }

    var direction = this._direction;
    if (direction == 'ltr') {
      SheetsTransition.snapBack(speed);
    } else {
      SheetsTransition.snapForward(speed);
    }

    SheetsTransition.end(function afterTransition() {
      if (direction == 'ltr') {
        StackManager.goPrev();
      } else {
        StackManager.goNext();
      }
    });
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

  _checkIfSwiping: function esd_checkIfSwiping(e) {
    if ((this._deltaX * 2 < this._deltaY) &&
        (this._deltaY > 5)) {
      this._clearForwardTimeout();
      this._forwarding = true;
      this._touchForwarder.forward(this._touchStartEvt);
      this._touchForwarder.forward(e);

      SheetsTransition.snapInPlace();
      SheetsTransition.end();
    }
  }
};

EdgeSwipeDetector.init();
