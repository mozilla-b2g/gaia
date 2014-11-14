/* global UrlHelper, AppWindow, BrowserConfigHelper */

(function() {

  'use strict';

  function handleOpenUrl(url, isPrivate) {
    var config = new BrowserConfigHelper({url: url});
    config.useAsyncPanZoom = true;
    config.oop = true;
    config.isPrivate = isPrivate;
    var newApp = new AppWindow(config);

    newApp.requestOpen();
  }

  function handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    var data = activity.source.data;
    switch (data.type) {
      case 'url':
        handleOpenUrl(UrlHelper.getUrlFromInput(data.url), data.isPrivate);
        break;
    }
  }

  window.navigator.mozSetMessageHandler('activity', handleActivity);

}());
