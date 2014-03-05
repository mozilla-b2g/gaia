/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

(function(exports) {
  var AppWindow = self.AppWindow;

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
      rocketbar: true,
      navigation: true
    };
      
    AppWindow.call(this, configs);
  };

  /**
   * @borrows AppWindow.prototype as PopupWindow.prototype
   * @memberof PopupWindow
   */
  PopupWindow.prototype.__proto__ = AppWindow.prototype;

  PopupWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror', 'mozbrowservisibilitychange',
     'mozbrowserloadend', 'mozbrowseractivitydone', 'mozbrowserloadstart',
     'mozbrowsertitlechange', 'mozbrowserlocationchange',
     'mozbrowsericonchange'];

  PopupWindow.SUB_COMPONENTS = {
    'transitionController': window.AppTransitionController,
    'modalDialog': window.AppModalDialog,
    'authDialog': window.AppAuthenticationDialog,
    'contextmenu': window.BrowserContextMenu,
    'childWindowFactory': window.ChildWindowFactory
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
  PopupWindow.prototype.openAnimation = 'slideup';

  /**
   * Default closing animation.
   *
   * @type String
   * @memberof PopupWindow
   */
  PopupWindow.prototype.closeAnimation = 'slidedown';

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
})(self);
