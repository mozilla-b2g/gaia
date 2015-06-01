'use strict';
var fork = require('child_process').fork;

suite('marionette/drivers/tcp-sync', function() {

  var child = null;

  teardown(function() {
    if (child) {
      child.kill();
      child = null;
    }
  });

  test('can wait for marionette socket', function(done) {

    this.timeout(5000);

    var TcpSync =
      require(__dirname + '/../../../lib/marionette/drivers/tcp-sync');
    var tcpSync = new TcpSync({port: 1234, host: 'localhost'});

    tcpSync.waitForSocket( {timeout: 3000} , function() {
      done();
    });

    setTimeout(function () {
      fork(__dirname + '/tcp-sync-test-server.js');
    }, 1000);

  });

});

