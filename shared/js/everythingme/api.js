'use strict';
/* global Promise */

(function(eme) {

  const NETWORK_ERROR = 'network error';
  const API_KEY = '79011a035b40ef3d7baeabc8f85b862f';

  const ICON_FORMAT = 20;

  var device = eme.device;

  function getCtx() {
    var w = device.screen.width;
    var h = device.screen.height;

    // default to undefined's so that JSON.stringify will drop them
    return {
      lc: device.language || undefined,
      tz: device.timezone || undefined,
      v:  device.osVersion || undefined,
      dn: device.deviceName || undefined,
      cr: device.carrier || undefined,
      ct: device.dataConnectionType || undefined,
      mcc: device.mcc || undefined,
      mnc: device.mnc || undefined,
      sr: (w && h) ? [w, h].join('x') : undefined
    };

  }

  /**
   * Make an async httpRequest to resource with given options.
   * Returns a promise which will be resolved/reject on success/error
   * respectively
   */
  function Request(service, method, options) {

    if (!eme.config.apiUrl) {
      return new Promise(function(resolve, reject) {
        reject('eme.config.apiUrl not defined');
      });
    }

    var resource = service + '/' + method;
    var url = eme.config.apiUrl.replace('{resource}', resource);
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

    eme.log('API request:', decodeURIComponent(url + '?' + payload));

    var httpRequest;
    var promise = new Promise(function done(resolve, reject) {
      httpRequest = new XMLHttpRequest({mozSystem: true});
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

        if (response && response.errorCode > 0) {
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

  function SanitizeAppSearch(result) {
    return new Promise(function(resolve, reject) {
      // Sanitize app URLs returned from e.me
      var apps = result.response.apps;
      if (apps.length) {
        var a = document.createElement('a');
        for (var i = 0, iLen = apps.length; i < iLen; i++) {
          a.href = apps[i].appUrl;
          apps[i].appUrl = a.href;
        }
      }
      resolve(result);
    });
  }

  function PartnersAPI() {

    this.Apps = {
      MAX_QUERY_LENGTH : 128,

      nativeInfo: function nativeInfo(options) {
        if (options.guids && options.guids.length) {
          // string together ids like so:
          // Apps/nativeInfo/?guids=["guid1","guid2","guid3", ...]
          options.guids = JSON.stringify(options.guids);
        }

        return Request('Apps', 'nativeInfo', options);
      },

      search: function search(options) {
        if (!!options.query && options.query.length > this.MAX_QUERY_LENGTH) {
          options.query = options.query.substr(0, this.MAX_QUERY_LENGTH);
        }

        options.iconFormat = ICON_FORMAT;

        return Request('Apps', 'search', options).then(SanitizeAppSearch);
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
        options.width = Math.ceil(options.width || eme.device.screen.width);
        options.height = Math.ceil(options.height || eme.device.screen.height);

        return Request('Search', 'bgimage', options);
      }
    };

    /** Make a Request and
     *  1. on success: cache the response
     *  2. on error: get response from cache
     *  2.1 on error: reject with NETWORK_ERROR
     */
    this.Categories = {
      list: function list(options) {
        var request = Request('Categories', 'list', options);

        return request.then(
          response => {
            eme.Cache.addRequest('Categories', 'list', options, response);
            return response;
          },
          () => {
            return eme.Cache.getRequest('Categories', 'list', options)
                      .then(response => {
                        eme.log('using cached response (Categories/list)');
                        return response;
                      })
                      .catch(() => Promise.reject(NETWORK_ERROR));
          });
      }
    };
  }

  eme.api = new PartnersAPI();

})(window.eme);
