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
      'views/notification',
      'views/settings'
    ], function(
      SettingsController, Settings, Setting,
      App, NotificationViews, SettingsView) {
      self.SettingsController = SettingsController.SettingsController;
      self.NotificationViews = NotificationViews;
      self.SettingsView = SettingsView;
      self.Settings = Settings;
      self.Setting = Setting;
      self.App = App;
      done();
    });
  });

  setup(function() {
    var self = this;

    this.app = sinon.createStubInstance(this.App);
    this.app.l10n = { get: sinon.stub() };

    // Settings
    this.app.el = {};
    this.app.formatPictureSizes = sinon.stub();
    this.app.formatRecorderProfiles = sinon.stub();
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizes = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfiles = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModesPicture = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModesVideo = sinon.createStubInstance(this.Setting);
    this.app.settings.hdr = sinon.createStubInstance(this.Setting);
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationViews)
    };

    // SettingsView mock
    this.app.SettingsView = sinon.spy(function() {
      var view = sinon.createStubInstance(self.SettingsView);
      view.render.returns(view);
      view.appendTo.returns(view);
      view.on.returns(view);
      return view;
    });

    // Shortcut
    this.notification = this.app.views.notification;
    this.settings = this.app.settings;

    // Create test instance
    this.controller = new this.SettingsController(this.app);
  });

  suite('SettingsController()', function() {
    test('Should setup aliases for `recorderProfiles`, `pictureSizes` and `flashModes`', function() {
      var aliases = this.controller.aliases;
      var alias = this.settings.alias;

      assert.isTrue(alias.calledWith('recorderProfiles', aliases.recorderProfiles));
      assert.isTrue(alias.calledWith('pictureSizes', aliases.pictureSizes));
      assert.isTrue(alias.calledWith('flashModes', aliases.flashModes));
    });

    test('Should toggle the settings menu on \'settings:toggle\'', function() {
      assert.isTrue(this.app.on.calledWith('settings:toggle', this.controller.toggleSettings));
    });

    test('Should listen for \'change:capabilities\'', function() {
      assert.isTrue(this.app.on.calledWith('change:capabilities', this.controller.onCapabilitiesChange));
    });
  });

  suite('SettingsController#configurePictureSizes()', function() {
    setup(function() {
      this.pictureSizes = [];
      this.exclude = ['480x320'];

      this.app.formatPictureSizes.returns('formatted');

      this.settings.pictureSizes.get
        .withArgs('exclude')
        .returns(this.exclude);

      this.settings.pictureSizes
        .get.withArgs('maxPixelSize')
        .returns(123);

      this.app.l10n.get
        .withArgs('mp')
        .returns('mp');

      // Run it
      this.controller.configurePictureSizes(this.pictureSizes);
    });

    test('Should format the raw pictureSizes list', function() {
      assert.isTrue(this.app.formatPictureSizes.calledWith(this.pictureSizes));
    });

    test('Should reset pictureSize options with formatted list', function() {
      assert.isTrue(this.settings.pictureSizes.resetOptions.calledWith('formatted'));
    });

    test('Should pass the raw recorderProfiles into formatRecorderProfiles', function() {
      var arg1 = this.app.formatPictureSizes.args[0][0];
      assert.equal(arg1, this.pictureSizes);
    });

    test('Should pass the `exclude`, `maxPixelSize` and `mp` options', function() {
      var options = this.app.formatPictureSizes.args[0][1];

      assert.equal(options.exclude, this.exclude);
      assert.equal(options.mp, 'mp');
      assert.equal(options.maxPixelSize, 123);
    });

    test('Should fire a \'configured\' event once done', function() {
      assert.isTrue(this.settings.pictureSizes.emit.calledWith('configured'));
    });
  });

