/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/viewfinder', function() {
  var Controller;

  // Sometimes setup via the
  // test agent can take a while,
  // so we need to bump timeout
  // to prevent test failure.
  this.timeout(3000);

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'controllers/viewfinder',
      'camera',
      'vendor/view',
      'activity'
    ], function(controller, camera, View, activity) {
      Controller = self.modules.controller = controller;
      self.modules.camera = camera;
      self.modules.View = View;
      self.modules.activity = activity;
      done();
    });
  });

  setup(function() {
    var Activity = this.modules.activity;
    var Camera = this.modules.camera;
    var View = this.modules.View;

    this.app = {
      camera: new Camera(),
      activity: new Activity(),
      filmstrip: new View(),
      views: {
        viewfinder: new View()
      }
    };

    sinon.stub(this.app.camera, 'on');
  });

  suite('click:viewfinder', function() {
    setup(function() {
      this.app.filmstrip.toggle = sinon.spy();
    });

    test('Should *not* hide the filmstrip if recording', function() {
      sinon.stub(this.app.camera.state, 'get')
        .withArgs('recording')
        .returns(true);

      this.controller = new Controller(this.app);
      this.app.views.viewfinder.emit('click');

      assert.isFalse(this.app.filmstrip.toggle.called);
    });

    test('Should *not* hide the filmstrip if activity is pending', function() {
      sinon.stub(this.app.camera.state, 'get')
        .withArgs('recording')
        .returns(false);

      this.app.activity.active = true;

      this.controller = new Controller(this.app);

      // Tigger a click event
      this.app.views.viewfinder.emit('click');

      assert.isFalse(this.app.filmstrip.toggle.called);
    });

    test('Should hide the filmstrip if activity is pending', function() {
      sinon.stub(this.app.camera.state, 'get')
        .withArgs('recording')
        .returns(false);

      this.controller = new Controller(this.app);

      // Tigger a click event
      this.app.views.viewfinder.emit('click');

      assert.isTrue(this.app.filmstrip.toggle.called);
    });
  });
});
