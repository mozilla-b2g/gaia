/*jshint browser: true */
/*global requireApp, suite, setup, testConfig, test, assert,
  teardown, suiteSetup, suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('model', function() {
  var model;

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done
      },
      ['model'],
      function(m) {
        model = m;
      }
    );
  });

  suite('no account by default', function() {
    test('hasAccount false', function() {
      assert.equal(model.hasAccount(), false);
      assert.equal(model.inited, false);
    });
  });


  suite('load default account', function() {
    var account, acctsSlice, foldersSlice;

    setup(function(done) {
      model.init();
      model.latestOnce('foldersSlice', function(foldersSlice) {
        account = model.account;
        acctsSlice = model.acctsSlice;
        foldersSlice = model.foldersSlice;
        done();
      });
    });

    test('hasAccount true', function() {
      assert.equal(model.hasAccount(), true);
      assert.equal(model.inited, true);
      assert.equal(acctsSlice.defaultAccount === account, true);
    });
  });

});
