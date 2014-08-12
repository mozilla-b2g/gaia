/* global UrlHelper, AppWindow, BaseModule */
/* jshint nonew: false */
'use strict';

(function(exports) {
  var UrlActivityHandler = function(appWindowManager) {
    this.appWindowManager = appWindowManager;
  };
  UrlActivityHandler.prototype = Object.create(BaseModule.prototype);
  UrlActivityHandler.prototype.constructor = UrlActivityHandler;
  UrlActivityHandler.SYSTEM_MESSAGES = ['activity'];
  var prototype = {
    '_watch_activity': function (message) {
      if (message.source.data !== 'url') {
        return;
      }
      var url = UrlHelper.getUrlFromInput(message.source.data.url);
      var app = this.appWindowManager.getActiveApp().getTopMostWindow();

      if (app && app.isBrowser()) {
        app.navigate(url);
        return;
      }

      var newApp = new AppWindow({
        oop: true,
        useAsyncPanZoom: true,
        url: url
      });

      newApp.requestOpen();
    }
  };
  BaseModule.mixin(UrlActivityHandler.prototype, prototype);
  exports.UrlActivityHandler = UrlActivityHandler;
}(window));
