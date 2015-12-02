/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';
/* global applications */
/* global AppWindow */
/* global AppInstallManager */

(function(exports) {
  /**
   * This window is inherit the AppWindow, and modifies some properties
   * different from the later.
   *
   * @constructor PreviewWindow
   * @augments AppWindow
   */
  var PreviewWindow = function(configs) {
    if (configs && configs.rearWindow) {
      // Render inside its opener.
      this.containerElement = configs.rearWindow.element;
    }

    this.isPreviewWindow = true;

    AppWindow.call(this, configs);

    this.containerElement.addEventListener('_closed', this);
    this.element.addEventListener('_willdestroy', this);
    window.addEventListener('mozbrowserafterkeyup', this);
    window.addEventListener('mozbrowsercontextmenu', this);
  };

  /**
   * @borrows AppWindow.prototype as PreviewWindow.prototype
   * @memberof PreviewWindow
   */
  PreviewWindow.prototype = Object.create(AppWindow.prototype);

  PreviewWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
     'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
     'mozbrowsertitlechange', 'mozbrowserlocationchange',
     'mozbrowsericonchange'];

  PreviewWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'valueSelector': window.ValueSelector,
    'authDialog': window.AppAuthenticationDialog,
    'contextmenu': window.BrowserContextMenu,
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

  PreviewWindow.prototype._handle_mozbrowserafterkeyup = function(evt) {
    if ((evt.keyCode === 27 || evt.key === 'Escape') &&
        !evt.embeddedCancelled) {
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

  PreviewWindow.prototype._handle_mozbrowsercontextmenu = function(evt) {
    var icon;
    var label;
    var onClick;
    var manifestURL = this.manifestURL;
    var app = applications.getByManifestURL(manifestURL);

    if (!AppInstallManager.getAppAddedState(manifestURL)) {
      icon = 'style/icons/default.png';
      label = 'add-to-apps';
      onClick = AppInstallManager.handleAddAppToApps.bind(
        AppInstallManager, app);
    } else {
      icon = 'style/icons/default.png';
      label = 'delete-from-apps';
      onClick = () => {
        navigator.mozApps.mgmt.uninstall(app).onsuccess = () => {
          this.close();
        };
      };
    }

    navigator.mozL10n.formatValue(label).then((value) => {
      evt.detail.contextmenu = {
        type: 'menu',
        customized: true,
        items: [{
          icon: icon,
          label: value,
          type: 'menuitem',
          onClick: onClick
        }]
      };
      this.contextmenu.show(evt);
    });
  };

  PreviewWindow.prototype._handle__willdestroy = function(evt) {
    this.containerElement.removeEventListener('_closed', this);
    this.element.removeEventListener('_willdestroy', this);
    window.removeEventListener('mozbrowserafterkeyup', this);
    window.removeEventListener('mozbrowsercontextmenu', this);
  };

  // This handler is triggered by "this.containerElement".
  PreviewWindow.prototype._handle__closed = function(evt) {
    // kill itself when the parent app intends to close.
    this.kill();
  };

  /**
   * @exports PreviewWindow
   */
  exports.PreviewWindow = PreviewWindow;
})(window);
