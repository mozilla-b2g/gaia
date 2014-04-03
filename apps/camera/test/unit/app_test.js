/*global req*/
'use strict';

suite('app', function() {
  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'lib/camera',
      'vendor/view',
      'lib/geo-location',
      'lib/activity',
      'lib/storage',
      'lib/setting',
    ], function(App, Camera, View, GeoLocation, Activity, Storage, Setting) {
      self.App = App;
      self.View = View;
      self.Camera = Camera;
      self.Geolocation = GeoLocation;
      self.Activity = Activity;
      self.Storage = Storage;
      self.Setting = Setting;
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
    if (!navigator.mozCameras) {
      navigator.mozCameras = {
        getListOfCameras: function() { return []; },
        getCamera: function() {},
        release: function() {}
      };
    }

    navigator.mozL10n = { readyState: null };

    var options = this.options = {
      doc: mocks.doc(),
      win: mocks.win(),
      el: document.createElement('div'),
      geolocation: sinon.createStubInstance(this.Geolocation),
      activity: new this.Activity(),
      camera: sinon.createStubInstance(this.Camera),
      sounds: {},
      storage: sinon.createStubInstance(this.Storage),
      settings: {
        geolocation: sinon.createStubInstance(this.Setting)
      },
      views: {
        viewfinder: new this.View({ name: 'viewfinder' }),
        focusRing: new this.View({ name: 'focus-ring' }),
        controls: new this.View({ name: 'controls' }),
        hud: new this.View({ name: 'hud' })
      },
      controllers: {
        hud: sinon.spy(),
        timer: sinon.spy(),
        controls: sinon.spy(),
        viewfinder: sinon.spy(),
        previewGallery: sinon.spy(),
        overlay: sinon.spy(),
        confirm: sinon.spy(),
        camera: sinon.spy(),
        settings: sinon.spy(),
        activity: sinon.spy(),
        sounds: sinon.spy(),
        recordingTimer: sinon.spy(),
        zoomBar: sinon.spy(),
        indicators: sinon.spy(),
        battery: sinon.spy()
      }
    };

    // Sandbox to put all our stubs in
    this.sandbox = sinon.sandbox.create();

    // Sinon take over setTimeout
    this.clock = sinon.useFakeTimers();

    // Stub out all methods
    this.sandbox.stub(options.activity);
    this.sandbox.stub(options.viewfinder);
    this.sandbox.stub(options.focusRing);
    this.sandbox.stub(options.hud);

    // More complex stubs
    options.activity.check.callsArg(0);
    this.sandbox.spy(this.App.prototype, 'boot');

    // Create the app
    this.app = new this.App(options);

    this.sandbox.spy(this.app, 'on');
    this.sandbox.spy(this.app, 'set');
    this.sandbox.spy(this.app, 'emit');
    this.sandbox.spy(this.app, 'firer');
  });

  teardown(function() {
    this.sandbox.restore();
    this.clock.restore();
    delete navigator.mozCameras;
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
      assert.ok(app.settings === options.settings);
      assert.ok(app.sounds === options.sounds);
      assert.ok(app.controllers === options.controllers);
    });

    test('Should detect secure mode', function() {
      var options = this.options;
      options.win.location.hash = '#secure';

      // need to `new App()` again here (and disregard `this.app`)
      // because we have changed the option mock.
      var app = new this.App(options);

      assert.ok(app.inSecureMode === true);
    });
  });

  suite('App#boot()', function() {
    setup(function() {
      this.app.boot();
    });

    test('Should run each of the controllers,' +
         'passing itself as first argument', function() {
      var controllers = this.app.controllers;
      var app = this.app;

      assert.ok(controllers.hud.calledWith(app));
      assert.ok(controllers.controls.calledWith(app));
      assert.ok(controllers.viewfinder.calledWith(app));
      assert.ok(controllers.previewGallery.calledWith(app));
      assert.ok(controllers.overlay.calledWith(app));
      assert.ok(controllers.camera.calledWith(app));
      assert.ok(controllers.zoomBar.calledWith(app));
      assert.ok(controllers.battery.calledWith(app));
    });

    test('Should put each of the views into the root element', function() {
      var el = this.app.el;

      assert.ok(el.querySelector('.viewfinder'));
      assert.ok(el.querySelector('.focus-ring'));
      assert.ok(el.querySelector('.controls'));
      assert.ok(el.querySelector('.hud'));
    });

    test('Should bind to `visibilitychange` event', function() {
      var call = this.app.doc.addEventListener.getCall(0);
      assert.ok(call.args[0] === 'visibilitychange');
      assert.ok(typeof call.args[1] === 'function');
    });

    test('Should bind to `beforeunload` event', function() {
      var addEventListener = this.app.win.addEventListener;
      assert.ok(addEventListener.calledWith('beforeunload', this.app.onBeforeUnload));
    });

    test('Should run the activity controller before controls or camera', function() {
      var activity = this.app.controllers.activity;
      var controls = this.app.controllers.controls;
      var camera = this.app.controllers.camera;

      assert.isTrue(activity.calledBefore(controls));
      assert.isTrue(activity.calledBefore(camera));
    });

    test('Should watch location only once storage confirmed healthy', function() {
      var geolocationWatch = this.app.geolocationWatch;
      var storage = this.app.storage;
      assert.ok(storage.once.calledWith('checked:healthy', geolocationWatch));
    });

    suite('App#geolocationWatch()', function() {
      setup(function() {
        this.options.settings.geolocation.get
          .withArgs('promptDelay')
          .returns(2000);
      });

      test('Should watch geolocation after given delay', function() {
        this.app.geolocationWatch();

        assert.isFalse(this.app.geolocation.watch.called);
        this.clock.tick(2000);

        assert.isTrue(this.app.geolocation.watch.called);
      });

      test('Should *not* watch location if not in activity', function() {
        this.app.doc.hidden = false;
        this.app.activity.active = true;

        this.app.geolocationWatch();
        this.clock.tick(2000);

        assert.isFalse(this.app.geolocation.watch.called);
      });

      test('Should *not* watch location if app hidden', function() {
        this.app.doc.hidden = true;
        this.app.activity.active = false;

        this.app.geolocationWatch();
        this.clock.tick(2000);

        assert.isFalse(this.app.geolocation.watch.called);
      });
    });
  });

  suite('App#onBlur', function() {
    setup(function() {
      this.app.onBlur();
    });

    test('Should stop watching location', function() {
      assert.ok(this.app.geolocation.stopWatching.called);
    });

    test('Should stop cancel any pending activity', function() {
      assert.ok(this.app.activity.cancel.called);
    });
  });

  suite('App#onFocus()', function() {
    setup(function() {
      sinon.spy(this.app, 'geolocationWatch');
      this.app.onFocus();
    });

    test('Should run a storage check', function() {
      assert.ok(this.app.storage.check.called);
    });

    test('Should begin watching location again', function() {
      assert.ok(this.app.geolocationWatch.called);
    });
  });

  suite('App#configureL10n()', function() {
    test('Should fire a `localized` event if l10n is already complete', function() {
      navigator.mozL10n.readyState = 'complete';
      this.app.configureL10n();
      assert.ok(this.app.emit.calledWith('localized'));
    });

    test('Should not fire a `localized` event if l10n is not \'complete\'', function() {
      this.app.configureL10n();
      assert.ok(!this.app.emit.calledWith('localized'));
    });

    test('Should always listen for \'localized\' events', function() {
      this.app.configureL10n();
      assert.ok(!this.app.win.addEventListener('localized'));
    });
  });
});
