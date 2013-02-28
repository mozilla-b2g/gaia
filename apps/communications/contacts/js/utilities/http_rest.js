'use strict';

// Enabling workers
var self = this;

if (!window.Rest) {
  window.Rest = (function() {

    function RestRequest(xhr) {
      this.cancel = function oncancel() {
        window.setTimeout(xhr.abort, 0);
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
        xhr.responseType = options.responseType || 'json';

        xhr.timeout = options.operationsTimeout || DEFAULT_TIMEOUT;

        xhr.onload = function(e) {
          if (xhr.status === 200 || xhr.status === 400 || xhr.status === 0) {
            if (callback && typeof callback.success === 'function')
              self.setTimeout(function() {
                callback.success(xhr.response);
              },0);
          }
          else {
            self.console.error('HTTP error executing GET. ',
                               uri, ' Status: ', xhr.status);
            if (callback && typeof callback.error === 'function')
              self.setTimeout(function errorHandler() {
                callback.error({ status: xhr.status });
              }, 0);
          }
        }; // onload

        xhr.ontimeout = function(e) {
          self.console.error('Timeout!!! while HTTP GET: ', uri);
          if (callback && typeof callback.timeout === 'function')
            self.setTimeout(callback.timeout, 0);
        }; // ontimeout

        xhr.onerror = function(e) {
          self.console.error('Error while executing HTTP GET: ', uri,
                                   ': ', e);
          if (callback && typeof callback.error === 'function')
            self.setTimeout(function() {
              callback.error(e);
            },0);
        }; // onerror

        xhr.send();

        return outReq;
      } // get
    };  // prototype

    return new Rest();
  })();
}
