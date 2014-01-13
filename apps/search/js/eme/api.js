(function() {
  'use strict';

  function partnersAPI(eme) {
    var OK = 1;
    var API_URL = 'https://api.everything.me/partners/1.0/{resource}/';
    var API_KEY = '79011a035b40ef3d7baeabc8f85b862f';

    var deviceId = null;

    var self = this;

    this.init = function init(config) {
      deviceId = config.deviceId;

      addApiMethod('Apps', 'search');
      addApiMethod('Search', 'suggestions');
      addApiMethod('Search', 'bgimage');
    };

    function addApiMethod(service, method) {
      if (self[service] === undefined) {
        self[service] = {};
      }

      self[service][method] = function apiMethod(options) {
        return apiRequest(service + '/' + method, options);
      };
    }

    /**
     * Make an async httpRequest to resource with given options.
     * Returns a promise which will be resolved/reject on success/error
     * respectively
     */
    function apiRequest(resource, options) {
      var url = API_URL.replace('{resource}', resource);
      var payload = '';

      options = options ? options : {};

      // always send apiKey and deviceId
      options.apiKey = API_KEY;
      options.deviceId = deviceId;

      for (var k in options) {
        var v = options[k];
        if (v !== null && v !== undefined) {
          payload += k + '=' + encodeURIComponent(options[k]) + '&';
        }
      }

      var httpRequest;
      var promise = new Promise(function done(resolve, reject) {
        httpRequest = new XMLHttpRequest();
        httpRequest.open('POST', url, true);
        httpRequest.setRequestHeader(
          'Content-Type', 'application/x-www-form-urlencoded');

        httpRequest.onload = function onload(e) {
          var response = null;

          try {
            response = JSON.parse(httpRequest.responseText);
          } catch (ex) {
            reject(ex);
          }

          if (response && response.errorCode === OK) {
            resolve(response);
          } else {
            reject(response ?
              'errorCode: ' + response.errorCode : 'invalid response');
          }
        };

        httpRequest.onerror = function onError(e) {
          reject('network error');
        };

        httpRequest.withCredentials = true;
        httpRequest.send(payload);
      });

      promise.abort = function() {
        if (httpRequest.abort) {
          httpRequest.abort();
        }
      };

      return promise;
    }
  }

  eme.api = new partnersAPI();

})(window.eme);
