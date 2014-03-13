/*global req*/
'use strict';

suite('controllers/viewfinder', function() {
  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'controllers/viewfinder',
      'views/viewfinder',
      'lib/activity',
      'lib/settings',
      'lib/setting'
    ], function(
      App, Camera, ViewfinderController,
      ViewfinderView, Activity, Settings, Setting
    ) {
      self.ViewfinderController = ViewfinderController.ViewfinderController;
      self.ViewfinderView = ViewfinderView;
      self.Settings = Settings;
      self.Setting = Setting;
      self.Activity = Activity;
      self.Camera = Camera;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.activity = sinon.createStubInstance(this.Activity);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.grid = sinon.createStubInstance(this.Setting);
    this.app.filmstrip = { toggle: sinon.spy() };
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
    };

    // Settings
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.grid = sinon.createStubInstance(this.Setting);

    // Shortcuts
    this.filmstrip = this.app.filmstrip;
    this.viewfinder = this.app.views.viewfinder;
  });

  suite('click:viewfinder', function() {
    test('Should *not* hide the filmstrip if recording', function() {
      this.app.camera.get
        .withArgs('recording')
        .returns(true);

      this.controller = new this.ViewfinderController(this.app);
      this.viewfinder.emit('click');

      assert.isFalse(this.filmstrip.toggle.called);
    });

    test('Should *not* hide the filmstrip if activity is pending', function() {
      this.app.get
        .withArgs('recording')
        .returns(false);

      this.app.activity.active = true;
      this.controller = new this.ViewfinderController(this.app);
      this.controller.onViewfinderClick();
      assert.isFalse(this.filmstrip.toggle.called);
    });

    test('Should hide the filmstrip if activity is pending', function() {
      this.app.get
        .withArgs('recording')
        .returns(false);

      this.controller = new this.ViewfinderController(this.app);
      this.controller.onViewfinderClick();
      assert.isTrue(this.filmstrip.toggle.called);
    });

    test('Should set the grid depending on the setting', function() {
      this.app.settings.grid.selected.withArgs('key').returns('on');
      this.controller = new this.ViewfinderController(this.app);
      assert.isTrue(this.viewfinder.set.calledWith('grid', 'on'));

      this.app.settings.grid.selected.withArgs('key').returns('off');
      this.controller = new this.ViewfinderController(this.app);
      assert.isTrue(this.viewfinder.set.calledWith('grid', 'off'));
    });
  });
});
