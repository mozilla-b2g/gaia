'use strict';
/*jshint browser: true */
/*global requireApp, suite, testConfig, test, assert,
 suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('model acctsSlice, startup', function() {
  var api, model;

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done
      },
      ['api', 'model_create'],
      function(a, mc) {
        api = a;
        model = mc.defaultModel;
      }
    );
  });

  test('consistent view of acctsSlice initialization', function(done) {
    var fakeSlice = {
      oncomplete: function() { },
      items: [],
      die: function() { }
    };
    sinon.stub(api, 'viewAccounts').returns(fakeSlice);
    // Wait for model.init to finish this tick...
    setTimeout(function() {
      assert.ok(!model.acctsSlice,
                'model.acctsSlice should not be set ' +
                'before acctsSlice.oncomplete fires');

      fakeSlice.oncomplete();

      assert.ok(model.acctsSlice,
                'model.acctsSlice _should_ be set ' +
                'after acctsSlice.oncomplete fires');
      done();
    });
    model.init();
  });
});

