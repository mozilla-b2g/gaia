(function(window) {
  'use strict';

  var Worker = window.TestAgent.BrowserWorker;


  function ErrorReporting() {

  };

  ErrorReporting.prototype = {
    enhance: function enhance(worker) {
      worker.on('sandbox error', this.onSandboxError.bind(this, worker));
    },

    onSandboxError: function onSandboxError(worker, data) {
      worker.send('error', data);
    }
  };

  Worker.ErrorReporting = ErrorReporting;

}(this));

