var debug = require('debug')('socket-retry-connect'),
    net = require('net');

var MAX_TRIES = 10;
var WAIT_BETWEEN_TRIES_MS = 250;

/**
 * Tries to connect to a given socket location.
 * Time between retires grows in relation to attempts (attempt * RETRY_TIMER).
 *
 *  waitForSocket({ port: 2828, maxTries: 10 }, function(err, socket) {
 *  });
 *
 * Note- there is a third argument used to recursion that should
 * never be used publicly.
 *
 * Options:
 *  - (Number) port: to connect to.
 *  - (String) host: to connect to.
 *  - (Number) tries: number of times to attempt the connect.
 *
 * @param {Object} options for connection.
 * @param {Function} callback [err, socket].
 */
function waitForSocket(options, callback, _tries) {
  if (!options.port)
    throw new Error('.port is a required option');

  var maxTries = options.tries || MAX_TRIES;
  var host = options.host || 'localhost';
  var port = options.port;


  debug('attempt to open socket', port, host);
  _tries = _tries || 0;
  if (_tries >= maxTries)
    return callback(new Error('cannot open socket'));

  function handleError() {
    debug('socket is not ready trying');
    // retry connection
    setTimeout(
      waitForSocket,
      // wait at least WAIT_BETWEEN_TRIES_MS or a multiplier
      // of the attempts.
      (WAIT_BETWEEN_TRIES_MS * _tries) || WAIT_BETWEEN_TRIES_MS,
      options,
      callback,
      ++_tries
    );
  }

  var socket = net.connect(port, host, function(one, two) {
    debug('connected', port, host);
    socket.removeListener('error', handleError);
    callback(null, socket);
  });
  socket.once('error', handleError);
}

module.exports.waitForSocket = waitForSocket;

