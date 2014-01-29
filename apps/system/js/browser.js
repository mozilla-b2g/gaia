/* global UrlHelper */
(function() {
  'use strict';
  function handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    var data = activity.source.data;
    switch (data.type) {
      case 'url':
        var url = UrlHelper.getUrlFromInput(data.url);
        var detail = {
          name: '_blank',
          url: url,
          features: 'remote=true,useAsyncPanZoom=true'
        };
        window.dispatchEvent(new CustomEvent('mozbrowseropenwindow',
          {
            detail: detail
          }));
        break;
    }
  }

  window.navigator.mozSetMessageHandler('activity', handleActivity);
}());
