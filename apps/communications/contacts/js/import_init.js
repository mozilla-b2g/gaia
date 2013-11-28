'use strict';

(function(document) {
  var serviceName = getServiceName();
  var allowedOrigin = oauthflow.params[serviceName].appOrigin;

  function notifyParent(message, origin) {
    parent.postMessage({
      type: message.type || '',
      data: message.data || ''
    }, origin);
  }

  function parseParams(paramsStr) {
    var out = {};
    var paramsList;
    if (paramsStr.indexOf('&') != -1) {
      paramsList = paramsStr.split('&');
    }
    else {
      paramsList = [paramsStr.substring(1)];
    }
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
    'gmail': function gmailLoader(cb) {
      LazyLoader.load('/gmail/js/gmail_connector.js', function onLoad() {
        cb(GmailConnector);
      });
    },
    'facebook': function(cb) {
      var files = [
                   '/shared/js/fb/fb_request.js',
                   '/contacts/js/fb/fb_data.js',
                   '/contacts/js/fb/fb_utils.js',
                   '/shared/js/fb/fb_reader_utils.js',
                   '/contacts/js/fb/fb_contact_utils.js',
                   '/contacts/js/fb/fb_query.js',
                   '/contacts/js/fb/fb_contact.js',
                   '/facebook/js/facebook_connector.js',
                   '/facebook/js/fb_sync.js',
                   '/contacts/style/fb/facebook.css'
      ];
      LazyLoader.load(files, function() {
        cb(FacebookConnector);
      });
    }
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
    Curtain.hide(notifyParent.bind(null, {
      type: 'abort'
    }, allowedOrigin));
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
    if (e.origin !== allowedOrigin) {
      return;
    }
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
