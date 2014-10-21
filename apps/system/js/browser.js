/* global UrlHelper */

(function() {

  'use strict';

  function handleOpenUrl(url) {
    var configObject = {
      oop: true,
      useAsyncPanZoom: true,
      url: url
    };
    window.dispatchEvent(new CustomEvent('openwindow', {
      detail: configObject
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
