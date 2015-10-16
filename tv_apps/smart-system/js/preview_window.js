/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';
/* global AppWindow */

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

  /**
   * @exports PreviewWindow
   */
  exports.PreviewWindow = PreviewWindow;
})(window);
