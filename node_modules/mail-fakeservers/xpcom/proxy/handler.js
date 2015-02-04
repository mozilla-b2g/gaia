var FakeServerProxyHandler = (function() {

  // we use the nicer TcpSocket interface from web content
  var TcpSocket = new Components.classes['@mozilla.org/tcp-socket;1'];

  /**
   * @param {Number} port for handler.
   * @param {Number} [host="127.0.0.1"] for handler.
   * @constructor
   */
  function Handler(port, host) {
    this.host = host || '127.0.0.1';
    this.port = port;

    // connect to the socket
    this.socket =
      TcpSocket.open(this.host, this.port, { binaryType: 'arraybuffer' });

    this.socket.ondata = (function(evt) {
      // we need to wrap the ArrayBuffer in a Uint8Array otherwise
      // jsonWireProtocol cannot parse (because instanceof ArrayBuffer does not
      // work as expected in this context)
      var data = new Uint8Array(evt.data);

      // parse out the request and handle it.
      var [id, content] = jsonWireProtocol.parse(data);
      this.handleRequest(id, content);
    }.bind(this));

    // if the socket closes we are done
    this.socket.onclose = function() {
      EventLoop.stop();
    };

    // start server
    this.controlServer = FakeServerSupport.makeControlHttpServer().server;

    // must be last sync action otherwise it blocks.
    EventLoop.start();
  }

  Handler.prototype = {
    /**
     * Handles a request from the proxy server.
     *
     * @param {Number} id of request.
     * @param {Object} content of request.
     */
    handleRequest: function(id, content) {
      /**
       * Specially wrapped callback to abstract completion details.
       *
       * @param {Object} object response.
       * @private
       */
      var respond = (function respond(object) {
        var string = jsonWireProtocol.stringify(
          [id, object]
        );

        // write into an array buffer
        var encoder = new TextEncoder();
        var buffer = encoder.encode(string).buffer;

        this.socket.send(buffer);
      }.bind(this));

      // first piece is the method
      var method = content.shift();

      if (method in this) {
        // everything else is the arguments
        this[method].apply(this, content.concat(respond));
      }
    },

    /**
     * Close all existing servers.
     *
     * @param {Function} callback to signal cleanup.
     */
    cleanup: function(callback) {
      this.controlServer.cleanup();
      callback();
    },

    /**
     * Returns the control server port.
     *
     * @param {Function} callback [Object].
     */
    getControlPort: function(callback) {
      callback(this.controlServer.port);
    }
  };

  return Handler;
}());
