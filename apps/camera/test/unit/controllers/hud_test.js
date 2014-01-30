suite.only('controllers/hud', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'camera',
      'controllers/hud',
      'views/hud',
      'views/controls',
      'views/viewfinder'
    ], function(App,Camera, HudController, HudView, ControlsView, ViewfinderView) {
      self.HudController = HudController.HudController;
      self.ControlsView = ControlsView;
      self.ViewfinderView = ViewfinderView;
      self.HudView = HudView;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
      controls: sinon.createStubInstance(this.ControlsView),
      hud: sinon.createStubInstance(this.HudView)
    };

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
      assert.ok(this.app.on.calledWith('camera:loading'));
      assert.ok(this.app.on.calledWith('change:supports'));
      assert.ok(this.app.on.calledWith('change:recording'));
    });

    test('Should disable controls when the camera is \'busy\'', function() {
      var disableButtons = this.hudController.disableButtons;
      assert.ok(this.app.on.calledWith('camera:busy', disableButtons));
    });

    test('Should enable controls when the camera is \'ready\'', function() {
      var enableButtons = this.hudController.enableButtons;
      assert.ok(this.app.on.calledWith('camera:ready', enableButtons));
    });
  });

  suite('HudController#onSupportChange()', function() {
    test('Should bind to the app event', function() {
      var onSupportChange = this.hudController.onSupportChange;
      assert.ok(this.app.on.calledWith('change:supports', onSupportChange));
    });

    test('Should enable/disable hud features base on given support', function() {
      this.hudController.onSupportChange({
        selectedCamera: true,
        flashMode: false
      });

      assert.ok(this.hud.enable.calledWith('camera', true));
      assert.ok(this.hud.enable.calledWith('flash', false));
    });
  });

  suite('HudController#onRecordingChange', function() {
    test('Should disable the hide the hud buttons when recording', function() {
      this.hudController.onRecordingChange(true);
      assert.ok(this.hud.hide.calledWithExactly('flash', true));
      assert.ok(this.hud.hide.calledWithExactly('camera', true));
      this.hud.hide.reset();
      this.hudController.onRecordingChange(false);
      assert.ok(this.hud.hide.calledWithExactly('flash', false));
      assert.ok(this.hud.hide.calledWithExactly('camera', false));
    });
  });
});
