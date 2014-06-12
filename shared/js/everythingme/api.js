'use strict';
/* global Promise */

(function(eme) {

  const OK = 1;
  const NETWORK_ERROR = 'network error';

  const API_URL = 'https://api.everything.me/partners/1.0/{resource}/';
  const API_KEY = '79011a035b40ef3d7baeabc8f85b862f';

  var device = eme.device;

  function getCtx() {
    var w = device.screen.width;
    var h = device.screen.height;

    var lat;
    var lon;
    var position = device.position;

    if (position && position.coords) {
      lat = position.coords.latitude;
      lon = position.coords.longitude;
    }

    // default to undefined's so that JSON.stringify will drop them
    return {
      lc: device.language || undefined,
      tz: device.timezone || undefined,
      v:  device.osVersion || undefined,
      dn: device.deviceName || undefined,
      cr: device.carrier || undefined,
      sr: (w && h) ? [w, h].join('x') : undefined,
      ll: (lat && lon) ? [lat,lon].join(',') : undefined
      // TODO hc: home country
      // TODO ct: connection type - wifi, 2g, 3g, 4g
    };

  }

  var ICON_FORMAT = 20;

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

    options.apiKey = API_KEY;
    options.deviceId = eme.device.deviceId;

    options.ctx = getCtx();

    for (var opt in options) {
      var value = options[opt];
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }

        payload += opt + '=' + encodeURIComponent(value) + '&';
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

        options.iconFormat = ICON_FORMAT;

        return Request('Apps', 'search', options);
      }
    };

    this.Search = {
      suggestions: function suggestions(options) {
        return Request('Search', 'suggestions', options);
      },
      bgimage: function bgimage(options) {
        // Some devices contain fractions in dimensions
        // which the eme api server does not accept
        // so Math.ceil (http://bugzil.la/1023312)
        options.width = Math.ceil(eme.device.screen.width);
        options.height = Math.ceil(eme.device.screen.height);

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
