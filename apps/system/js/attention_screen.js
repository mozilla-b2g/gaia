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

    this.bar.addEventListener('click', this.maximize.bind(this));

    window.addEventListener('home', this.hide.bind(this));
    window.addEventListener('holdhome', this.hide.bind(this));
    window.addEventListener('appwillopen', this.appOpenHandler.bind(this));
    window.addEventListener('launchapp', this.appLaunchHandler.bind(this));
    window.addEventListener('emergencyalert', this.hide.bind(this));

    window.addEventListener('appforeground',
      this.appForegroundHandler.bind(this));

    window.addEventListener('mozmemorypressure', this.freePreloaded.bind(this));
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
    var frame = evt.target;
    if (evt.detail.height <= 40) {
      frame.dataset.appRequestedSmallSize = '';
      this.hide();
    } else {
      this.show(frame);
    }
  },

  appOpenHandler: function as_appHandler(evt) {
    // If the user presses the home button we will still hide the attention
    // screen. But in the case of an app crash we'll keep it fully open
    if (!evt.detail.isHomescreen) {
      this.hide();
    }
  },

  appLaunchHandler: function as_appLaunchHandler(evt) {
    if (!evt.detail.stayBackground) {
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
    var app = applications.getByManifestURL(manifestURL);

    if (!app || !this._hasAttentionPermission(app))
      return;

    // Hide sleep menu/list menu if it is shown now
    sleepMenu.hide();

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
    delete attentionFrame.dataset.hidden;
    attentionFrame.addEventListener('mozbrowserresize', this.toggle.bind(this));

    if (attentionFrame.parentNode !== this.attentionScreen) {
      this.attentionScreen.appendChild(attentionFrame);
    }

    // We would like to put the dialer call screen on top of all other
    // attention screens by ensure it is the last iframe in the DOM tree
    if (this._hasTelephonyPermission(app)) {
      // This event is for SIM PIN lock module.
      // Because we don't need SIM PIN dialog during call
      // but the IccHelper cardstatechange event could
      // be invoked by airplane mode toggle before the call is established.
      this.dispatchEvent('callscreenwillopen');
    }

    // Make the overlay visible if we are not displayed yet.
    // alternatively, if the newly appended frame is the visible frame
    // and we are in the status bar mode, expend to full screen mode.
    if (!this.isVisible()) {
      this.tryLockOrientation();

      this.attentionScreen.classList.add('displayed');
      this.mainScreen.classList.add('attention');
      this.dispatchEvent('attentionscreenshow', {
        origin: attentionFrame.dataset.frameOrigin
      });
      this._updateFrameVisibility(attentionFrame);
    } else if (!this.isFullyVisible()) {
      this.show(attentionFrame);
    } else {
      this._updateFrameVisibility(attentionFrame);
    }
  },

  // Make sure visibililty state of all attention screens are set correctly
  _updateFrameVisibility: function as_updateFrameVisibility(activeFrame) {
    var frames = this.attentionScreen.querySelectorAll('iframe');
    var i = frames.length - 1;

    // In case someone call this function w/o checking for frame first
    if (i < 0)
      return;

    while (i >= 0) {
      // The setTimeout() and the closure is used to workaround
      // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
      setTimeout(function(frame, self) {
        if (frame == activeFrame) {
          frame.setVisible(true);
          frame.classList.add('active');
          frame.focus();
          self._removeNotificationFor(frame);
        } else {
          frame.setVisible(false);
          frame.classList.remove('active');
          frame.blur();
          self._addNotificationFor(frame);
        }
      }, 0, frames[i], this);
      i--;
    }
  },

  // close the attention screen overlay
  close: function as_close(evt) {
    var iframe = evt.target;
    if (!'frameType' in iframe.dataset ||
        iframe.dataset.frameType !== 'attention' ||
        (evt.type === 'mozbrowsererror' && evt.detail.type !== 'fatal'))
      return;

    if (iframe.dataset.hidden) {
      return;
    }

    // Check telephony permission before removing.
    var app = applications.getByManifestURL(iframe.dataset.manifestURL);
    if (app && this._hasTelephonyPermission(app)) {
      // This event is for SIM PIN lock module.
      // Because we don't need SIM PIN dialog during call
      // but the IccHelper cardstatechange event could
      // be invoked by airplane mode toggle before the call is established.
      this.dispatchEvent('callscreenwillclose');
    }

    // 'Closing' the attention screen
    var origin = iframe.dataset.frameOrigin;

    if (iframe.dataset.preloaded) {
      // Unload then preload again
      iframe.setVisible(false);

      var src = iframe.src.split('#')[0];
      iframe.src = ''; // cocotte
      setTimeout(function nextTick() {
        iframe.src = src;
      });

      iframe.dataset.hidden = 'hidden';
      iframe.blur();
    } else {
      this.attentionScreen.removeChild(iframe);
    }

    // We've just removed the focused window leaving the system
    // without any focused window, let's fix this.
    window.focus();

    // if there are other attention frames,
    // we need to update the visibility and show(frame) the overlay.
    var selector = 'iframe:not([data-hidden])';
    if (this.attentionScreen.querySelectorAll(selector).length) {
      var frame = this.attentionScreen.lastChild;
      this._updateFrameVisibility(frame);

      this.dispatchEvent('attentionscreenclose', { origin: origin });

      if (!this.isFullyVisible())
        this.show(frame);

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

    this.attentionScreen.classList.remove('displayed');
    this.mainScreen.classList.remove('attention');
    this.dispatchEvent('attentionscreenhide', { origin: origin });
  },

  _addNotificationFor: function as_addNotificationFor(frame) {
    var manifestURL = frame.dataset.manifestURL;
    var notification = document.getElementById('notification-' + manifestURL);
    if (notification || !manifestURL) {
      return;
    }

    var manifest = window.applications.getByManifestURL(manifestURL).manifest;
    var iconSrc = manifestURL.replace(
                    '/manifest.webapp',
                    manifest.icons[Object.keys(manifest.icons)[0]]
                  );

    // Let's create the fake notification.
    var notification = document.createElement('div');
    notification.id = 'notification-' + manifestURL;
    notification.classList.add('notification');

    var icon = document.createElement('img');
    icon.src = iconSrc;
    icon.classList.add('icon');
    notification.appendChild(icon);

    var message = document.createElement('div');
    message.appendChild(document.createTextNode(manifest.name));
    message.classList.add('message');
    notification.appendChild(message);

    var tip = document.createElement('div');
    var helper = window.navigator.mozL10n.get('attentionScreen-tapToShow');
    tip.appendChild(document.createTextNode(helper));
    tip.classList.add('tip');
    notification.appendChild(tip);

    var container = document.getElementById('notifications-container');
    container.insertBefore(notification, container.firstElementChild);

    // Attach an event listener to the fake notification so the
    // attention screen is shown when the user tap on it.
    notification.addEventListener('click',
                                  this._onNotificationTap.bind(this, frame));
  },

  _removeNotificationFor: function as_removeNotificationFor(frame) {
    var manifestURL = frame.dataset.manifestURL;
    var notification = document.getElementById('notification-' + manifestURL);
    if (!notification) {
      return;
    }

    notification.parentNode.removeChild(notification);
  },

  _onNotificationTap: function as_onNotificationTap(frame) {
    UtilityTray.hide(true);
    this.show(frame);
  },

  maximize: function a_maximise() {
    var selector = 'iframe.active';
    this.show(this.attentionScreen.querySelector(selector));
  },

  // expend the attention screen overlay to full screen
  show: function as_show(frame) {
    // Attention screen now only support default orientation.
    this.tryLockOrientation();

    delete frame.dataset.appRequestedSmallSize;
    this._updateFrameVisibility(frame);

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
        origin: frame.dataset.frameOrigin
      });
    });
  },

  // shrink the attention screen overlay to status bar
  // invoked when we get a "home" event
  hide: function as_hide() {
    if (!this.isFullyVisible())
      return;

    // entering "active-statusbar" mode,
    // with a transform: translateY() slide up transition.
    this.mainScreen.classList.add('active-statusbar');

    var attentionScreen = this.attentionScreen;
    attentionScreen.addEventListener('transitionend', (function trWait() {
      attentionScreen.removeEventListener('transitionend', trWait);

      // transition completed, entering "status-mode" (40px height iframe)
      attentionScreen.classList.add('status-mode');
    }).bind(this));

    // The only way to hide attention screen is the home/holdhome event.
    // So we don't fire any origin information here.
    // The expected behavior is restore homescreen visibility to 'true'
    // in the Window Manager.
    // Make sure the status-active event is sent after the 'home' event has
    // dispatched. Otherwise we can end up in a race where the 'foreground'
    // application perceived by the screen manager is not the homescreen, but
    // the last visible app since events dispatching are synchronous.
    setTimeout(function(self) {
      self.dispatchEvent('status-active');
    }, 0, this);
  },

  // If the lock request fails, request again later.
  // XXX: Group orientation requests in orientation manager to avoid this.
  tryLockOrientation: function as_tryLockOrientation() {
    var tries = 20;
    var tryToUnlock = function() {
      var rv = screen.mozLockOrientation(OrientationManager.defaultOrientation);
      if (!rv && tries--) {
        console.warn(
          'Attention screen fails on locking orientation, retrying..');
        setTimeout(tryToUnlock, 20);
      }
    };

    tryToUnlock();
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

    var selector = 'iframe:not([data-hidden])';
    var frames = this.attentionScreen.querySelectorAll(selector);
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];

      // We don't want to reopen the attention screen when the app requested a
      // statusbar attention screen
      if (frame.dataset.hasOwnProperty('appRequestedSmallSize')) {
        continue;
      }

      var frameOrigin = frame.dataset.frameOrigin;
      if (frameOrigin === origin ||
          (frameOrigin.startsWith('app://callscreen.gaiamobile.org/') &&
           origin.startsWith('app://communications.gaiamobile.org/dialer/'))) {
        this.show(frame);
        return;
      }
    }
  },

  appForegroundHandler: function as_appForegroundHandler(evt) {
    // If the app behind the soon-to-be-unlocked lockscreen has an
    // attention screen we should display it
    var app = evt.detail;
    this.showForOrigin(app.origin);
  },

  freePreloaded: function as_freePreloaded() {
    var selector = 'iframe[data-hidden][data-preloaded]';
    var frames = this.attentionScreen.querySelectorAll(selector);
    Array.prototype.forEach.call(frames, function resetFrame(frame) {
      frame.src = '';
    });
  },

  getAttentionScreenOrigins: function as_getAttentionScreenOrigins() {
    var attentionScreen = this.attentionScreen;
    var selector = 'iframe:not([data-hidden])';
    var frames = this.attentionScreen.querySelectorAll(selector);
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
