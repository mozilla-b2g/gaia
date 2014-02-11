/*jshint maxlen:false*/
/*global req*/
'use strict';

suite('controllers/viewfinder', function() {
  var Controller;

  suiteSetup(function(done) {
    var self = this;

    this.modules = {};

    req([
      'controllers/viewfinder',
      'vendor/view',
      'activity'
    ], function(controller, View, activity) {
      Controller = self.modules.controller = controller;
      self.modules.View = View;
      self.modules.activity = activity;
      done();
    });
  });

  setup(function() {
    var Activity = this.modules.activity;
    var View = this.modules.View;

    this.app = {
      camera: {
        on: sinon.spy(),
        get: sinon.stub()
      },
      activity: new Activity(),
      filmstrip: new View(),
      views: {
        viewfinder: new View()
      }
    };
  });

  suite('click:viewfinder', function() {
    setup(function() {
      this.app.filmstrip.toggle = sinon.spy();
    });

    test('Should *not* hide the filmstrip if recording', function() {
      this.app.camera.get
        .withArgs('recording')
        .returns(true);

      this.controller = new Controller(this.app);
      this.app.views.viewfinder.emit('click');

      assert.isFalse(this.app.filmstrip.toggle.called);
    });

    test('Should *not* hide the filmstrip if activity is pending', function() {
      this.app.camera.get
        .withArgs('recording')
        .returns(false);

      this.app.activity.active = true;

      this.controller = new Controller(this.app);

      // Tigger a click event
      this.app.views.viewfinder.emit('click');

      assert.isFalse(this.app.filmstrip.toggle.called);
    });

    test('Should hide the filmstrip if activity is pending', function() {
      this.app.camera.get
        .withArgs('recording')
        .returns(false);

      this.controller = new Controller(this.app);

      // Tigger a click event
      this.app.views.viewfinder.emit('click');

      assert.isTrue(this.app.filmstrip.toggle.called);
    });
  });
});
