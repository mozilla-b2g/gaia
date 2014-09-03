/* global UrlHelper, AppWindow */

(function() {

  'use strict';

  function handleOpenUrl(url) {
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
