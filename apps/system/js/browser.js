(function() {

  function handleActivity(activity) {
    // Activities can send multiple names, right now we only handle
    // one so we only filter on types
    switch (activity.source.data.type) {
      case 'url':
        var url = UrlHelper.getUrlFromInput(activity.source.data.url);
        console.log('Opening url: ', url);
        var detail = {
          name: '_blank',
          url: url,
          features: 'remote=true'
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
