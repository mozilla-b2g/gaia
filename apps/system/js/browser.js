/* global UrlHelper, BrowserConfigHelper */

(function() {

  'use strict';

  function handleOpenUrl(url) {
    var config = new BrowserConfigHelper({url: url});
    config.useAsyncPanZoom = true;
    config.oop = true;
    window.dispatchEvent(new CustomEvent('openwindow', {
      detail: config
    }));
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
