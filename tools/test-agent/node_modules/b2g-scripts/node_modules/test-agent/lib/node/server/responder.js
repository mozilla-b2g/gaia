/**
 * Hooks up the server's responder to the .message events
 * of connected clients.
 *
 *
 *
 *    (new Responder()).enhance(server);
 *
 *    //... now the .responder of the server will 'respond' to events
 *
 *    server.on({
 *      'my event': function(data, socket){
 *
 *      }
 *    });
 *
 */
function Responder() {

}

Responder.prototype = {
  enhance: function enhance(server) {
    server.socket.on('connection', this._onConnection.bind(this, server));
  },

  _onConnection: function _onConnection(server ,socket) {
    socket.on('message', this._onConnectionMessage.bind(this, server, socket));
  },

  _onConnectionMessage: function _onConnectionMessage(server, socket, data) {
    server.respond(data, socket);
  }

};

module.exports = exports = Responder;
