var net = require('net');
var debug = require('debug')('marionette:tcp-sync-test-server');

const response = '53:{"from":"root","applicationType":"gecko","traits":[]}';

var server = net.createServer(function(connection) { //'connection' listener
  debug('server connected');
  connection.on('end', function() {
    debug('server disconnected');
  });
  connection.on('error', function(e) {
    debug('error', e);
  });
  connection.write(response);
  connection.pipe(connection);
});


function runServer(port) {
  server.listen(port, function() { //'listening' listener
    debug('server bound');
  });
}


if (require.main === module) {
  try {
    runServer(1234);
  }
  catch(e) {
  }
}
