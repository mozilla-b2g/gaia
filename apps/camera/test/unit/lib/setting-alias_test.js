suite('lib/setting-alias', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'lib/setting',
      'lib/setting-alias',
    ], function(Setting, SettingAlias) {
      self.Setting = Setting;
      self.SettingAlias = SettingAlias;
      done();
    });
  });

  setup(function() {
    var self = this;

    // We use this object to store state
    // as nested Suites and tests' context
    // inherits from this context.
    this.state = {};
    this.state.value = 'a';

    this.settings = {
      a: new this.Setting({ key: 'a' }),
      b: new this.Setting({ key: 'b' })
    };

    this.alias = new this.SettingAlias({
      key: 'my-alias',
      settings: this.settings,
      map: {
        'a': 'a',
        'b': 'b',
      },
      get: function() {
        return this.settings[this.map[self.state.value]];
      }
    });
  });

  suite('SettingAlias()', function() {
    test('Should store various options', function() {
      assert.equal(this.alias.key, 'my-alias');
      assert.equal(this.alias.settings, this.settings);
      assert.equal(this.alias.map.a, 'a');
    });
  });

  suite('SettingAlias#get()', function() {
    test('Should get the current setting', function() {
      assert.equal(this.alias.get().key, 'a');
      this.state.value = 'b';
      assert.equal(this.alias.get().key, 'b');
    });
  });

  suite('SettingAlias#on()', function() {
    test('Should fire callback when *current* setting emits event', function() {
      var callback = sinon.spy();
      this.alias.on('event', callback);
      this.settings.a.fire('event');
      this.settings.b.fire('event');
      assert.ok(callback.calledOnce);
    });

    test('Should pass arguments to the callback', function() {
      var callback = sinon.spy();
      this.alias.on('event', callback);
      this.settings.a.fire('event', 'a', 'b');
      assert.ok(callback.calledWith('a', 'b'));
    });
  });

  suite('SettingAlias#off()', function() {
    test('Should be able to remove listeners', function() {
      var callback = sinon.spy();

      this.alias.on('event', callback);
      this.settings.a.fire('event');
      assert.ok(callback.called);
      callback.reset();

      this.alias.off('event', callback);
      this.settings.a.fire('event');
      assert.ok(!callback.called);
    });
  });
});
