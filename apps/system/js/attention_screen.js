/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var AttentionScreen = {
  get mainScreen() {
    delete this.mainScreen;
    return this.mainScreen = document.getElementById('screen');
  },

  get attentionScreen() {
    delete this.attentionScreen;
    return this.attentionScreen = document.getElementById('attention-screen');
  },

  get bar() {
    delete this.bar;
    return this.bar = document.getElementById('attention-bar');
  },

  isVisible: function as_isVisible() {
    return this.attentionScreen.classList.contains('displayed');
  },

  isFullyVisible: function as_isFullyVisible() {
    return (this.isVisible() &&
            !this.mainScreen.classList.contains('active-statusbar'));
  },

  init: function as_init() {
    window.addEventListener('mozbrowseropenwindow', this.open.bind(this), true);

    window.addEventListener('mozbrowserclose', this.close.bind(this), true);
    window.addEventListener('mozbrowsererror', this.close.bind(this), true);

    window.addEventListener('keyboardchange', this.resize.bind(this), true);
    window.addEventListener('keyboardhide', this.resize.bind(this), true);

    this.bar.addEventListener('click', this.show.bind(this));

    window.addEventListener('home', this.hide.bind(this));
    window.addEventListener('holdhome', this.hide.bind(this));
    window.addEventListener('appwillopen', this.appOpenHandler.bind(this));
    window.addEventListener('emergencyalert', this.hide.bind(this));

    window.addEventListener('will-unlock', this.screenUnlocked.bind(this));
  },

  resize: function as_resize(evt) {
    if (evt.type == 'keyboardchange') {
      if (!this.isFullyVisible())
        return;

      var keyboardHeight = KeyboardManager.getHeight();
      this.attentionScreen.style.height =
        window.innerHeight - keyboardHeight + 'px';
    } else if (evt.type == 'keyboardhide') {
      // We still need to reset the height property even when the attention
      // screen is not fully visible, or it will overrides the height
      // we defined with #attention-screen.status-mode
      this.attentionScreen.style.height = '';
    }
  },

  toggle: function as_toggle(evt) {
    if (evt.detail.height <= 40) {
      evt.target.dataset.appRequestedSmallSize = true;
      this.hide();
    } else {
      this.show();
    }
  },

  appOpenHandler: function as_appHandler(evt) {
    // If the user presses the home button we will still hide the attention
    // screen. But in the case of an app crash we'll keep it fully open
    if (!evt.detail.isHomescreen) {
      this.hide();
    }
  },

  // show the attention screen overlay with newly created frame
  open: function as_open(evt) {
    if (evt.detail.features != 'attention')
      return;

    // stopPropagation means we are not allowing
    // Popup Manager to handle this event
    evt.stopPropagation();

    // Canceling any full screen web content
    if (document.mozFullScreen)
      document.mozCancelFullScreen();

    // Check if the app has the permission to open attention screens
    var manifestURL = evt.target.getAttribute('mozapp');
    var app = Applications.getByManifestURL(manifestURL);

    if (!app || !this._hasAttentionPermission(app))
      return;

    // Hide sleep menu/list menu if it is shown now
    ActionMenu.hide();
    SleepMenu.hide();

    // We want the user attention, so we need to turn the screen on
    // if it's off. The lockscreen will grab the focus when we do that
    // so we need to do it before adding the new iframe to the dom
    if (!ScreenManager.screenEnabled)
      ScreenManager.turnScreenOn();

    var attentionFrame = evt.detail.frameElement;
    attentionFrame.dataset.frameType = 'attention';
    attentionFrame.dataset.frameName = evt.detail.name;
    attentionFrame.dataset.frameOrigin = evt.target.dataset.frameOrigin;
    attentionFrame.dataset.manifestURL = manifestURL;
    attentionFrame.addEventListener('mozbrowserresize', this.toggle.bind(this));

    // We would like to put the dialer call screen on top of all other
    // attention screens by ensure it is the last iframe in the DOM tree
    if (this._hasTelephonyPermission(app)) {
      this.attentionScreen.appendChild(attentionFrame);

      // This event is for SIM PIN lock module.
      // Because we don't need SIM PIN dialog during call
      // but the IccHelper cardstatechange event could
      // be invoked by airplane mode toggle before the call is established.
      this.dispatchEvent('callscreenwillopen');
    } else {
      this.attentionScreen.insertBefore(attentionFrame,
                                        this.bar.nextElementSibling);
    }

    this._updateAttentionFrameVisibility();

    // Make the overlay visible if we are not displayed yet.
    // alternatively, if the newly appended frame is the visible frame
    // and we are in the status bar mode, expend to full screen mode.
    if (!this.isVisible()) {
      // Attention screen now only support default orientation.
      screen.mozLockOrientation(ScreenLayout.defaultOrientation);

      this.attentionScreen.classList.add('displayed');
      this.mainScreen.classList.add('attention');
      this.dispatchEvent('attentionscreenshow', {
        origin: attentionFrame.dataset.frameOrigin
      });
    } else if (!this.isFullyVisible() &&
      this.attentionScreen.lastElementChild === attentionFrame) {
      this.show();
    }
  },

  // Make sure visibililty state of all attention screens are set correctly
  _updateAttentionFrameVisibility: function as_updateAtteFrameVisibility() {
    var frames = this.attentionScreen.querySelectorAll('iframe');
    var i = frames.length - 1;

    // In case someone call this function w/o checking for frame first
    if (i < 0)
      return;

    // set the last one in the DOM to visible
    // The setTimeout() and the closure is used to workaround
    // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
    setTimeout(function(frame) {
      frame.setVisible(true);
      frame.focus();
    }, 0, frames[i]);

    while (i--) {
      // The setTimeout() and the closure is used to workaround
      // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
      setTimeout(function(frame) {
        frame.setVisible(false);
        frame.blur();
      }, 0, frames[i]);
    }
  },

  // close the attention screen overlay
  close: function as_close(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'attention' ||
        (evt.type === 'mozbrowsererror' && evt.detail.type !== 'fatal'))
      return;

    // Check telephony permission before removing.
    var app = Applications.getByManifestURL(evt.target.dataset.manifestURL);
    if (app && this._hasTelephonyPermission(app)) {
      // This event is for SIM PIN lock module.
      // Because we don't need SIM PIN dialog during call
      // but the IccHelper cardstatechange event could
      // be invoked by airplane mode toggle before the call is established.
      this.dispatchEvent('callscreenwillclose');
    }

    // Remove the frame
    var origin = evt.target.dataset.frameOrigin;
    this.attentionScreen.removeChild(evt.target);

    // We've just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();

    // if there are other attention frames,
    // we need to update the visibility and show() the overlay.
    if (this.attentionScreen.querySelectorAll('iframe').length) {
      this._updateAttentionFrameVisibility();

      this.dispatchEvent('attentionscreenclose', { origin: origin });

      if (!this.isFullyVisible())
        this.show();

      return;
    }

    // There is no iframes left;
    // we should close the attention screen overlay.

    // If the the attention screen is closed during active-statusbar
    // mode, we would need to leave that mode.
    if (!this.isFullyVisible()) {
      this.mainScreen.classList.remove('active-statusbar');
      this.attentionScreen.classList.remove('status-mode');
      this.dispatchEvent('status-inactive',
        { origin: this.attentionScreen.lastElementChild.dataset.frameOrigin });
    }

    // Restore the orientation of current displayed app
    var currentApp = WindowManager.getDisplayedApp();
    if (currentApp)
      WindowManager.setOrientationForApp(currentApp);

    this.attentionScreen.classList.remove('displayed');
    this.mainScreen.classList.remove('attention');
    this.dispatchEvent('attentionscreenhide', { origin: origin });
  },

  // expend the attention screen overlay to full screen
  show: function as_show() {
    // Attention screen now only support default orientation.
    screen.mozLockOrientation(ScreenLayout.defaultOrientation);

    this.attentionScreen.lastElementChild.dataset.appRequestedSmallSize = false;

    // leaving "status-mode".
    this.attentionScreen.classList.remove('status-mode');
    // there shouldn't be a transition from "status-mode" to "active-statusbar"
    this.attentionScreen.style.transition = 'none';

    var self = this;
    setTimeout(function nextTick() {
      self.attentionScreen.style.transition = '';

      // leaving "active-statusbar" mode,
      // with a transform: translateY() slide down transition.
      self.mainScreen.classList.remove('active-statusbar');
      self.dispatchEvent('status-inactive', {
        origin: self.attentionScreen.lastElementChild.dataset.frameOrigin
      });
    });
  },

  // shrink the attention screen overlay to status bar
  // invoked when we get a "home" event
  hide: function as_hide() {
    if (!this.isFullyVisible())
      return;

    // Restore the orientation of current displayed app
    var currentApp = WindowManager.getDisplayedApp();

    if (currentApp)
      WindowManager.setOrientationForApp(currentApp);

    // entering "active-statusbar" mode,
    // with a transform: translateY() slide up transition.
    this.mainScreen.classList.add('active-statusbar');

    // The only way to hide attention screen is the home/holdhome event.
    // So we don't fire any origin information here.
    // The expected behavior is restore homescreen visibility to 'true'
    // in the Window Manager.
    this.dispatchEvent('status-active');

    var attentionScreen = this.attentionScreen;
    attentionScreen.addEventListener('transitionend', function trWait() {
      attentionScreen.removeEventListener('transitionend', trWait);

      // transition completed, entering "status-mode" (40px height iframe)
      attentionScreen.classList.add('status-mode');
    });
  },

  dispatchEvent: function as_dispatchEvent(name, detail) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, detail);
    window.dispatchEvent(evt);
  },

  // If an app with an active attention screen is switched to,
  // we would need to cover it with it's attention screen.
  // Invoked when displayedApp in Window Manager changes
  // XXX should be replaced with a call that listens to appwillopen
  // TBD: display the attention screen underneath other attention screens.
  showForOrigin: function as_showForOrigin(origin) {
    if (!this.isVisible() || this.isFullyVisible())
      return;

    var attentionFrame = this.attentionScreen.lastElementChild;
    // We don't want to reopen the attention screen when the app requested a
    // statusbar attention screen
    if (attentionFrame.dataset.appRequestedSmallSize) {
      return;
    }

    var frameOrigin = attentionFrame.dataset.frameOrigin;
    if (origin === frameOrigin) {
      this.show();
    }
  },

  screenUnlocked: function as_screenUnlocked() {
    // If the app behind the soon-to-be-unlocked lockscreen has an
    // attention screen we should display it
    var app = WindowManager.getCurrentDisplayedApp();
    this.showForOrigin(app.origin);
  },

  getAttentionScreenOrigins: function as_getAttentionScreenOrigins() {
    var attentionScreen = this.attentionScreen;
    var frames = this.attentionScreen.querySelectorAll('iframe');
    var attentiveApps = [];
    Array.prototype.forEach.call(frames, function pushFrame(frame) {
      attentiveApps.push(frame.dataset.frameOrigin);
    });
    return attentiveApps;
  },

  _hasAttentionPermission: function as_hasAttentionPermission(app) {
    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return false;

    var value = mozPerms.get('attention', app.manifestURL, app.origin, false);

    return (value === 'allow');
  },

  _hasTelephonyPermission: function as_hasAttentionPermission(app) {
    var mozPerms = navigator.mozPermissionSettings;
    if (!mozPerms)
      return false;

    var value = mozPerms.get('telephony', app.manifestURL, app.origin, false);

    return (value === 'allow');
  }
};

AttentionScreen.init();
