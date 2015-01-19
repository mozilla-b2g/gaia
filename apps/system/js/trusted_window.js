/* global AppWindow, ModalDialog */

'use strict';
(function(exports) {
  var TrustedWindow = function(config, caller) {
    this.trunk = new WeakMap();
    var chrome = {
      bar: true
    };
    this.reConfig({
      chrome: chrome,
      iframe: config.frame,
      title: config.name,
      url: config.frame.src,
      requestId: config.requestId
    });

    if (caller) {
      caller.setFrontWindow(this);
      this.rearWindow = caller;
      if (caller.element) {
        this.containerElement = caller.element;
      }
    }

    this.publish('creating');
    this.render();
    this.publish('created');
    return this;
  };

  TrustedWindow.prototype = Object.create(AppWindow.prototype);
  TrustedWindow.prototype.constructor = TrustedWindow;

  TrustedWindow.prototype._DEBUG = false;

  TrustedWindow.prototype.CLASS_NAME = 'TrustedWindow';

  TrustedWindow.prototype.CLASS_LIST = 'trustedwindow appWindow';

  TrustedWindow.REGISTERED_EVENTS =
    [ '_localized', 'mozbrowserclose', 'mozbrowsererror',
      'mozbrowservisibilitychange', 'mozbrowserloadend', '_orientationchange',
      '_focus', 'mozbrowserloadstart', 'mozbrowserlocationchange'];

  TrustedWindow.SUB_COMPONENTS = {
    'transitionController': 'AppTransitionController',
    'modalDialog': 'AppModalDialog',
    'valueSelector': 'ValueSelector',
    'authDialog': 'AppAuthenticationDialog',
    'childWindowFactory': 'ChildWindowFactory',
    'statusbar': 'AppStatusbar'
  };

  TrustedWindow.prototype.openAnimation = 'slide-from-bottom';
  TrustedWindow.prototype.closeAnimation = 'slide-to-bottom';
  TrustedWindow.prototype.eventPrefix = 'trusted';

  TrustedWindow.prototype._handle_mozbrowsererror =
    function tw__handle_mozbrowsererror() {
      this.publish('crashed');
      ModalDialog.alert('error-title', 'error-message', {
        title: 'close',
        callback: this.kill.bind(this)
      });
    };

  exports.TrustedWindow = TrustedWindow;
}(window));
