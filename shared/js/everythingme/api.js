'use strict';
/* global Promise */

(function(eme) {

  function partnersAPI() {
    /*jshint validthis:true */

    var OK = 1;
    var NETWORK_ERROR = 'network error';

    var API_URL = 'https://api.everything.me/partners/1.0/{resource}/';
    var API_KEY = '79011a035b40ef3d7baeabc8f85b862f';

    var deviceId = null;

    this.init = function init(configDeviceId) {
      deviceId = configDeviceId;

      this.Apps = Apps();
      this.Search = Search();
      this.Categories = Categories();
    };

    function Apps() {
      var service = 'Apps';
      var MAX_QUERY_LENGTH = 128;

      function search(options) {
        var method = 'search';

        if (!!options.query && options.query.length > MAX_QUERY_LENGTH) {
          options.query = options.query.substr(0, MAX_QUERY_LENGTH);
        }
        return Request(service, method, options);
      }

      return {
        search: search
      };
    }

    function Search() {
      var service = 'Search';

      function suggestions(options) {
        return Request(service, 'suggestions', options);
      }

      function bgimage(options) {
        return Request(service, 'bgimage', options);
      }

      return {
        suggestions: suggestions,
        bgimage: bgimage
      };
    }

    function Categories() {
      var service = 'Categories';

      function list(options) {
        return CachedRequest(service, 'list', options);
      }

      return {
        list: list
      };
    }

    /**
     * Make an async httpRequest to resource with given options.
     * Returns a promise which will be resolved/reject on success/error
     * respectively
     */
    function Request(service, method, options) {
      var resource = service + '/' + method;
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

      eme.log('API request:', url + '?' + payload);

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
          reject(NETWORK_ERROR);
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

    function CachedRequest(service, method, options) {
      return new Promise(function done(resolve, reject) {
        if (navigator.onLine) {
          Request(service, method, options).then(
            function success(response) {
              eme.Cache.addRequest(service, method, options, response);
              resolve(response);
            }, reject)
          .catch();
        }
        else {
          eme.Cache.getRequest(service, method, options)
            .then(function success(cachedResponse) {
              eme.log('using cached response:', service + '/' + method);
              resolve(cachedResponse);
            }, reject.bind(null, NETWORK_ERROR))
            .catch(reject);
        }
      });
    }
  }

  eme.api = new partnersAPI();

})(window.eme);
