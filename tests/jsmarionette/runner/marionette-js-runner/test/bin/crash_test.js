/* global assert, spawnMarionette */
'use strict';
suite('Crash handling', function() {
  this.timeout('20s');

  var proc;
  test('handle crash', function(done) {
    // Usual process spawning stuff the important bit here is this fixture will
    // fail and never complete unless we wait for 100s or kill the process.
    proc = spawnMarionette([__dirname + '/fixtures/crash.js']);

    var hasCrash;
    proc.stderr.on('data', function(buffer) {
      if (buffer.toString().indexOf('Crash detected ') !== -1) {
        hasCrash = true;
      }
    });

    proc.once('exit', function(code) {
      assert(hasCrash, 'has crash message');
      assert(code !== 0, 'must exit in error');
      done();
    });
  });
});
