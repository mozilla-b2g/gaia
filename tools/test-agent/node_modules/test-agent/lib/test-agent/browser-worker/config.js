(function(window) {
  'use strict';

  var Worker = window.TestAgent.BrowserWorker;


  Worker.Config = function Config(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    this.config = new TestAgent.Config(options);
  };

  Worker.Config.prototype = {
    enhance: function enhance(worker) {
      worker.config = this._config.bind(this, worker, this.config);
    },

    _config: function _config(worker, config, callback) {
      config.load(function(data) {
        worker.emit('config', data);
        if (callback) {
          callback(data);
        }
      });
    }

  };

}(this));
