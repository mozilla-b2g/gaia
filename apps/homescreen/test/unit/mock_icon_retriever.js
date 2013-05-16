
'use strict';

var MockIconRetriever = {
  init: function MockIconManager_init() {

  },

  get: function IconRetriever_get(request) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', request.icon.descriptor.icon, true);

    try {
      xhr.send(null);
    } catch (evt) {
      request.error.call(request.icon);
      return;
    }

    xhr.onload = function onload(evt) {
      var data = ['some stuff'];
      var properties = {
        type: 'image/png'
      };

      request.success.call(request.icon, new Blob(data, properties));
    };

    xhr.ontimeout = xhr.onerror = function onerror(evt) {
      request.error.call(request.icon);
    };
  }
};
