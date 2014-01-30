/*global req*/
'use strict';

suite('controllers/viewfinder', function() {
  var ViewfinderController;

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'camera',
      'controllers/viewfinder',
      'views/viewfinder',
      'activity'
    ], function(App, Camera, _ViewfinderController, ViewfinderView, Activity) {
      ViewfinderController = _ViewfinderController.ViewfinderController;
      self.ViewfinderView = ViewfinderView;
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
    this.app.filmstrip = { toggle: sinon.spy() };
    this.app.views = {
      viewfinder: sinon.createStubInstance(this.ViewfinderView),
    };

    this.filmstrip = this.app.filmstrip;
    this.viewfinder = this.app.views.viewfinder;
  });

  suite('click:viewfinder', function() {
    test('Should *not* hide the filmstrip if recording', function() {
      this.app.camera.get
        .withArgs('recording')
        .returns(true);

      this.controller = new ViewfinderController(this.app);
      this.viewfinder.emit('click');

      assert.isFalse(this.filmstrip.toggle.called);
    });

    test('Should *not* hide the filmstrip if activity is pending', function() {
      this.app.get
        .withArgs('recording')
        .returns(false);

      this.app.activity.active = true;
      this.controller = new ViewfinderController(this.app);
      this.controller.onViewfinderClick();
      assert.isFalse(this.filmstrip.toggle.called);
    });

    test('Should hide the filmstrip if activity is pending', function() {
      this.app.get
        .withArgs('recording')
        .returns(false);

      this.controller = new ViewfinderController(this.app);
      this.controller.onViewfinderClick();
      assert.isTrue(this.filmstrip.toggle.called);
    });
  });
});
