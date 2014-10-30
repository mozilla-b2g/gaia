(function(window) {
  /**
   * Creates websocket enhancement.
   *
   * @constructor
   * @param {Object} options see WebsocketClient for options.
   */
  function Websocket(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    options.url = options.url || this.defaults.url;
    options.retry = options.retry || this.defaults.retry;

    this.socket = new TestAgent.WebsocketClient(
      options
    );
  }

  Websocket.prototype = {

    defaults: {
      retry: true,
      url: 'ws://' + document.location.host.split(':')[0] + ':8789'
    },

    /**
     * Enhances worker to respond to
     * websocket events. Adds a send method
     * to communicate with the websocket server.
     *
     * @param {TestAgent.BrowserWorker} worker browser worker.
     */
    enhance: function(worker) {
      var socket = this.socket,
          originalEmit = socket.emit,
          originalSend = worker.send;

      if (originalSend) {
        worker.send = function() {
          socket.send.apply(socket, arguments);
          return originalSend.apply(worker, arguments);
        }
      } else {
        worker.send = socket.send.bind(socket);
      }

      socket.emit = function() {
        worker.emit.apply(worker, arguments);
        return originalEmit.apply(socket, arguments);
      };

      worker.on('worker start', socket.start.bind(socket));
    }

  };

  TestAgent.BrowserWorker.Websocket = Websocket;

}(this));
