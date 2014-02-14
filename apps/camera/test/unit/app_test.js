/*global req*/
'use strict';

suite('app', function() {
  var modules = {};

  suiteSetup(function(done) {
    req([
      'app',
      'camera',
      'vendor/view',
      'geolocation',
      'activity'
    ], function(App, Camera, View, GeoLocation, Activity) {
      modules.app = App;
      modules.view = View;
      modules.camera = Camera;
      modules.geolocation = GeoLocation;
      modules.activity = Activity;
      done();
    });
  });

  var mocks = {
    doc: function() {
      return {
        addEventListener: sinon.spy(),
        hidden: false
      };
    },
    win: function() {
      return {
        addEventListener: sinon.spy(),
        location: {
          hash: ''
        }
      };
    }
  };

  setup(function() {
    var View = modules.view;
    var Activity = modules.activity;
    var GeoLocation = modules.geolocation;
    var Camera = modules.camera;
    var App = modules.app;

    var options = this.options = {
      doc: mocks.doc(),
      win: mocks.win(),
      el: document.createElement('div'),
      geolocation: new GeoLocation(),
      activity: new Activity(),
      camera: new Camera(),
      sounds: {},
      storage: {
        once: sinon.spy()
      },
      views: {
        viewfinder: new View({ name: 'viewfinder' }),
        focusRing: new View({ name: 'focusring' }),
        controls: new View({ name: 'controls' }),
        hud: new View({ name: 'hud' })
      },
      filmstrip: sinon.spy(),
      controllers: {
        hud: sinon.spy(),
        controls: sinon.spy(),
        viewfinder: sinon.spy(),
        overlay: sinon.spy(),
        confirm: sinon.spy(),
        camera: sinon.spy()
      }
    };

    // Sandbox to put all our stubs in
    this.sandbox = sinon.sandbox.create();

    // Stub out all methods
    this.sandbox.stub(options.camera);
    this.sandbox.stub(options.activity);
    this.sandbox.stub(options.geolocation);
    this.sandbox.stub(options.viewfinder);
    this.sandbox.stub(options.focusRing);
    this.sandbox.stub(options.hud);

    // More complex stubs
    options.activity.check.callsArg(0);
    this.sandbox.stub(App.prototype, 'miscStuff');
    this.sandbox.spy(App.prototype, 'boot');

    // Create the app
    this.app = new App(options);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('App()', function() {
    test('Should store the injected dependencies on the instance', function() {
      var options = this.options;
      var app = this.app;

      assert.ok(app.el === options.el);
      assert.ok(app.inSecureMode === false);
      assert.ok(app.geolocation === options.geolocation);
      assert.ok(app.activity === options.activity);
      assert.ok(app.camera === options.camera);
      assert.ok(app.storage === options.storage);
      assert.ok(app.sounds === options.sounds);
      assert.ok(app.views === options.views);
      assert.ok(app.controllers === options.controllers);
    });

    test('Should detect secure mode', function() {
      var options = this.options;
      options.win.location.hash = '#secure';

      // need to `new App()` again here (and disregard `this.app`)
      // because we have changed the option mock.
      var App = modules.app;
      var app = new App(options);

      assert.ok(app.inSecureMode === true);
    });
  });

  suite('App#boot()', function() {
    test('Should run each of the controllers,' +
         'passing itself as first argument', function() {
      var controllers = this.app.controllers;
      var app = this.app;

      this.app.boot();

      assert.ok(controllers.hud.calledWith(app));
      assert.ok(controllers.controls.calledWith(app));
      assert.ok(controllers.viewfinder.calledWith(app));
      assert.ok(controllers.overlay.calledWith(app));
      assert.ok(controllers.camera.calledWith(app));
    });

    test('Should put each of the views into the root element', function() {
      var el = this.app.el;

      this.app.boot();

      assert.ok(el.querySelector('.viewfinder'));
      assert.ok(el.querySelector('.focusring'));
      assert.ok(el.querySelector('.controls'));
      assert.ok(el.querySelector('.hud'));
    });

    test('Should bind to `visibilitychange` event', function() {
      this.app.boot();
      var call = this.app.doc.addEventListener.getCall(0);
      assert.ok(call.args[0] === 'visibilitychange');
      assert.ok(typeof call.args[1] === 'function');
    });

    test('Should bind to `beforeunload` event', function() {
      this.app.boot();
      var doc = this.app.win;
      var call = doc.addEventListener.getCall(0);
      assert.ok(call.args[0] === 'beforeunload');
      assert.ok(typeof call.args[1] === 'function');
    });

    suite('app.geolocation', function() {
      test('Should watch location only once storage confirmed healthy',
      function() {
        var geolocationWatch = this.app.geolocationWatch;
        var storage = this.app.storage;
        this.app.boot();
        assert.ok(storage.once.calledWith('checked:healthy', geolocationWatch));
      });

      test('Should *not* watch location if not in activity', function() {
        var geolocation = this.app.geolocation;

        this.app.doc.hidden = false;
        this.app.activity.active = true;
        this.app.geolocationWatch();

        assert.ok(geolocation.watch.notCalled);
      });

      test('Should *not* watch location if app hidden', function() {
        var geolocation = this.app.geolocation;

        this.app.doc.hidden = true;
        this.app.activity.active = false;
        this.app.geolocationWatch();

        assert.ok(geolocation.watch.notCalled);
      });
    });
  });

  suite('App#onBlur', function() {
    test('Should stop watching location', function() {
      var geolocation = this.app.geolocation;
      this.app.onBlur();
      assert.ok(geolocation.stopWatching.called);
    });

    test('Should stop cancel any pending activity', function() {
      var activity = this.app.activity;
      this.app.onBlur();
      assert.ok(activity.cancel.called);
    });
  });
});
