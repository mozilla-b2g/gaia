'use strict';

suite('Root', function() {
  var map = {
    '*': {
      'shared/lazyLoader': 'MockLazyLoader'
    }
  };
  var modules = [
    'panels/root/root',
    'MockLazyLoader'
  ];

  suiteSetup(function(done) {
    this.MockLazyLoader = {
      load: function(scripts, callback) { setTimeout(callback); }
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockLazyLoader', function() {
      return this.MockLazyLoader;
    }.bind(this));

    requireCtx(modules, function(Root) {

      this.Root = Root;
      done();
    }.bind(this));
  });

  suite('init', function() {
    var sandbox;
    var fakeTimer;
    var root;

    setup(function() {
      sandbox = sinon.sandbox.create();
      fakeTimer = sinon.useFakeTimers();
      root = this.Root();
      sandbox.stub(root, '_loadScripts');
      root.init();
    });

    teardown(function() {
      sandbox.restore();
      fakeTimer.restore();
    });

    test('_loadScripts should be called', function() {
      fakeTimer.tick();
      sinon.assert.called(root._loadScripts);
    });
  });
});
