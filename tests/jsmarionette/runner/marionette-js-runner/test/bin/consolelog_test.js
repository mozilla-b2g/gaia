/* global spawnMarionette */
'use strict';
test('console.log --verbose', function(done) {
  this.timeout('10s');
  // Usual process spawning stuff the important bit here is this fixture will
  // fail and never complete unless we wait for 100s or kill the process.
  var proc = spawnMarionette([
    '--verbose',
    __dirname + '/fixtures/consolelog.js'
  ]);

  proc.stdout.on('data', function(buffer) {
    if (buffer.toString().indexOf('the fox say') !== -1) {
      proc.once('exit', done.bind(null, null));
      return;
    }
  });
});
