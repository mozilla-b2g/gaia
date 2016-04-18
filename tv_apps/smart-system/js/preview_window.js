/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';
/* global applications */
/* global AppWindow */
/* global AppInstallManager */
/* global AppInstallDialogs */
/* global BookmarkManager */
/* global SystemBanner */
/* global focusManager */

(function(exports) {
  const ADD_TO_APPS_ICON_PATH = '/style/icons/add_to_apps.png';

  /**
   * This window inherited AppWindow and altered some properties of the later.
   *
   * @constructor PreviewWindow
   * @augments AppWindow
   */
  var PreviewWindow = function(configs) {
    if (configs && configs.rearWindow) {
      // Render inside its opener.
      this.container = configs.rearWindow;
    }

    this.isAppLike = !configs.manifestURL;
    this.identity = configs.manifestURL || configs.url;
    this.features = configs.features || {};

    this.systemBanner = new SystemBanner();

    configs.chrome = {
      scrollable: false
    };

    AppWindow.call(this, configs);

    if (this.features.name) {
      this.name = this.features.name;
    }

    focusManager.focus();

    this.container.element.addEventListener('_closed', this);
    this.element.addEventListener('_loaded', this);
    this.element.addEventListener('_willdestroy', this);
  };

  /**
   * @borrows AppWindow.prototype as PreviewWindow.prototype
   * @memberof PreviewWindow
   */
  PreviewWindow.prototype = Object.create(AppWindow.prototype);
  PreviewWindow.prototype.constructor = PreviewWindow;

  PreviewWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
     'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
     'mozbrowsertitlechange', 'mozbrowserlocationchange',
     'mozbrowsermetachange', 'mozbrowsericonchange',
     '_localized', '_swipein', '_swipeout', '_kill_suspended',
     '_orientationchange', '_focus', '_hidewindow', '_sheetsgesturebegin',
     '_sheetsgestureend', '_cardviewbeforeshow', '_cardviewclosed',
     '_closed'];

  PreviewWindow.REGISTERED_GLOBAL_EVENTS =
    ['back'];

  PreviewWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'valueSelector': window.ValueSelector,
    'authDialog': window.AppAuthenticationDialog,
    'contextmenu': window.BrowserContextMenu,
    'splashScreen': window.SplashScreen,
    'childWindowFactory': window.ChildWindowFactory
  };

  /**
   * We would maintain our own events by other components.
   *
   * @type String
   * @memberof PreviewWindow
   */
  PreviewWindow.prototype.eventPrefix = 'preview';

  PreviewWindow.prototype._DEBUG = false;

  PreviewWindow.prototype.CLASS_NAME = 'PreviewWindow';

  PreviewWindow.prototype.CLASS_LIST = 'appWindow previewWindow';

  PreviewWindow.prototype.openAnimation = 'fade-in';

  PreviewWindow.prototype.closeAnimation = 'fade-out';

  PreviewWindow.prototype.requestOpen = function() {
    this.open();
  };

  PreviewWindow.prototype.requestClose = function() {
    this.close();
  };

  PreviewWindow.prototype.isFocusable = function() {
    return this.isVisible();
  };

  PreviewWindow.prototype._handle_back = function(evt) {
    if (document.activeElement !== this.iframe &&
        document.activeElement !== document.body) {
      return;
    }
    if (this.config.url.startsWith('app://') ||
        this.splashScreen.isVisible()) {
      this.kill();
    } else {
      var goBackReq = this.iframe.getCanGoBack();
      goBackReq.onsuccess = () => {
        if (goBackReq.result) {
          this.iframe.goBack();
        } else {
          this.kill();
        }
      };
      goBackReq.onerror = () => {
        this.kill();
      };
    }
  };

  PreviewWindow.prototype._handle__loaded = function() {
    this.element.removeEventListener('_loaded', this);
    var showPreviewHint = () => {
      if (!this.isDead()) {
        window.interactiveNotifications.showNotification(
          window.InteractiveNotifications.TYPE.NORMAL, {
            title: {
              id: 'preview-app-hint'
            },
            text: {
              id: 'add-to-apps'
            },
            icon: ADD_TO_APPS_ICON_PATH
          });
      }
    };

    if (this.isAppLike) {
      BookmarkManager.get(this.identity).then((bookmark) => {
        if (!bookmark) {
          AppInstallManager.increasePreviewOpenedTimes(this.identity);
          showPreviewHint();
        }
      });
    } else if (!AppInstallManager.getAppAddedState(this.manifestURL)) {
      AppInstallManager.increasePreviewOpenedTimes(this.identity);
      showPreviewHint();
    }
  };

  PreviewWindow.prototype._handle__willdestroy = function(evt) {
    this.container.element.removeEventListener('_closed', this);

    var previewOpenedTimes = JSON.parse(localStorage.getItem(
      AppInstallManager.PREVIEW_OPENED_TIMES_KEY) || '{}');
    var needPrompt = previewOpenedTimes[this.identity] ===
      AppInstallManager.PREVIEW_OPENED_TIMES_TO_HINT;
    var options;

    if (this.isAppLike) {
      if (needPrompt) {
        BookmarkManager.get(this.identity).then((bookmark) => {
          if (!bookmark) {
            options = {
              manifest: {
                name: this.features.name
              }
            };
            AppInstallManager.appInstallDialogs
              .show(AppInstallDialogs.TYPES.AddAppDialog, options)
              .then(() => {
                return BookmarkManager.add({
                  name: this.features.name,
                  url: this.identity,
                  iconUrl: this.features.iconUrl
                });
              })
              .then(() => {
                AppInstallManager.resetPreviewOpenedTimes(this.identity);
                this.systemBanner.show({
                  id: 'added-to-apps',
                  args: {
                    appName: this.features.name
                  }
                });
              });
          }
        });
      }
    } else {
      if (needPrompt && !AppInstallManager.getAppAddedState(this.manifestURL)) {
        var app = applications.getByManifestURL(this.manifestURL);

        options = {
          manifest: app.manifest
        };

        var onFulfilled = AppInstallManager.handleAddAppToApps
          .bind(AppInstallManager, app);
        var onRejected = AppInstallManager.uninstallPreviewApp
          .bind(AppInstallManager);

        AppInstallManager.appInstallDialogs
          .show(AppInstallDialogs.TYPES.AddAppDialog, options)
          .then(onFulfilled, onRejected);
      } else {
        AppInstallManager.uninstallPreviewApp();
      }
    }
  };

  // This handler is triggered by "this.container.element".
  PreviewWindow.prototype._handle__closed = function(evt) {
    // kill itself when the parent app intends to close.
    this.kill();
  };

  /**
   * @exports PreviewWindow
   */
  exports.PreviewWindow = PreviewWindow;
})(window);
