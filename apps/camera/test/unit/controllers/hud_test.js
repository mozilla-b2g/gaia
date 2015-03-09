suite('controllers/hud', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'lib/camera/camera',
      'controllers/hud',
      'views/hud',
      'views/controls',
      'views/viewfinder',
      'views/notification',
      'lib/settings',
      'lib/setting'
    ], function(
      App, Camera, HudController, HudView, ControlsView,
      ViewfinderView, NotificationView, Settings, Setting
    ) {
      self.HudController = HudController.HudController;
      self.NotificationView = NotificationView;
      self.ViewfinderView = ViewfinderView;
      self.ControlsView = ControlsView;
      self.Settings = Settings;
      self.Setting = Setting;
      self.HudView = HudView;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.l10n = { get: sinon.spy(function(value) { return value; }) };
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationView),
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
      controls: sinon.createStubInstance(this.ControlsView),
      hud: sinon.createStubInstance(this.HudView)
    };

    // Stub 'cameras' setting
    this.app.settings = {};
    this.app.settings.cameras = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModes = sinon.createStubInstance(this.Setting);
    this.app.settings.settingsMenu = sinon.createStubInstance(this.Setting);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.cameras.get.withArgs('options').returns([]);

    // For convenience
    this.notification = this.app.views.notification;
    this.viewfinder = this.app.views.viewfinder;
    this.controls = this.app.views.controls;
    this.settings = this.app.settings;
    this.camera = this.app.camera;
    this.view = this.app.views.hud;

    // Our test instance
    this.controller = new this.HudController(this.app);
  });

  suite('HudController()', function() {
    test('Should listen to the following events', function() {
      assert.ok(this.app.settings.flashModes.on.calledWith('change:selected'));
      assert.ok(this.app.settings.mode.on.calledWith('change:selected'));
      assert.ok(this.app.settings.cameras.on.calledWith('change:selected'));

      assert.ok(this.app.on.calledWith('settings:configured'));
      assert.ok(this.app.on.calledWith('ready'));
      assert.ok(this.app.on.calledWith('busy'));
      assert.ok(this.app.on.calledWith('localized'));
      assert.ok(this.app.on.calledWith('change:recording'));
      assert.ok(this.app.on.calledWith('timer:cleared'));
      assert.ok(this.app.on.calledWith('timer:started'));
      assert.ok(this.app.on.calledWith('timer:ended'));
      assert.ok(this.app.on.calledWith('settings:opened'));
      assert.ok(this.app.on.calledWith('settings:closed'));

      assert.ok(this.app.on.calledWith('previewgallery:opened',
        this.view.hide));
      assert.ok(this.app.on.calledWith('previewgallery:closed',
        this.view.show));
    });

    test('Should update the flash support once settings are configured', function() {
      sinon.assert.calledWith(this.app.on, 'settings:configured', this.controller.updateFlashSupport);
    });

    test('Should set \'camera\' to \'busy\' on view when busy', function() {
      assert.ok(this.view.setter.calledWith('camera', 'busy'));
      assert.ok(this.app.on.calledWith('busy'));
    });

    test('Should set \'camera\' to \'ready\' on view when ready', function() {
      assert.ok(this.view.setter.calledWith('camera', 'ready'));
      assert.ok(this.app.on.calledWith('ready'));
    });

    test('Should set \'timer\' to \'active\' on view when started', function() {
      assert.ok(this.view.setter.calledWith('timer', 'active'));
      assert.ok(this.app.on.calledWith('timer:started'));
    });

    test('Should set \'timer\' to \'inactive\' on view when timer ended or cleared', function() {
      assert.ok(this.view.setter.calledWith('timer', 'inactive'));
      assert.ok(this.app.on.calledWith('timer:cleared'));
      assert.ok(this.app.on.calledWith('timer:ended'));
    });

    test('Should set `recording` state on hud', function() {
      assert.ok(this.view.setter.calledWith('recording'));
      assert.ok(this.app.on.calledWith('change:recording'));
    });

    test('Should enable camera button depending on support', function() {
      this.settings.cameras.get
        .withArgs('options')
        .returns(['back']);

      sinon.assert.calledWith(this.view.enable, 'camera', false);

      this.settings.cameras.get
        .withArgs('options')
        .returns(['back', 'front']);

      this.controller = new this.HudController(this.app);
      sinon.assert.calledWith(this.view.enable, 'camera', true);
    });

    test('Should disable flash initially until support is known', function() {
      sinon.assert.calledWith(this.view.disable, 'flash');
    });
  });

  suite('HudController#localize()', function() {
    setup(function() {
      this.controller.view = {
        setFlashModeLabel: sinon.spy(),
        setCameraLabel: sinon.spy(),
        setMenuLabel: sinon.spy()
      };
    });

    test('Should cycle to the next flash setting', function() {
      this.controller.localize();
      assert.ok(this.controller.view.setFlashModeLabel.called);
      assert.ok(this.controller.view.setCameraLabel.called);
      assert.ok(this.controller.view.setMenuLabel.called);
    });
  });

  suite('HudController#onFlashClick()', function() {
    setup(function() {
      this.settings.hdr = {
        selected: sinon.spy()
      };
    });

    test('Should cycle to the next flash setting', function() {
      this.controller.onFlashClick();
      assert.ok(this.settings.flashModes.next.calledOnce);
    });

    test('Should set the new value on the hud view', function() {
      this.settings.flashModes.selected.withArgs('key').returns('auto');
      this.controller.onFlashClick();
      assert.ok(this.view.set.calledWith('flashMode', 'auto'));
    });

    test('Should notify', function() {
      sinon.spy(this.controller, 'notify');
      this.controller.onFlashClick();
      assert.ok(this.controller.notify.called);
    });
  });

  suite('HudController#notify()', function() {
    setup(function() {
      this.settings.hdr = {
        selected: sinon.spy()
      };
    });

    test('Should display a notification', function() {
      this.controller.onFlashClick();
      assert.ok(this.notification.display.called);
    });
  });

  suite('HudController#updateFlashMode()', function() {
    setup(function() {
      this.settings.flashModes = {
        selected: sinon.spy()
      };
    });

    test('Should update the flash mode', function() {
      this.controller.updateFlashMode();
      assert.ok(this.settings.flashModes.selected.called);
    });
  });

  suite('HudController#updateCamera()', function() {
    setup(function() {
      this.settings.cameras = {
        selected: sinon.spy()
      };
    });

    test('Should update the camera', function() {
      this.controller.updateCamera();
      assert.ok(this.settings.cameras.selected.called);
    });
  });

  suite('HudController#onCameraClick()', function() {
    setup(function() {
      this.callback = this.view.on.withArgs('click:camera').args[0][1];
    });

    test('Should clear notifications', function() {
      this.callback();
      sinon.assert.called(this.notification.clear);
    });

    test('Should call move to next available camera', function() {
      this.callback();
      sinon.assert.calledOnce(this.settings.cameras.next);
    });

    test('Should debounce (immediate) rapid button taps', function() {
      this.callback();
      sinon.assert.called(this.settings.cameras.next);
      this.callback();
      this.callback();
      this.callback();
      this.callback();
      sinon.assert.calledOnce(this.settings.cameras.next);
    });
  });
});
