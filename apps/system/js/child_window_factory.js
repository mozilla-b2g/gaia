'use strict';
/* global AppWindow, PopupWindow, ActivityWindow, SettingsListener,
          AttentionWindow, MozActivity, GlobalOverlayWindow, TrustedWindow */

(function(exports) {
  var ENABLE_IN_APP_SHEET = false;
  SettingsListener.observe('in-app-sheet.enabled', false, function(value) {
    ENABLE_IN_APP_SHEET = value;
  });
  /**
   * ChildWindowFactory is a submodule of AppWindow,
   * its responsbility is to:
   *
   * (1) deal with window.open request
   *     from mozbrowser iframe to open a proper new window.
   * (2) deal with launchactivity request to open activity window.
   *
   * When an app is opening a page within same origin via window.open,
   * the generated new app window would be linked to its caller.
   * You could refer to the opener via <code>this.previousWindow</code>
   * and refer the openee via <code>this.nextWindow</code>.
   *
   * On the other hand, if <code>"dialog"</code> feature is specified in
   * window.open, we will open a front window, which is an instance of
   * PopupWindow, on the caller and set it as the rear window of the callee.
   * You could access the dialog's opener via <code>this.rearWindow</code>
   * and access the openee via <code>this.frontWindow</code> in the opener.
   *
   * At most an appWindow instance could have one front window and
   * one next window.
   *
   * @param {AppWindow} app The ordering window of this factory.
   */
  var ChildWindowFactory = function ChildWindowFactory(app) {
    this.app = app;
    this.app.element.addEventListener('mozbrowseropenwindow', this);
    this.app.element.addEventListener('_launchactivity',
      this.createActivityWindow.bind(this));
    this.app.element.addEventListener('_launchtrusted',
      this.createTrustedWindow.bind(this));
  };

  ChildWindowFactory.prototype.handleEvent =
    function cwf_handleEvent(evt) {
      // Handle event from child window.
      if (evt.detail && evt.detail.instanceID &&
          evt.detail.instanceID !== this.app.instanceID) {
        if (this['_handle_child_' + evt.type]) {
          this['_handle_child_' + evt.type](evt);
        }
        return;
      }
      // Skip to wrapperWindowFactory.
      if (this.isHomescreen) {
        // XXX: Launch wrapper window here.
        return;
      }

      // <a href="" target="_blank"> should never be part of the app
      // except while FTU is running: windows must be closable & parented by FTU
      if (evt.detail.name == '_blank' &&
          !window.Service.runningFTU &&
          evt.detail.features !== 'attention' &&
          evt.detail.features !== 'global-clickthrough-overlay') {
        this.createNewWindow(evt);
        evt.stopPropagation();
        return;
      }

      // Check if this is a call to open the url in an known app.
      if (evt.detail.isApp) {
        this.app.publish('openwindow',
          { manifestURL: evt.detail.name,
            url: evt.detail.url,
            timestamp: Date.now() });
        evt.stopPropagation();
        return;
      }

      var caught = false;
      switch (evt.detail.features) {
        case 'dialog':
          // Only open popupWindow by app/http/https prefix
          if (/^(app|http|https):\/\//i.test(evt.detail.url)) {
            caught = this.createPopupWindow(evt);
          } else {
            caught = this.launchActivity(evt);
          }
          break;
        case 'attention':
          // Open attentionWindow
          if (!this.createAttentionWindow(evt)) {
            this.createPopupWindow(evt);
          }
          break;
        case 'global-clickthrough-overlay':
          // Open GlobalOverlayWindow.
          this.createGlobalOverlayWindow(evt);
          break;
        case 'mozhaidasheet':
          // This feature is for internal usage only
          // before we have final API to open an inner sheet.
          caught = this.createChildWindow(evt);
          break;
        default:
          if (ENABLE_IN_APP_SHEET) {
            caught = this.createChildWindow(evt);
          } else {
            caught = this.createPopupWindow(evt);
          }
          break;
      }

      if (caught) {
        evt.stopPropagation();
      }
    };

  ChildWindowFactory.prototype.createPopupWindow = function(evt) {
    if (this.app.frontWindow &&
        (this.app.frontWindow.isTransitioning() ||
          this.app.frontWindow.isActive())) {
      return false;
    }
    var configObject = {
      url: evt.detail.url,
      name: this.app.name,
      iframe: evt.detail.frameElement,
      origin: this.app.origin,
      rearWindow: this.app
    };
    var childWindow = new PopupWindow(configObject);
    childWindow.element.addEventListener('_closing', this);
    childWindow.open();
    return true;
  };

  ChildWindowFactory.prototype._sameOrigin = function(url1, url2) {
    var a = url1.split('/');
    var b = url2.split('/');
    return (a[0] === b[0] && a[2] === b[2]);
  };

  ChildWindowFactory.prototype.createNewWindow = function(evt) {
    if (!this.app.isActive() || this.app.isTransitioning()) {
      return false;
    }
    var configObject = {
      url: evt.detail.url,
      name: evt.detail.name,
      iframe: evt.detail.frameElement,
      isPrivate: this.app.isPrivateBrowser()
    };
    window.dispatchEvent(new CustomEvent('openwindow', {
      detail: configObject
    }));
    return true;
  };

  ChildWindowFactory.prototype.createChildWindow = function(evt) {
    if (!this.app.isActive() || this.app.isTransitioning()) {
      return false;
    }
    var configObject = {
      url: evt.detail.url,
      name: this.app.name,
      iframe: evt.detail.frameElement,
      origin: this.app.origin,
      isPrivate: this.app.isPrivateBrowser()
    };
    if (this._sameOrigin(this.app.origin, evt.detail.url)) {
      configObject.manifestURL = this.app.manifestURL;
      configObject.previousWindow = this.app;
    } else {
      configObject.name = '';
      configObject.origin = evt.detail.url;
    }
    var childWindow = new AppWindow(configObject);
    childWindow.requestOpen();
    return true;
  };

  ChildWindowFactory.prototype.createAttentionWindow = function(evt) {
    if (!this.app || !this.app.hasPermission('attention')) {
      console.error('Cannot create attention window. ' +
                    'Invalid of underprivileged app');
      return false;
    }

    // Canceling any full screen web content
    if (document.mozFullScreen) {
      document.mozCancelFullScreen();
    }

    var attentionFrame = evt.detail.frameElement;
    var attention = new AttentionWindow({
      iframe: attentionFrame,
      url: evt.detail.url,
      name: evt.detail.name,
      manifestURL: this.app.manifestURL,
      origin: this.app.origin,
      parentWindow: this.app
    });

    this.app.attentionWindow = attention;
    attention.requestOpen();
    return true;
  };

  ChildWindowFactory.prototype.createGlobalOverlayWindow = function(evt) {
    if (!this.app || !this.app.hasPermission('global-clickthrough-overlay')) {
      console.error('Cannot create global overlay window. ' +
                    'Invalid of underprivileged app');
      return false;
    }

    var overlayFrame = evt.detail.frameElement;
    var overlay = new GlobalOverlayWindow({
      iframe: overlayFrame,
      url: evt.detail.url,
      name: evt.detail.name,
      manifestURL: this.app.manifestURL,
      origin: this.app.origin,
      parentWindow: this.app
    });

    this.app.overlayWindow = overlay;
    overlay.requestOpen();
    return true;
  };

  ChildWindowFactory.prototype._handle_child__closing = function(evt) {
    // Do nothing if we are not active or we are being killing.
    if (!this.app.isVisible() || this.app._killed) {
      return;
    }

    this.app.setOrientation();
    this.app.requestForeground();

    // An activity handled by ActivityWindow is always an inline activity.
    // All window activities are handled by AppWindow. All inline
    // activities have a rearWindow. Once this inline activity is killed,
    // make rear window visible to screen reader and the focus should be
    // transfered to its rear window.
    evt.detail.rearWindow._setVisibleForScreenReader(true);
    evt.detail.rearWindow.focus();
  };

  ChildWindowFactory.prototype.createActivityWindow = function(evt) {
    var configuration = evt.detail;
    var top = this.app.getTopMostWindow();
    // If the lastActivity is the same as launch request, we don't need to
    // create another activity.
    if (top.manifestURL == configuration.manifestURL &&
        top.url == configuration.url) {
      return;
    }
    var activity = new ActivityWindow(configuration, top);
    activity.element.addEventListener('_closing', this);
    activity.open();
    // Make topmost window browser element invisibile to screen reader.
    top._setVisibleForScreenReader(false);
  };

  ChildWindowFactory.prototype.createTrustedWindow = function(evt) {
    var configuration = evt.detail;
    var top = this.app.getTopMostWindow();
    var trusted = new TrustedWindow(configuration, top);
    trusted.element.addEventListener('_closing', this);
    trusted.open();
  };

  ChildWindowFactory.prototype.launchActivity = function(evt) {
    var activity = new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: evt.detail.url
      }
    });
    activity.onerror = function() {
      this.app.debug(
        'view activity error:' + activity.error.name + evt.detail.url);
    };

    return true;
  };

  exports.ChildWindowFactory = ChildWindowFactory;
}(window));
