(function(exports) {
  
  'use strict';

  const paths = {
    detail: '/contacts/views/details/details.html',
    form: '/contacts/views/form/form.html',
    // TODO Add paths to the rest of views
    settings: '',
    list: ''
  };

  exports.ParamUtils = {
    get: function() {
      var params = {};
      var split = window.location.search.split('?');
      if (!split || !split[1]) {
        return params;
      }
      var raw = split[1];
      var pairs = raw.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var data = pairs[i].split('=');
        params[data[0]] = data[1];
      }
      return params;
    },
    generateUrl: function(view, params) {
      if (!view || !view.length || view === '') {
        return;
      }
      var path = paths[view];
      if (!path) {
        return;
      }

      if (!params) {
        return path;
      }

      var keys = Object.keys(params);
      if (!keys || keys.length === 0) {
        return path;
      }

      var urlParams = '?';
      for (var i = 0, l = keys.length; i < l; i++) {
        if (i !== 0) {
          urlParams += '&';
        }
        var key = keys[i];
        urlParams += key + '=' + params[key];
      }
      return path + urlParams;
    }
  };

}(window));
