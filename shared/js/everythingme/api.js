'use strict';
/* global Promise */

(function(eme) {

  var OK = 1;
  var NETWORK_ERROR = 'network error';

  var API_URL = 'https://api.everything.me/partners/1.0/{resource}/';
  var API_KEY = '79011a035b40ef3d7baeabc8f85b862f';

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

    // must send API key
    options.apiKey = API_KEY;

    // device info
    options.lc = eme.device.lc;
    options.tz = eme.device.tz;
    options.osVersion = eme.device.osVersion;
    options.deviceId = eme.device.deviceId;
    options.deviceType = eme.device.deviceType;
    options.carrierName = eme.device.carrierName;

    // user location
    var position = eme.device.position;
    if (position && position.coords) {
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      options.latlon = (lat && lon) ? [lat,lon].join(',') : null;
    }

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

      httpRequest.send(payload);
    });

    promise.abort = function() {
      if (httpRequest.abort) {
        httpRequest.abort();
      }
    };

    return promise;
  }

  /** Make a Request and
   *  1. cache the response
   *  2. if offline, get response from cache
   */
  function CacheableRequest(service, method, options) {
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


  function PartnersAPI() {

    this.Apps = {
      MAX_QUERY_LENGTH : 128,

      search: function search(options) {
        if (!!options.query && options.query.length > this.MAX_QUERY_LENGTH) {
          options.query = options.query.substr(0, this.MAX_QUERY_LENGTH);
        }
        return Request('Apps', 'search', options);
      }
    };

    this.Search = {
      suggestions: function suggestions(options) {
        return Request('Search', 'suggestions', options);
      },
      bgimage: function bgimage(options) {
        options.width = eme.device.screen.width;
        options.height = eme.device.screen.height;

        return Request('Search', 'bgimage', options);
      }
    };

    this.Categories = {
      list: function list(options) {
        return CacheableRequest('Categories', 'list', options);
      }
    };
  }

  eme.api = new PartnersAPI();

})(window.eme);
