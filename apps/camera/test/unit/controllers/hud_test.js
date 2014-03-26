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
      'lib/settings',
      'lib/setting'
    ], function(
      App, Camera, HudController, HudView,
      ControlsView, ViewfinderView, Settings, Setting
    ) {
      self.HudController = HudController.HudController;
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
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
      controls: sinon.createStubInstance(this.ControlsView),
      hud: sinon.createStubInstance(this.HudView)
    };

    // Stub 'cameras' setting
    this.app.settings.cameras = sinon.createStubInstance(this.Setting);
    this.app.settings.flashModes = sinon.createStubInstance(this.Setting);
    this.app.settings.showSettings = sinon.createStubInstance(this.Setting);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.cameras.get.withArgs('options').returns([]);

    // For convenience
    this.hud = this.app.views.hud;
    this.controls = this.app.views.controls;
    this.viewfinder = this.app.views.viewfinder;
    this.camera = this.app.camera;

    // Our test instance
    this.hudController = new this.HudController(this.app);
  });

  suite('HudController()', function() {
    test('Should listen to the following events', function() {
      assert.ok(this.app.on.calledWith('camera:busy'));
      assert.ok(this.app.on.calledWith('camera:ready'));
      assert.ok(this.app.on.calledWith('change:recording'));
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
});
