/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';
/* global AppWindow */

(function(exports) {
  /**
   * This window is inherit the AppWindow, and modifies some properties
   * different from the later.
   *
   * @constructor PopupWindow
   * @augments AppWindow
   */
  var PopupWindow = function(configs) {
    if (configs && configs.rearWindow) {
      // Render inside its opener.
      this.containerElement = configs.rearWindow.element;
    }
    configs.chrome = {
      bar: true
    };

    AppWindow.call(this, configs);

    // Replicate the theme color from the parent window.
    // See http://bugzil.la/1132418
    if (!this.rearWindow) {
      return;
    }

    this.themeColor = this.rearWindow.themeColor;

    if (this.rearWindow.appChrome) {
      this.element.classList.toggle('light',
        this.rearWindow.appChrome.useLightTheming());

      // We have to apply the style on the title bar element because the
      // popup appChrome element doesn't overlap. See http://bugzil.la/1132418
      this.statusbar.titleBar.style.backgroundColor =
        this.rearWindow.appChrome.element.style.backgroundColor;
    }
  };

  /**
   * @borrows AppWindow.prototype as PopupWindow.prototype
   * @memberof PopupWindow
   */
  PopupWindow.prototype = Object.create(AppWindow.prototype);

  PopupWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
     'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
     'mozbrowsertitlechange', 'mozbrowserlocationchange',
     'mozbrowsericonchange'];

  PopupWindow.SUB_COMPONENTS = {
    'transitionController': 'AppTransitionController',
    'modalDialog': 'AppModalDialog',
    'valueSelector': 'ValueSelector',
    'authDialog': 'AppAuthenticationDialog',
    'childWindowFactory': 'ChildWindowFactory',
    'statusbar': 'AppStatusbar'
  };

  PopupWindow.SUB_MODULES = {
    'contextmenu': 'BrowserContextMenu'
  };

  /**
   * We would maintain our own events by other components.
   *
   * @type String
   * @memberof PopupWindow
   */
  PopupWindow.prototype.eventPrefix = 'popup';

  /**
   * Default opening animation.
   *
   * @type String
   * @memberof PopupWindow
   */
  PopupWindow.prototype.openAnimation = 'slide-from-bottom';

  /**
   * Default closing animation.
   *
   * @type String
   * @memberof PopupWindow
   */
  PopupWindow.prototype.closeAnimation = 'slide-to-bottom';

  PopupWindow.prototype.CLASS_LIST = 'appWindow popupWindow';

  PopupWindow.prototype._DEBUG = false;

  PopupWindow.prototype.CLASS_NAME = 'PopupWindow';

  /**
   * We don't need to request to open because:
   * We are always overlapping above an app window or
   * another popup window instance which is not sent to
   * background. This behavior may change later but in
   * current stage we don't care.
   */
  PopupWindow.prototype.requestOpen = function() {
    this.open();
  };

  PopupWindow.prototype.requestClose = function() {
    this.close();
  };

  /**
   * @exports PopupWindow
   */
  exports.PopupWindow = PopupWindow;
})(window);
