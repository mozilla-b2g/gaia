var WAIT_FOR = 'from',
    NEXT_TICK = 75,
    WaitForMarionette,
    net = require('net');

WaitForMarionette = require('../lib/script')({
  desc: 'Waits until a marionette port is ready',
  usage: 'wait-for-marionette [--port 2828] [--timeout 2000]',

  options: {
    port: {
      alias: 'p',
      desc: 'port to wait for',
      default: 2828
    },

    timeout: {
      desc: 'max wait time milliseconds',
      default: 2000
    }
  }

}, function(argv) {
  var socket,
      buffer = '',
      stopAt = (Date.now() + parseInt(argv.timeout));


  function sendFail() {
    console.log('-- timeout could not connect --');
    process.exit(1);
  }

  function checkBuffer() {
    if(buffer.indexOf(WAIT_FOR) !== -1) {
      //make sure socket closes cleanly
      socket.on('close', function() {
        console.log('-- marionette is ready --')
        process.exit(0);
      });
      socket.destroy();
    }
  }

  function tryConnect() {
    if(Date.now() > stopAt) {
      sendFail();
    }

    socket = net.connect(argv.port, {
      timeout: argv.timeout
    });

    function onData(data) {
      buffer += data.toString();
      checkBuffer();
    }

    function onError() {
      socket.removeListener('connect', onConnect);
      socket.removeListener('data', onData);
      setTimeout(tryConnect, NEXT_TICK);
    }

    function onConnect() {
      socket.removeListener('error', onError);
    }

    socket.on('data', onData);
    socket.once('connect', onConnect);
    socket.once('error', onError);
  }

  /**
   * Tries to open a connection to the
   * socket. If the connection fails
   * to open try again in INCREMENTS
   * number of ms
   */
  tryConnect();

});

module.exports = WaitForMarionette;
