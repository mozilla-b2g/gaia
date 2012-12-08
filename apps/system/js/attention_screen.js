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
  },

  resize: function as_resize(evt) {
    if (!this.isFullyVisible())
      return;

    if (evt.type == 'keyboardchange') {
      this.attentionScreen.style.height =
        window.innerHeight - evt.detail.height + 'px';
    } else if (evt.type == 'keyboardhide') {
      this.attentionScreen.style.height = window.innerHeight + 'px';
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
    ListMenu.hide();
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

    // We would like to put the dialer call screen on top of all other
    // attention screens by ensure it is the last iframe in the DOM tree
    if (this._hasTelephonyPermission(app)) {
      this.attentionScreen.appendChild(attentionFrame);
    } else {
      this.attentionScreen.insertBefore(attentionFrame,
                                        this.bar.nextElementSibling);
    }

    this._updateAttentionFrameVisibility();

    // Make the overlay visible if we are not displayed yet.
    // alternatively, if the newly appended frame is the visible frame
    // and we are in the status bar mode, expend to full screen mode.
    if (!this.isVisible()) {
      this.attentionScreen.classList.add('displayed');
      this.mainScreen.classList.add('attention');
      this.dispatchEvent('attentionscreenshow');

      // If the current app != the app opening the screen it should get
      // a visibility change event
      var displayedOrigin = WindowManager.getDisplayedApp();
      var frameOrigin = attentionFrame.dataset.frameOrigin;
      if (displayedOrigin !== frameOrigin) {
        this._setAppFrameVisibility(displayedOrigin, false);
      }
    } else if (!this.isFullyVisible() &&
      this.attentionScreen.lastElementChild === attentionFrame) {
      this.show();
    }
  },

  _setAppFrameVisibility: function as_setAppFrameVisibility(origin, visible) {
    if (!origin)
      return;
    var frame = WindowManager.getAppFrame(origin);
    if (frame && 'setVisible' in frame) {
      frame.setVisible(visible);
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
    (function() {
      var frame = frames[i];
      setTimeout(function() { frame.setVisible(true); }, 0);
    })();

    while (i--) {
      // The setTimeout() and the closure is used to workaround
      // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
      (function() {
        var frame = frames[i];
        setTimeout(function() { frame.setVisible(false); }, 0);
      })();
    }
  },

  // close the attention screen overlay
  close: function as_close(evt) {
    if (!'frameType' in evt.target.dataset ||
        evt.target.dataset.frameType !== 'attention' ||
        (evt.type === 'mozbrowsererror' && evt.detail.type !== 'fatal'))
      return;

    // Ensuring the proper mozvisibility changed on the displayed app
    var displayedOrigin = WindowManager.getDisplayedApp();
    this._setAppFrameVisibility(displayedOrigin, true);

    // Remove the frame
    this.attentionScreen.removeChild(evt.target);

    // We've just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();

    // if there are other attention frames,
    // we need to update the visibility and show() the overlay.
    if (this.attentionScreen.querySelectorAll('iframe').length) {
      this._updateAttentionFrameVisibility();

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
      this.dispatchEvent('status-inactive');
    }

    this.attentionScreen.classList.remove('displayed');
    this.mainScreen.classList.remove('attention');
    this.dispatchEvent('attentionscreenhide');
  },

  // expend the attention screen overlay to full screen
  show: function as_show() {
    // leaving "status-mode".
    this.attentionScreen.classList.remove('status-mode');
    // there shouldn't be a transition from "status-mode" to "active-statusbar"
    this.attentionScreen.style.transition = 'none';

    // If the current app != the app opening the screen it should get
    // a visibility change event
    var attentionFrame = this.attentionScreen.lastElementChild;
    var displayedOrigin = WindowManager.getDisplayedApp();
    var frameOrigin = attentionFrame.dataset.frameOrigin;
    if (displayedOrigin !== frameOrigin) {
      this._setAppFrameVisibility(displayedOrigin, false);
    }

    var self = this;
    window.addEventListener('MozAfterPaint', function finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', finishAfterPaint);
      setTimeout(function nextLoop() {
        self.attentionScreen.style.transition = '';

        // leaving "active-statusbar" mode,
        // with a transform: translateY() slide down transition.
        self.mainScreen.classList.remove('active-statusbar');
        self.dispatchEvent('status-inactive');
      });
    });
  },

  // shrink the attention screen overlay to status bar
  // invoked when we get a "home" event
  hide: function as_hide() {
    // Doing nothing if the screen is already hiden
    // or in the lockscreen
    if (!this.isFullyVisible() || LockScreen.locked)
      return;

    this.dispatchEvent('status-active');

    // Ensuring the proper mozvisibility changed on the displayed app
    var displayedOrigin = WindowManager.getDisplayedApp();
    this._setAppFrameVisibility(displayedOrigin, true);


    // entering "active-statusbar" mode,
    // with a transform: translateY() slide up transition.
    this.mainScreen.classList.add('active-statusbar');

    var attentionScreen = this.attentionScreen;
    attentionScreen.addEventListener('transitionend', function trWait() {
      attentionScreen.removeEventListener('transitionend', trWait);

      // transition completed, entering "status-mode" (40px height iframe)
      attentionScreen.classList.add('status-mode');
    });
  },

  dispatchEvent: function as_dispatchEvent(name) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, null);
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
    var frameOrigin = attentionFrame.dataset.frameOrigin;
    if (origin === frameOrigin) {
      this.show();
    }
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
