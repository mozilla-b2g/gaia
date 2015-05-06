suite('controllers/settings', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
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
    this.app.l10ngGet = sinon.stub();

    // Settings
    this.app.el = {};
    this.app.activity = { active: false };
    this.app.formatPictureSizes = sinon.stub();
    this.app.formatRecorderProfiles = sinon.stub();
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizes = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizesFront = sinon.createStubInstance(this.Setting);
    this.app.settings.pictureSizesBack = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfiles = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfilesFront = sinon.createStubInstance(this.Setting);
    this.app.settings.recorderProfilesBack = sinon.createStubInstance(this.Setting);
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
      view.fadeOut.callsArg(0);
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
      sinon.assert.calledThrice(this.settings.alias);
    });

    test('Should toggle the settings menu on \'settings:toggle\'', function() {
      assert.isTrue(this.app.on.calledWith('settings:toggle', this.controller.toggleSettings));
    });

    test('Should update the settings when the camera hardware changes', function() {
      assert.isTrue(this.app.on.calledWith('camera:newcamera', this.controller.onNewCamera));
    });

    test('Should format pictreSize titles when the app is localized', function() {
      assert.isTrue(this.app.on.calledWith('localized', this.controller.formatPictureSizeTitles));
    });

    test('Should listen to \'camera:newcamera\'', function() {
      assert.isTrue(this.app.on.calledWith('camera:newcamera', this.controller.onNewCamera));
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

      this.app.l10nGet
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

    test('Should pass the `exclude`', function() {
      var options = this.app.formatPictureSizes.args[0][1];

      assert.equal(options.exclude, this.exclude);
    });
  });

