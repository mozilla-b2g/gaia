(function(window) {

  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  var Server = window.TestAgent.Config = function Config(options) {
    var key;

    for (key in options) {
       if (options.hasOwnProperty(key)) {
        this[key] = options[key];
       }
    }
  };

  Server.prototype = {
    /**
     * URL to the json fiel which contains
     * a list of files to load.
     *
     * @type String
     */
    url: '',

    /**
     * Ready is true when resources have been loaded
     *
     * @type Boolean
     */
    ready: false,

    /**
     * List of test resources.
     *
     * @type Array
     */
    resources: [],

    /**
     * Parse XHR response
     *
     * @param {Object} xhr xhr object.
     */
    _parseResponse: function _parseResponse(xhr) {
      var response;

      if (xhr.responseText) {
        response = JSON.parse(xhr.responseText);
        //only return files for now...
        return response;
      }

      return {
        tests: []
      };
    },

    /**
     * Loads list of files from url
     *
     */
    load: function load(callback) {
      var xhr = new XMLHttpRequest(),
          self = this,
          response;

      xhr.open('GET', this.url, true);
      xhr.onreadystatechange = function onReadyStateChange() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 0) {
            response = self._parseResponse(xhr);

            self.ready = true;
            self.resources = response.tests;

            callback.call(this, response);
          } else {
            throw new Error('Could not fetch tests from "' + self.url + '"');
          }
        } else {
        }
      };

      xhr.send(null);
    }
  };

  //backwards compat
  Server.prototype._loadResource = Server.prototype.load;

}(this));

