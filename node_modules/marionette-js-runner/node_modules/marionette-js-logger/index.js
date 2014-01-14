var clientHandler = require('./lib/client').client;
var Server = require('./lib/server').Server;

function setup(client, options) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var server = new Server();

  client.addHook('startSession', function(done) {
    // port is given
    if (options && options.port) {
      server.listen(options.port);
      clientHandler(client, options.port, done);
    } else {
      server.listen(function(err, ws, port) {
        if (err) return callback(err);
        clientHandler(client, port, done);
      });
    }
  });

  // XXX: major hack around the fact we can't get this working sync
  if (options && options.autoClose) {
    client.addHook('deleteSession', server.close.bind(server));
  }

  return server;
}

module.exports.setup = setup;
