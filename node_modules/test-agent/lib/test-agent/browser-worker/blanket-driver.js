(function(window) {
  'use strict';

  function BlanketDriver(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  BlanketDriver.prototype = {
    /**
     * Location of the blanket runtime.
     */
    blanketUrl: './vendor/blanket/blanket.js',

    /**
     * Location of config for blanket.
     */
    configUrl: '/test/unit/blanket_config.json',

    /**
     * Default config when config file not found.
     */
    defaultConfig: {
      'data-cover-only': 'js/',
      'data-cover-never': 'test/unit/'
    },

    enhance: function enhance(worker) {
      var self = this;
      this.worker = worker;
      worker.coverageRunner = this._coverageRunner.bind(this);
      this.load(function(data) {
        self.blanketConfig = data || self.defaultConfig;
      });
    },

    _coverageRunner: function _coverageRunner(worker) {
      var box = worker.sandbox.getWindow();
      box.require(this.blanketUrl, function() {
        // Using custom reporter to replace blanket defaultReporter
        // Send coverage result from each sandbox to the top window for
        // aggregating the result
        box.blanket.options('reporter', function(data) {
          data = JSON.stringify(['coverage report', data]);
          window.top.postMessage(data, "http://test-agent.gaiamobile.org:8080");
        });
      }, this.blanketConfig);
    },

    /**
     * Parse XHR response
     *
     * @param {Object} xhr xhr object.
     */
    _parseResponse: function _parseResponse(xhr) {
      var response;

      if (xhr.responseText) {
        response = JSON.parse(xhr.responseText);
        // Only return files for now...
        return response;
      }

      return this.defaultConfig;
    },

    /**
     * Loads list of files from url
     */
    load: function load(callback) {
      var xhr = new XMLHttpRequest(),
          self = this,
          response;

      xhr.open('GET', this.configUrl, true);
      xhr.onload = function onload() {
        if (xhr.status === 200 || xhr.status === 0) {
          response = self._parseResponse(xhr);
        }

        callback.call(this, response);
      };

      xhr.send(null);
    }
  };

  window.TestAgent.BrowserWorker.BlanketDriver = BlanketDriver;

}(this));
