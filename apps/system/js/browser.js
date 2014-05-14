/* global UrlHelper, AppWindowManager, AppWindow */

(function() {

  'use strict';

  function handleOpenUrl(url) {

    var app = AppWindowManager.getActiveApp();

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

  function handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    var data = activity.source.data;
    switch (data.type) {
      case 'url':
        handleOpenUrl(UrlHelper.getUrlFromInput(data.url));
        break;
    }
  }

  window.navigator.mozSetMessageHandler('activity', handleActivity);

}());
