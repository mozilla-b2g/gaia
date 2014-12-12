'use strict';

suite('Root', function() {
  var realL10n;
  var map = {
    '*': {
      'shared/lazyLoader': 'MockLazyLoader'
    }
  };
  var modules = [
    'shared_mocks/mock_l10n',
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

    requireCtx(modules, function(MockL10n, Root) {
      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;

      this.Root = Root;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
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
