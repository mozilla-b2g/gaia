suite('lib/setting-alias', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require([
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

    this.value = 'a';
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
        return this.settings[this.map[self.value]];
      }
    });
  });

  suite('SettingAlias()', function() {
    test('Should store various options', function() {
      assert.ok(this.alias.key === 'my-alias');
      assert.ok(this.alias.settings === this.settings);
      assert.ok(this.alias.map.a === 'a');
    });
  });

  suite('SettingAlias#get()', function() {
    test('Should get the current setting', function() {
      assert.ok(this.alias.get().key === 'a');
      this.value = 'b';
      assert.ok(this.alias.get().key === 'b');
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
