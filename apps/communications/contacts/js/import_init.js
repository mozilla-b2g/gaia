'use strict';

(function(document) {
  var serviceName = getServiceName();
  var allowedOrigin = oauthflow.params[serviceName].appOrigin;

  function parseParams(paramsStr) {
    var out = {};
    var paramsList = paramsStr.split('&');
    paramsList.forEach(function(param) {
      var paramsValues = param.split('=');
      out[paramsValues[0]] = paramsValues[1];
    });

    return out;
  }

  function getServiceName() {
    var params = parseParams(window.location.search);
    return params.service;
  }

  var servicesConnectors = {
    'live': function(cb) {
      LazyLoader.load('/live/js/live_connector.js', function() {
        cb(LiveConnector);
      });
    },
    'facebook': null,    // To be implemented
    'gmail': null        // To be implemented
  };

  function getServiceConnector(cb) {
    if (serviceName) {
      servicesConnectors[serviceName](cb);
    }
    else {
      throw new Error('Service Connector not found !!!');
    }
  }

  function cancelCb() {
    Curtain.hide();

    parent.postMessage({
      type: 'abort',
      data: ''
    }, allowedOrigin);
  }

  function tokenReady(access_token) {
    if (document.readyState === 'complete') {
      onLoad(access_token);
    }
    else {
      window.addEventListener('load', function do_load() {
        onLoad(access_token);
        window.removeEventListener('load', do_load);
      });
    }
  }


  function onLoad(access_token) {
    // Getting the timeout config from the parent
    if (parent.config) {
      config.operationsTimeout = parent.config.operationsTimeout;
    }

    utils.listeners.add({
      '#import-close': importer.ui.end,
      '#import-action': importer.ui.importAll,
      '#done-search': contacts.Search.exitSearchMode,
      '#groups-list': importer.ui.selection,
      '#search-start': [
        {
          event: 'click',
          handler: contacts.Search.enterSearchMode
        }
      ]
    });

    // This is done through onclick as it is going to be changed it dynamically
    document.querySelector('#select-all').onclick = importer.ui.selectAll;
    document.querySelector('#deselect-all').onclick =
        importer.ui.unSelectAll;

    importer.ui.init();
    getServiceConnector(function(connector) {
      importer.start(access_token, connector, allowedOrigin);
    });
  }

  window.addEventListener('localized', function fb_localized(evt) {
    document.documentElement.lang = navigator.mozL10n.language.code;
    document.documentElement.dir = navigator.mozL10n.language.direction;
  });

  window.addEventListener('message', function getAccessToken(e) {
    window.removeEventListener('message', getAccessToken);
    if (e.data.type === 'token') {
      tokenReady(e.data.data);
    }
  });

  parent.postMessage({
    type: 'messaging_ready',
    data: ''
  }, allowedOrigin);
})(document);
