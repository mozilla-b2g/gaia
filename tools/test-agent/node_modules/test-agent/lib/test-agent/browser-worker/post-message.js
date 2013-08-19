(function(window) {

  function PostMessage(options) {
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

  PostMessage.prototype = {

    window: window,

    allowedDomains: '*',

    targetWindow: window.parent,

    enhance: function enhance(worker) {
      var originalSend = worker.send,
          self = this,
          onMessage = this.onMessage.bind(this, worker);

      if (originalSend) {
        worker.send = function() {
          self.postMessage.apply(self, arguments);
          return originalSend.apply(worker, arguments);
        }
      } else {
        worker.send = self.postMessage.bind(self);
      }

      worker.on('worker start', function() {
        worker.send('worker start', {
          type: 'post-message',
          domain: window.location.href
        });
      });

      this.window.addEventListener('message', onMessage);
    },

    onMessage: function onMessage(worker, event) {
      var data = event.data;
      if (data) {
        if (typeof(data) === 'string') {
          data = JSON.parse(data);
        }
        worker.respond(data);
      }
    },

    postMessage: function postMessage() {
      if (this.targetWindow === this.window) {
        //prevent sending messages to myself!
        return;
      }

      var args = Array.prototype.slice.call(arguments);
      args = JSON.stringify(args);
      this.targetWindow.postMessage(args, this.allowedDomains);
    }

  };

  window.TestAgent.BrowserWorker.PostMessage = PostMessage;

}(this));
