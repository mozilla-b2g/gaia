suite('lib/settings', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
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
      setting1: {
        some: 'stuff',
        options: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c' }
        ],
        persistent: true
      },
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
      this.settings.alias({
        key: 'myAlias',
        settings: {},
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
      assert.isDefined(this.settings.myAlias);
    });

    test('Should pass in the given key', function() {
      var options = this.settings.SettingAlias.args[0][0];
      assert.equal(options.key, 'myAlias');
    });
  });

  suite('Settings#dontSave()', function() {
    test('Should remove any save event handlers', function() {
      var setting1 = this.settings.setting1;
      var setting2 = this.settings.setting2;
      var setting3 = this.settings.setting3;

      sinon.spy(setting1, 'off');
      sinon.spy(setting2, 'off');
      sinon.spy(setting3, 'off');

      this.settings.dontSave();

      assert.isTrue(setting1.off.calledWith('change:selected', setting1.save));
      assert.isTrue(setting2.off.calledWith('change:selected', setting2.save));
      assert.isTrue(setting3.off.calledWith('change:selected', setting3.save));
    });
  });
});
