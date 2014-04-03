suite('controllers/hud', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
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
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.l10n = { get: sinon.spy(function(value) { return value; }) };
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationView),
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
      controls: sinon.createStubInstance(this.ControlsView),
      hud: sinon.createStubInstance(this.HudView)
    };

    // Stub 'cameras' setting
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
    this.hud = this.app.views.hud;

    // Our test instance
    this.controller = new this.HudController(this.app);
  });

  suite('HudController()', function() {
    test('Should listen to the following events', function() {
      assert.ok(this.app.on.calledWith('camera:busy'));
      assert.ok(this.app.on.calledWith('camera:ready'));
      assert.ok(this.app.on.calledWith('change:recording'));
    });

    test('Should update the flash once the settings are configured', function() {
      assert.ok(this.app.on.calledWith('settings:configured', this.controller.updateFlash));
    });

    test('Should set \'camera\' to \'busy\' on view when busy', function() {
      assert.ok(this.hud.setter.calledWith('camera', 'busy'));
      assert.ok(this.app.on.calledWith('camera:busy'));
    });

    test('Should set \'camera\' to \'ready\' on view when ready', function() {
      assert.ok(this.hud.setter.calledWith('camera', 'ready'));
      assert.ok(this.app.on.calledWith('camera:ready'));
    });

    test('Should set \'timer\' to \'active\' on view when started', function() {
      assert.ok(this.hud.setter.calledWith('timer', 'active'));
      assert.ok(this.app.on.calledWith('timer:started'));
    });

    test('Should set \'timer\' to \'inactive\' on view when timer ended or cleared', function() {
      assert.ok(this.hud.setter.calledWith('timer', 'inactive'));
      assert.ok(this.app.on.calledWith('timer:cleared'));
      assert.ok(this.app.on.calledWith('timer:ended'));
    });

    test('Should set `recording` state on hud', function() {
      assert.ok(this.hud.setter.calledWith('recording'));
      assert.ok(this.app.on.calledWith('change:recording'));
    });
  });

  suite('HudController#onFlashClick()', function() {
    test('Should cycle to the next flash setting', function() {
      this.controller.onFlashClick();
      assert.ok(this.settings.flashModes.next.calledOnce);
    });

    test('Should set the new value on the hud view', function() {
      this.settings.flashModes.selected.withArgs('key').returns('auto');
      this.controller.onFlashClick();
      assert.ok(this.hud.set.calledWith('flashMode', 'auto'));
    });

    test('Should notify', function() {
      sinon.spy(this.controller, 'notify');
      this.controller.onFlashClick();
      assert.ok(this.controller.notify.called);
    });
  });

  suite('HudController#notify()', function() {
    test('Should display a notification', function() {
      this.controller.onFlashClick();
      assert.ok(this.notification.display.called);
    });
  });

  suite('HudController#onModeChange()', function() {
    test('Should hide the displayed notification when the camera mode changes', function() {
      this.controller.onModeChange();
      assert.ok(this.notification.clear.called);
    });
  });

});
