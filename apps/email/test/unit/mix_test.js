/*jshint browser: true */
/*global requireApp, suite, testConfig, test, assert,
  suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('mix', function() {
  var mix;

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done
      },
      ['mix'],
      function(m) {
        mix = m;
      }
    );
  });

  suite('#mix', function() {

    test('basic use', function() {
      var target = {
            'a': 'target',
            'b': 'target'
          },
          source = {
            'b': 'source',
            'c': 'source'
          };

      mix(target, source);

      assert.equal('target', target.a);
      assert.equal('target', target.b);
      assert.equal('source', target.c);
    });

    test('override', function() {
      var target = {
            'a': 'target',
            'b': 'target'
          },
          source = {
            'b': 'source',
            'c': 'source'
          };

      mix(target, source, true);

      assert.equal('target', target.a);
      assert.equal('source', target.b);
      assert.equal('source', target.c);
    });

  });

});