suite('SettingsController#configureRecorderProfiles()', function() {
  setup(function() {
    this.recorderProfiles = {};
    this.exclude = ['1080p'];

    this.app.formatRecorderProfiles.returns('formatted');

    this.settings.recorderProfiles.get
      .withArgs('exclude')
      .returns(this.exclude);

    // Run it
    this.controller.configureRecorderProfiles(this.recorderProfiles);
  });

  test('Should format the raw pictureSizes list', function() {
    assert.isTrue(this.app.formatRecorderProfiles.calledWith(this.recorderProfiles));
  });

  test('Should reset pictureSize options with formatted list', function() {
    assert.isTrue(this.settings.recorderProfiles.resetOptions.calledWith('formatted'));
  });

  test('Should pass the raw recorderProfiles into formatRecorderProfiles', function() {
    var arg1 = this.app.formatRecorderProfiles.args[0][0];
    assert.equal(arg1, this.recorderProfiles);
  });

  test('Should pass `exclude` option to formatRecorderProfiles', function() {
    var options = this.app.formatRecorderProfiles.args[0][1];
    assert.equal(options.exclude, this.exclude);
  });

  test('Should fire a \'configured\' event once done', function() {
    assert.isTrue(this.settings.recorderProfiles.emit.calledWith('configured'));
  });
});

  suite('SettingsController#onOptionTap()', function() {
    setup(function() {
      this.setting = sinon.createStubInstance(this.Setting);
      sinon.stub(this.controller, 'closeSettings');
      sinon.stub(this.controller, 'notify');
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
    test('Should return `true` if supported', function() {
      var output;

      this.app.settings.hdr.supported.returns(true);
      output = this.controller.validMenuItem({ key: 'hdr' });
      assert.isTrue(output);

      this.app.settings.hdr.supported.returns(false);
      output = this.controller.validMenuItem({ key: 'hdr' });
      assert.isFalse(output);
    });

    test('Should cope with undefined settings', function() {
      assert.isFalse(this.controller.validMenuItem({ key: 'fake' }));
    });
  });

  suite('SettingsController#onCapabilitiesChange()', function() {
    setup(function() {
      this.capabilities = {
        hdr: ['on', 'off'],
        pictureSizes: [],
        recorderProfiles: [],
        flashModes: []
      };
    });

    test('Should filter both \'picture\' and \'video\' flashModes', function() {
      var picture = this.settings.flashModesPicture;
      var video = this.settings.flashModesVideo;

      this.controller.onCapabilitiesChange(this.capabilities);

      assert.ok(picture.filterOptions.calledWith(this.capabilities.flashModes));
      assert.ok(video.filterOptions.calledWith(this.capabilities.flashModes));
    });

    test('Should filter hdr', function() {
      this.controller.onCapabilitiesChange(this.capabilities);
      assert.ok(this.settings.hdr.filterOptions.calledWith(this.capabilities.hdr));
    });

    test('Should reset pictureSizes and recorderProfiles options', function() {
      var recorderProfiles = this.settings.recorderProfiles;
      var pictureSizes = this.settings.pictureSizes;

      this.controller.onCapabilitiesChange(this.capabilities);

      assert.ok(recorderProfiles.resetOptions.called);
      assert.ok(pictureSizes.resetOptions.called);
    });

    test('Should emit \'configured\' event when done', function() {
      var recorderProfiles = this.settings.recorderProfiles;
      var pictureSizes = this.settings.pictureSizes;

      this.controller.onCapabilitiesChange(this.capabilities);

      assert.ok(recorderProfiles.emit.calledWith('configured'));
      assert.ok(pictureSizes.emit.calledWith('configured'));
    });
  });

  suite('SettingsController#toggleSettings()', function() {
    setup(function() {
      sinon.stub(this.controller, 'closeSettings');
      sinon.stub(this.controller, 'openSettings');
    });

    test('Should close the settings if a `view` is present', function() {
      this.controller.view = 'defined';
      this.controller.toggleSettings();
      assert.isTrue(this.controller.closeSettings.called);
    });

    test('Should open the settings if a `view` is not present', function() {
      this.controller.view = undefined;
      this.controller.toggleSettings();
      assert.isTrue(this.controller.openSettings.called);
    });
  });

  suite('SettingsController#openSettings()', function() {
    setup(function() {
      this.menuItems = [];
      sinon.stub(this.controller, 'menuItems').returns(this.menuItems);

      // Call it
      this.controller.openSettings();
    });


    test('Should create a new SettingsView passing menu items', function() {
      var options = this.app.SettingsView.args[0][0];

      assert.isTrue(this.app.SettingsView.called);
      assert.equal(options.items, this.menuItems);
    });

    test('Should render and appendTo app.el', function() {
      assert.isTrue(this.controller.view.render.called);
      assert.isTrue(this.controller.view.appendTo.calledWith(this.app.el));
    });

    test('Should bind to `click:close` and `click:option` events', function() {
      assert.isTrue(this.controller.view.on.calledWith('click:close'));
      assert.isTrue(this.controller.view.on.calledWith('click:option'));
    });

    test('Should emit a `settings:open` event', function() {
      assert.isTrue(this.app.emit.calledWith('settings:opened'));
    });

    test('Should not do anything if a view already exists', function() {
      this.app.SettingsView.reset();
      this.controller.view = 'defined';
      this.controller.openSettings();
      assert.isFalse(this.app.SettingsView.called);
    });
  });

  suite('SettingsController#closeSettings()', function() {
    setup(function() {
      this.view = { destroy: sinon.spy() };
      this.controller.view = this.view;
    });

    test('Should not do anything if no view exists', function() {
      this.controller.view = undefined;
      this.controller.closeSettings();
      assert.isFalse(this.app.emit.calledWith('settings:closed'));
    });

    test('Should destroy the view', function() {
      this.controller.closeSettings();
      assert.isTrue(this.view.destroy.called);
    });

    test('Should null out `view`', function() {
      this.controller.closeSettings();
      assert.equal(this.controller.view, null);
    });
  });
});