suite('SettingsController#configureRecorderProfiles()', function() {
  setup(function() {
    this.recorderProfiles = {};
    this.formatted = ['a', 'b', 'c'];
    this.exclude = ['1080p'];

    this.app.formatRecorderProfiles
      .returns(this.formatted);

    this.settings.recorderProfiles.get
      .withArgs('exclude')
      .returns(this.exclude);

    // Run it
    this.controller.configureRecorderProfiles(this.recorderProfiles);
  });

  test('Should format the raw recorderProfiles list', function() {
    assert.isTrue(this.app.formatRecorderProfiles.calledWith(this.recorderProfiles));
  });

  test('Should reset recorderProfiles options with formatted list', function() {
    assert.isTrue(this.settings.recorderProfiles.resetOptions.calledWith(this.formatted));
  });

  test('Should pass the raw recorderProfiles into formatRecorderProfiles', function() {
    var arg1 = this.app.formatRecorderProfiles.args[0][0];
    assert.equal(arg1, this.recorderProfiles);
  });

  test('Should pass `exclude` option to formatRecorderProfiles', function() {
    var options = this.app.formatRecorderProfiles.args[0][1];
    assert.equal(options.exclude, this.exclude);
  });

  test('Should pick the last formatted recorderProfile if `maxFileSize` is defined', function() {
    this.settings.recorderProfiles.resetOptions.reset();

    this.settings.recorderProfiles.get
      .withArgs('maxFileSizeBytes')
      .returns(100);

    this.controller.configureRecorderProfiles(this.recorderProfiles);
    var arg = this.settings.recorderProfiles.resetOptions.args[0][0];

    assert.deepEqual(arg, ['c']);
  });
});

  suite('SettingsController#onOptionTap()', function() {
    setup(function() {
      this.setting = sinon.createStubInstance(this.Setting);
      sinon.stub(this.controller, 'closeSettings').callsArg(0);
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

    test('It shows a notification after the settings have closed', function() {
      this.controller.onOptionTap('the-key', this.setting);
      assert.isTrue(this.controller.notify.calledAfter(this.controller.closeSettings));
    });
  });

  suite('SettingsController#notify()', function() {
    setup(function() {
      this.setting = sinon.createStubInstance(this.Setting);
      this.setting.selected.withArgs('title').returns('l10n-key');
    });

    test('Should display a notification', function() {
      this.controller.notify(this.setting);
      assert.isTrue(this.notification.display.called);
    });

    test('Should not display a notification if flagged `false`', function() {
      this.setting.get.withArgs('notifications').returns(false);
      this.controller.notify(this.setting);
      sinon.assert.notCalled(this.notification.display);
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

  suite('SettingsController#onNewCamera()', function() {
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

      this.controller.onNewCamera(this.capabilities);

      assert.ok(picture.filterOptions.calledWith(this.capabilities.flashModes));
      assert.ok(video.filterOptions.calledWith(this.capabilities.flashModes));
    });

    test('Should filter hdr', function() {
      this.controller.onNewCamera(this.capabilities);
      assert.ok(this.settings.hdr.filterOptions.calledWith(this.capabilities.hdr));
    });

    test('Should reset pictureSizes and recorderProfiles options', function() {
      var recorderProfiles = this.settings.recorderProfiles;
      var pictureSizes = this.settings.pictureSizes;

      this.controller.onNewCamera(this.capabilities);

      assert.ok(recorderProfiles.resetOptions.called);
      assert.ok(pictureSizes.resetOptions.called);
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
      // Open settings first so we have a view
      sinon.stub(this.controller, 'menuItems').returns(this.menuItems);
      this.controller.openSettings();
      this.view = this.controller.view;
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


  suite('SettingsController#formatPictureSizeTitles()', function() {
    setup(function() {
      this.options = [
        {
          key: '400x300',
          data: {
            mp: 0,
            width: 400,
            height: 300,
            aspect: '4:3'
          }
        },
        {
          key: '1600x900',
          data: {
            mp: 1,
            width: 1600,
            height: 900,
            aspect: '16:9'
          }
        },
        {
          key: '3200x1800',
          data: {
            mp: 6,
            width: 3200,
            height: 1800,
            aspect: '16:9'
          }
        }
      ];

      this.settings.pictureSizes.get
        .withArgs('options')
        .returns(this.options);

      this.app.localized.returns(true);
      this.controller.l10nGet.withArgs('mp').returns('MP');

      // Call the test subject
      this.controller.formatPictureSizeTitles();
    });

    test('Should include the apect ratio', function() {
      assert.ok(this.options[0].title.indexOf('4:3') > -1);
    });

    test('Should include MP value for > 1MP', function() {
      assert.isTrue(this.options[2].title.indexOf('6MP') > -1, this.options[2].title);
      assert.isFalse(this.options[0].title.indexOf('MP') > -1, this.options[0].title);
    });

    test('Should include the resolution', function() {
      assert.isTrue(this.options[0].title.indexOf('400x300') > -1);
    });

    test('Should use localized \'MP\' string', function() {
      this.controller.l10nGet
        .withArgs('mp')
        .returns('MP-LOCALIZED');

      this.controller.formatPictureSizeTitles();
      assert.isTrue(this.options[2].title.indexOf('MP-LOCALIZED') > -1, this.options[2].title);
    });

    test('Should not run if app isn\'t localized yet', function() {
      this.app.localized.returns(false);
      delete this.options[0].title;

      this.controller.formatPictureSizeTitles();
      assert.equal(this.options[0].title, undefined);
    });
  });

  suite('SettingsController#onPickActivity()', function() {
    setup(function() {
      this.onPickActivity = this.app.on.withArgs('activity:pick').args[0][1];
    });

    test('Should not save settings changes when in \'pick\' activity', function() {
      this.onPickActivity({});
      sinon.assert.called(this.settings.dontSave);
    });

    test('Should set maxPixelSize on pictureSizes settings', function() {
      this.onPickActivity({ maxPixelSize: 100 });
      sinon.assert.calledWith(this.settings.pictureSizesFront.set, 'maxPixelSize', 100);
      sinon.assert.calledWith(this.settings.pictureSizesBack.set, 'maxPixelSize', 100);
    });

    test('Should set maxPixelSize on pictureSizes settings', function() {
      this.onPickActivity({ maxFileSizeBytes: 100 });
      sinon.assert.calledWith(this.settings.recorderProfilesFront.set, 'maxFileSizeBytes', 100);
      sinon.assert.calledWith(this.settings.recorderProfilesBack.set, 'maxFileSizeBytes', 100);
    });
  });
});
