suite('lib/settings', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require([
      'lib/settings',
      'lib/setting'
    ], function(Settings, Setting) {
      self.Settings = Settings;
      self.Setting = Setting;
      done();
    });
  });

  setup(function() {
    this.settings = new this.Settings({
      setting1: { some: 'stuff' },
      setting2: { some: 'stuff' },
      setting3: { some: 'stuff' }
    });
  });

  suite('Settings()', function() {
    test('Should store each setting on self by key', function() {
      assert.isTrue(this.settings.setting1 instanceof this.Setting);
      assert.isTrue(this.settings.setting2 instanceof this.Setting);
      assert.isTrue(this.settings.setting3 instanceof this.Setting);
    });
  });

  suite('Settings#fetch()', function() {
    setup(function() {
      sinon.stub(this.settings.setting1, 'fetch');
      sinon.stub(this.settings.setting2, 'fetch');
      sinon.stub(this.settings.setting3, 'fetch');
    });

    test('Should call fetch() on each setting', function() {
      this.settings.fetch();
      assert.isTrue(this.settings.setting1.fetch.called);
      assert.isTrue(this.settings.setting2.fetch.called);
      assert.isTrue(this.settings.setting3.fetch.called);
    });
  });

  suite('Settings#alias()', function() {
    setup(function() {
      sinon.spy(this.settings, 'SettingAlias');
      this.settings.alias('myAlias', {
        map: {},
        get: function() {}
      });
    });

    teardown(function() {
      this.settings.SettingAlias.restore();
    });

    test('Should call SettingAlias', function() {
      assert.isTrue(this.settings.SettingAlias.called);
    });

    test('Should store the alias on self by key', function() {
      assert.ok(this.settings.myAlias);
    });

    test('Should pass in the given key', function() {
      var options = this.settings.SettingAlias.args[0][0];
      assert.equal(options.key, 'myAlias');
    });

    test('Should pass in self as `settings`', function() {
      var options = this.settings.SettingAlias.args[0][0];
      assert.equal(options.settings, this.settings);
    });
  });
});
