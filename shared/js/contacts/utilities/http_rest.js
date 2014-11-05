'use strict';

if (!window.Rest) {
  window.Rest = (function() {

    function RestRequest(xhr) {
      var cancelled = false;
      this.cancel = function oncancel() {
        cancelled = true;
        window.setTimeout(xhr.abort.bind(xhr), 0);
      };
      this.isCancelled = function isCancelled() {
        return cancelled;
      };
    }

    function Rest() { }

    Rest.prototype = {
      get: function(uri, callback, pOptions) {
        var DEFAULT_TIMEOUT = 30000;
        var options = pOptions || {};

        var xhr = new XMLHttpRequest({
          mozSystem: true
        });
        var outReq = new RestRequest(xhr);

        xhr.open('GET', uri, true);
        var responseType = options.responseType || 'json';
        xhr.responseType = responseType;
        var responseProperty = responseType === 'xml' ?
          'responseXML' : 'response';

        xhr.timeout = options.operationsTimeout || DEFAULT_TIMEOUT;
        if (!xhr.timeout || xhr.timeout === DEFAULT_TIMEOUT &&
           (parent && parent.config && parent.config.operationsTimeout)) {
          xhr.timeout = parent.config.operationsTimeout;
        }

        if (options.requestHeaders) {
          for (var header in options.requestHeaders) {
            xhr.setRequestHeader(header, options.requestHeaders[header]);
          }
        }

        xhr.onload = function(e) {
          if (xhr.status === 200 || xhr.status === 400 || xhr.status === 0) {
            if (callback && typeof callback.success === 'function') {
              setTimeout(function() {
                callback.success(xhr[responseProperty]);
              },0);
            }
          }
          else {
            console.error('HTTP error executing GET. ',
                               uri, ' Status: ', xhr.status);
            if (callback && typeof callback.error === 'function') {
              setTimeout(function errorHandler() {
                callback.error({ status: xhr.status });
              }, 0);
            }
          }
        }; // onload

        xhr.ontimeout = function(e) {
          console.error('Timeout!!! while HTTP GET: ', uri);
          if (callback && typeof callback.timeout === 'function') {
            setTimeout(callback.timeout, 0);
          }
        }; // ontimeout

        xhr.onerror = function(e) {
          console.error('Error while executing HTTP GET: ', uri,
                                   ': ', e);
          if (callback && typeof callback.error === 'function' &&
           !outReq.isCancelled()) {
            setTimeout(function() {
              callback.error(e);
            },0);
          }
        }; // onerror

        xhr.send();

        return outReq;
      } // get
    };  // prototype

    return new Rest();
  })();
}
