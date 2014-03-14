suite('controllers/settings', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req([
      'controllers/settings',
      'lib/settings',
      'lib/setting',
      'app',
      'views/notification'
    ], function(SettingsController, Settings, Setting, App, NotificationViews) {
      self.SettingsController = SettingsController.SettingsController;
      self.Settings = Settings;
      self.Setting = Setting;
      self.App = App;
      self.NotificationViews = NotificationViews;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);

    // Settings
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizesFront = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizesBack = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfiles = sinon.createStubInstance(this.Setting);
    this.app.settings.hdr = sinon.createStubInstance(this.Setting);
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationViews)
    };

    // Shortcut
    this.notification = this.app.views.notification;

    // Create test instance
    this.controller = new this.SettingsController(this.app);
  });

  suite('SettingsController()', function() {

  });

  suite('SettingsController#onOptionTap()', function() {
    setup(function() {
      this.setting = sinon.createStubInstance(this.Setting);
      sinon.stub(this.controller);
      this.controller.onOptionTap.restore();
    });

    test('Should select the given key on the given option', function() {
      this.controller.onOptionTap('the-key', this.setting);
      assert.isTrue(this.setting.select.calledWith('the-key'));
    });

    test('Should close the settings menu', function() {
      this.controller.onOptionTap('the-key', this.setting);
      assert.isTrue(this.controller.closeSettings.called);
    });

    test('Should notify', function() {
      this.controller.onOptionTap('the-key', this.setting);
      assert.isTrue(this.controller.notify.called);
    });
  });

  suite('SettingsController#notify()', function() {
    setup(function() {
      this.setting = sinon.createStubInstance(this.Setting);
    });

    test('Should display a notification', function() {
      this.controller.notify(this.setting);
      assert.isTrue(this.notification.display.called);
    });
  });

  suite('SettingsController#validMenuItem()', function() {
    test('Should return `false` if setting is disabled', function() {
      this.app.settings.hdr.get.withArgs('disabled').returns(true);
      var output = this.controller.validMenuItem({ key: 'hdr' });
      assert.ok(output === false);
    });

    test('Should return `false` if setting has no options', function() {
      this.app.settings.hdr.get.withArgs('disabled').returns(false);
      this.app.settings.hdr.get.withArgs('options').returns([]);
      var output = this.controller.validMenuItem({ key: 'hdr' });
      assert.ok(output === false);
    });

    test('Should return `false` if condition is false', function() {
      this.app.settings.hdr.get.withArgs('disabled').returns(false);
      this.app.settings.hdr.get.withArgs('options').returns(['a', 'b']);
      var output = this.controller.validMenuItem({
        key: 'hdr',
        condition: { mode: 'video' }
      });

      assert.ok(output === false);
    });

    test('Should return `true` if supported and condition is true', function() {
      this.app.settings.hdr.get.withArgs('disabled').returns(false);
      this.app.settings.hdr.get.withArgs('options').returns(['a', 'b']);
      this.app.settings.mode.selected.withArgs('key').returns('video');
      var output = this.controller.validMenuItem({
        key: 'hdr',
        condition: { mode: 'video' }
      });

      assert.isTrue(output);
    });

    test('Should return `true` if supported and no condition defined', function() {
      this.app.settings.hdr.get.withArgs('disabled').returns(false);
      this.app.settings.hdr.get.withArgs('options').returns(['a', 'b']);
      var output = this.controller.validMenuItem({ key: 'hdr' });

      assert.isTrue(output);
    });
  });
});
