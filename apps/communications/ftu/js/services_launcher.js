'use strict';

var FTU_APP_ORIGIN = document.location.protocol + '//' +
    document.location.host;

var ServicesLauncher = (function(document) {
    var extensionFrame = document.querySelector('#fb-extensions');
    var oauthFrame = document.querySelector('#fb-oauth');

    var BASE_IMPORT = '/contacts/import.html?ftu=1';
    function getServiceURI(service) {
      return BASE_IMPORT + '&service=' + service;
    }

    var access_token, currentURI, currentService;


    function open() {
      extensionFrame.className = 'opening';
    }

    function load(targetService) {
      currentService = targetService;
      currentURI = getServiceURI(targetService);

      window.addEventListener('message', messageHandler);
      oauthFrame.contentWindow.postMessage({
        type: 'start',
        data: {
          from: 'friends',
          service: targetService
        }
      }, FTU_APP_ORIGIN);
    }

    function unload() {
      window.removeEventListener('message', messageHandler);
      extensionFrame.src = null;
    }

    function close(message) {
      extensionFrame.addEventListener('transitionend', function tclose() {
        extensionFrame.removeEventListener('transitionend', tclose);
        extensionFrame.src = null;
        if (message) {
          utils.status.show(message);
        }
      });
      extensionFrame.className = 'closing';
      window.removeEventListener('message', messageHandler);

      if (currentService === 'facebook') {
        // Notify observers that a change from FB could have happened
        var event = new CustomEvent('fb_imported', {
          'detail' : true
        });
        document.dispatchEvent(event);
      }
    }


    // This function can also be executed when other messages arrive
    // That's why we cannot call notifySettings outside the switch block
    function messageHandler(e) {
      if (e.origin !== FTU_APP_ORIGIN) {
        return;
      }
      var data = e.data;

      switch (data.type) {
        case 'ready':
          open();
          break;

        case 'abort':
          unload();
          break;

        case 'window_close':
          close(data.message);
          break;

        case 'authenticated':
          extensionFrame.src = currentURI;
          access_token = data.data;
          break;

        case 'messaging_ready':
          extensionFrame.contentWindow.postMessage({
            type: 'token',
            data: access_token
          }, FTU_APP_ORIGIN);
          break;
      }
    }

    return {
      start: load
    };

  })(document);
