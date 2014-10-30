suite('Marionette', function() {
  var marionette = require('../../lib/runtime/marionette').marionette;
  var filter = {
    foo: 1, bar: '2', host: ['firefox', 'b2g-desktop', 'device']
  };

  var originalMeta;

  suiteSetup(function() {
    originalMeta = marionette.metadata;
  });

  suiteTeardown(function() {
    marionette.metadata = originalMeta;
  });

  suite('parsing metadata', function() {
    var meta = { host: 'firefox', wifi: true };
    var encoded = new Buffer(JSON.stringify(meta)).toString('base64');

    teardown(function() {
      marionette.metadata = originalMeta;
    });

    setup(function() {
      marionette.metadata = null;
    });

    suite('success', function() {
      setup(function() {
        // we rely on the fact that setting metadata to null causes reparse.
        process.env.CHILD_METADATA = encoded;
        marionette('do stuff', {}, function() {});
      });

      test('metadata', function() {
        assert.deepEqual(marionette.metadata, meta);
      });
    });

    suite('failure', function() {
      var c_error;

      setup(function() {
        // Supress expected error messages
        c_error = console.error;
        console.error = function() {};

        process.env.CHILD_METADATA = 'IAM_NOT_BASE_64_OR_JSON';
        marionette('do stuff', {}, function() {});
      });

      teardown(function() {
        console.error = c_error;
      });

      test('gracefully fallback to object', function() {
        assert.deepEqual(marionette.metadata, {});
      });
    });
  });

  suite('running tests', function() {
    test('invokes function if meta matches filter', function(done) {
      marionette.metadata = { host: 'firefox' };
      marionette('test', { host: ['firefox'] }, done);
    });

    test('does not invoke function on meta/filter mismatch', function(done) {
      marionette.metadata = { host: 'xxx' };
      marionette('test', { x: true }, function() {
        done(new Error('should not execute function'));
      });
      process.nextTick(done);
    });
  });

});
