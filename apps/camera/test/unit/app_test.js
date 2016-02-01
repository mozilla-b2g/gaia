/*jshint maxlen:false*/

suite('app', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'lib/camera/camera',
      'view',
      'lib/geo-location',
      'lib/orientation',
      'lib/setting',
      'lib/pinch'
    ], function(App, Camera, View, GeoLocation, orientation, Setting, Pinch) {
      self.App = App;
      self.View = View;
      self.Camera = Camera;
      self.Geolocation = GeoLocation;
      self.orientation = orientation;
      self.Setting = Setting;
      self.Pinch = Pinch;
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
        dispatchEvent: sinon.stub(),
        location: {
          hash: ''
        }
      };
    }
  };

  setup(function() {
    var self = this;

    if (!navigator.mozCameras) {
      navigator.mozCameras = {
        getListOfCameras: function() { return []; },
        getCamera: function() {},
        release: function() {}
      };
    }

    navigator.mozSettings = {
      addObserver: function() {},
      removeObserver: function() {}
    };

    var options = this.options = {
      doc: mocks.doc(),
      win: mocks.win(),
      el: document.createElement('div'),
      geolocation: sinon.createStubInstance(this.Geolocation),
      orientation: this.orientation,
      pinch: sinon.createStubInstance(this.Pinch),
      activity: {},
      camera: sinon.createStubInstance(this.Camera),
      require: sinon.stub(),
      settings: {
        geolocation: sinon.createStubInstance(this.Setting),
        spinnerTimeouts: sinon.createStubInstance(this.Setting),
        keyDownEvents: sinon.createStubInstance(this.Setting),
        countdown: sinon.createStubInstance(this.Setting)
      },
      views: {},
      controllers: {
        battery: sinon.spy(),
        overlay: sinon.spy(),
        hud: sinon.spy(),
        countdown: sinon.spy(),
        controls: sinon.spy(),
        viewfinder: sinon.spy(),
        camera: sinon.spy(),
        settings: sinon.spy(),
        activity: sinon.spy(),
        storage: sinon.spy(),

        // Lazy loaded
        lazy: [
          'controllers/preview-gallery',
          'controllers/confirm',
          'controllers/sounds'
        ]
      }
    };

    this.loadingView = sinon.createStubInstance(this.View);
    this.loadingView.appendTo.returns(this.loadingView);
    options.LoadingView = function() { return self.loadingView; };

    // Sandbox to put all our stubs in
    this.sandbox = sinon.sandbox.create();

    // Sinon take over setTimeout
    this.clock = sinon.useFakeTimers();

    // Stub out all methods
    this.sandbox.stub(options.activity);
    this.sandbox.stub(options.focusRing);
    this.sandbox.stub(options.hud);

    // Sometimes we have to spy on the prototype,
    // this is because methods get bound and passed
    // directly as callbacks. We set spys on prototype
    // methods before any of this happens, so that the
    // spy is always at the root of any call.
    this.sandbox.spy(this.App.prototype, 'boot');
    this.sandbox.spy(this.App.prototype, 'showSpinner');
    this.sandbox.spy(this.App.prototype, 'clearSpinner');

    // Aliases
    this.settings = options.settings;
    this.pinch = options.pinch;

    // Create the app
    this.app = new this.App(options);

    this.sandbox.spy(this.app, 'on');
    this.sandbox.spy(this.app, 'set');
    this.sandbox.spy(this.app, 'once');
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

      assert.ok(controllers.overlay.calledWith(app));
      assert.ok(controllers.battery.calledWith(app));
      assert.ok(controllers.hud.calledWith(app));
      assert.ok(controllers.controls.calledWith(app));
      assert.ok(controllers.viewfinder.calledWith(app));
      assert.ok(controllers.camera.calledWith(app));
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
      assert.ok(this.app.once.calledWith('storage:checked:healthy', geolocationWatch));
    });

    test('Should clear loading screen when camera is ready', function() {
      var on = this.app.on.withArgs('ready');
      var callback = on.args[0][1];

      // Call the callback and make sure
      // that `clearSpinner` was called.
      callback();
      sinon.assert.calledOnce(this.App.prototype.clearSpinner);
    });

    test('It calls `showSpinner`', function() {
      sinon.assert.calledWith(this.App.prototype.showSpinner, 'requestingCamera');
    });

    suite('pinch', function() {
      test('It listens to the pinch `changed` event', function() {
        sinon.assert.called(this.pinch.on, 'changed');
      });

      test('It disables pinch while the preview-gallery is open', function() {
        sinon.assert.called(this.app.on, 'previewgallery:opened', this.pinch.disable);
        sinon.assert.called(this.app.on, 'previewgallery:closed', this.pinch.enable);
      });

      test('It disables pinch while settings is open', function() {
        sinon.assert.called(this.app.on, 'settings:opened', this.pinch.disable);
        sinon.assert.called(this.app.on, 'settings:closed', this.pinch.enable);
      });
    });

    suite('App#geolocationWatch()', function() {
      test('Should *not* watch location if in activity', function() {
        this.app.hidden = false;
        this.app.activity.pick = true;

        this.app.geolocationWatch();
        this.clock.tick(2000);

        assert.isFalse(this.app.geolocation.watch.called);
      });

      test('Should *not* watch location if app hidden', function() {
        this.app.hidden = true;
        this.app.activity.pick = false;

        this.app.geolocationWatch();
        this.clock.tick(2000);

        assert.isFalse(this.app.geolocation.watch.called);
      });
    });

    suite('once(\'viewfinder:visible\')', function() {
      setup(function() {

        // Stop annoying logs
        this.sandbox.stub(console, 'log');

        this.spy = this.app.once.withArgs('viewfinder:visible');
        this.callback = this.spy.args[0][1];

        sinon.spy(this.app, 'loadLazyControllers');
        sinon.stub(this.app, 'clearSpinner');

        // Call the callback to test
        this.callback();
      });

      test('Should fire a `criticalpathdone` event', function() {
        assert.isTrue(this.app.emit.calledWith('criticalpathdone'));
      });

      test('Should flag `this.criticalPathDone`', function() {
        assert.isTrue(this.app.criticalPathDone);
      });

      test('Should load non-critical controllers', function() {
        sinon.assert.called(this.app.loadLazyControllers);
      });
    });
  });

  suite('App#bindEvents()', function() {
    setup(function() {
      this.app.firer.restore();

      sinon.stub(this.app, 'firer');

      this.app.firer
        .withArgs('busy')
        .returns('<busy-firer>');

      this.app.firer
        .withArgs('localized')
        .returns('<localized-firer>');

      this.sandbox.stub(this.app, 'onCountdown');
      this.options.settings.countdown.selected.returns('off');
    });

    suite('default', function() {
      setup(function() {
        this.app.bindEvents();
      });

      test('Should listen for visibilitychange on document', function() {
        sinon.assert.calledWith(this.app.doc.addEventListener, 'visibilitychange');
      });

      test('Should relay window \'localized\' event', function() {
        sinon.assert.calledWith(this.app.doc.addEventListener, 'DOMRetranslated', '<localized-firer>');
      });

      test('It indicates the app is \'busy\' when the camera \'willchange\'', function() {
        sinon.assert.calledWith(this.app.on, 'camera:willchange', '<busy-firer>');
      });

      test('Should listen for \'willchange\' to lazy load once', function() {
        sinon.assert.calledWith(this.app.once, 'camera:willchange', this.app.onWillChange);
      });

      test('Should listen for \'activity\' to lazy load once', function() {
        sinon.assert.calledWith(this.app.once, 'activity', this.app.onActivity);
      });

      test('Should listen for \'preview\' to lazy load once', function() {
        sinon.assert.calledWith(this.app.once, 'preview', this.app.onPreview);
      });

      test('Should listen for \'newthumbnail\' to lazy load once', function() {
        sinon.assert.calledWith(this.app.once, 'newthumbnail', this.app.onNewThumbnail);
      });

      test('Should listen for change:selected on countdown if disabled', function() {
        sinon.assert.calledWith(this.options.settings.countdown.once, 'change:selected', this.app.onCountdown);
      });
    });

    test('Should listen for change:selected on countdown if disabled', function() {
      this.options.settings.countdown.selected.returns('2sec');
      this.app.bindEvents();
      sinon.assert.called(this.app.onCountdown);
    });
  });

  suite('App#onVisibilityChange', function() {
    test('Should update the `app.hidden` property', function() {
      this.app.doc.hidden = true;
      this.app.onVisibilityChange();
      assert.equal(this.app.hidden, true);

      this.app.doc.hidden = false;
      this.app.onVisibilityChange();
      assert.equal(this.app.hidden, false);
    });

    test('Should emit a \'visible\' event when the document is not hidden', function() {
      this.app.doc.hidden = false;
      this.app.onVisibilityChange();
      assert.isTrue(this.app.emit.calledWith('visible'));
    });

    test('Should emit a \'hidden\' event when the document is hidden', function() {
      this.app.doc.hidden = true;
      this.app.onVisibilityChange();
      assert.isTrue(this.app.emit.calledWith('hidden'));
    });
  });

  suite('App#onHidden', function() {
    setup(function() {
      this.app.onHidden();
    });

    test('Should stop watching location', function() {
      assert.ok(this.app.geolocation.stopWatching.called);
    });
  });

  suite('App#onVisible()', function() {
    setup(function() {
      sinon.spy(this.app, 'geolocationWatch');
      this.sandbox.spy(this.app.orientation, 'lock');
      this.app.onVisible();
    });

    test('Should begin watching location again', function() {
      sinon.assert.called(this.app.geolocationWatch);
    });

    test('It locks the orientation to portrait', function() {
      sinon.assert.called(this.app.orientation.lock);
    });
  });

  suite('App#onBusy()', function() {
    setup(function() {
      this.app.settings.spinnerTimeouts.get
        .withArgs('takingPicture')
        .returns(1500);

      this.app.settings.spinnerTimeouts.get
        .withArgs('requestingCamera')
        .returns(600);

      sinon.stub(this.app, 'showSpinner');
    });

    test('It calls showSpinner with type if busy type recongnised', function() {
      this.app.onBusy('takingPicture');
      sinon.assert.calledWith(this.app.showSpinner, 'takingPicture');
      this.app.showSpinner.reset();

      this.app.onBusy('requestingCamera');
      sinon.assert.calledWith(this.app.showSpinner, 'requestingCamera');
      this.app.showSpinner.reset();
    });

    test('Should not show loading screen if busy type not recongnised', function() {
      this.app.onBusy('unknownType');
      sinon.assert.notCalled(this.app.showSpinner);
    });
  });

  suite('App#showSpinner()', function() {
    setup(function() {
      this.sandbox.spy(window, 'clearTimeout');

      this.app.settings.spinnerTimeouts.get
        .withArgs('takingPicture')
        .returns(1500);

      this.app.settings.spinnerTimeouts.get
        .withArgs('requestingCamera')
        .returns(600);

    });

    test('Should append a loading view to the app element and show', function() {
      this.app.showSpinner('takingPicture');
      this.clock.tick(1500);
      sinon.assert.calledWith(this.app.views.loading.appendTo, this.app.el);
      sinon.assert.called(this.app.views.loading.show);
    });

    test('Should clear any existing timeouts', function() {
      this.sandbox.stub(window, 'setTimeout').returns('<timeout-id>');
      this.app.showSpinner('requestingCamera');
      this.app.showSpinner('requestingCamera');
      sinon.assert.calledWith(window.clearTimeout, '<timeout-id>');
    });

    test('It should not require a type', function() {
      this.app.showSpinner();
      this.clock.tick(1);
      sinon.assert.calledWith(this.app.views.loading.appendTo, this.app.el);
    });
  });

  suite('App#clearSpinner()', function() {
    setup(function() {
      this.sandbox.spy(window, 'clearTimeout');
      this.sandbox.stub(window, 'setTimeout').returns('<timeout-id>');
      this.app.views.loading = sinon.createStubInstance(this.View);
      this.app.views.loading.hide.callsArg(0);
    });

    test('Should clear loadingTimeout', function() {
      this.app.views.loading = null;
      this.app.showSpinner();
      this.app.clearSpinner();
      sinon.assert.calledWith(window.clearTimeout, '<timeout-id>');
    });

    test('Should hide, then destroy the view', function() {
      var view = this.app.views.loading;
      this.app.clearSpinner();

      sinon.assert.called(view.hide);
      assert.ok(view.destroy.calledAfter(view.hide));
    });

    test('Should clear reference to `app.views.loading`', function() {
      this.app.clearSpinner();
      assert.equal(this.app.views.loading, null);
    });
  });

  suite('App#onActivity', function() {
    setup(function() {
      this.sandbox.stub(this.app, 'loadLazyController');
      this.app.onActivity();
    });

    test('Should lazy load confirm controller', function() {
      sinon.assert.calledWith(this.app.loadLazyController, 'controllers/confirm');
    });
  });

  suite('App#onCountdown', function() {
    setup(function() {
      this.sandbox.stub(this.app, 'loadLazyController');
      this.app.onCountdown();
    });

    test('Should lazy load countdown controller', function() {
      sinon.assert.calledWith(this.app.loadLazyController, 'controllers/countdown');
    });
  });

  suite('App#onWillChange', function() {
    setup(function() {
      this.sandbox.stub(this.app, 'loadLazyController');
      this.app.onWillChange();
    });

    test('Should lazy load recording-timer controller', function() {
      sinon.assert.calledWith(this.app.loadLazyController, 'controllers/recording-timer');
    });
  });

  suite('App#onNewThumbnail', function() {
    setup(function() {
      this.sandbox.stub(this.app, 'loadLazyController');
      this.app.onNewThumbnail();
    });

    test('Should lazy load recording-timer controller', function() {
      sinon.assert.calledWith(this.app.loadLazyController, 'controllers/preview-gallery');
    });
  });

  suite('App#onPreview', function() {
    setup(function() {
      this.sandbox.stub(this.app, 'loadLazyController').returns({
        then: sinon.stub().callsArg(0)
      });
      this.app.onPreview();
    });

    test('Should lazy load preview gallery controller', function() {
      sinon.assert.calledWith(this.app.loadLazyController, 'controllers/preview-gallery');
    });

    test('Should re-emit `preview`', function() {
      sinon.assert.calledWith(this.app.emit, 'preview');
    });
  });

  suite('App#loadLazyController()', function() {
    setup(function() {
      this.sandbox.stub(this.app, 'loadLazyControllers').returns('<promise>');
      this.app.controllers.lazy = [];
    });

    test('Should add to lazy load controllers if critical path not reached', function() {
      var promise = this.app.loadLazyController('<controller>');
      assert.isTrue(this.app.controllers.lazy[0] === '<controller>');
      assert.isTrue(promise === undefined);
    });

    test('Should lazy load immediately if critical path done', function() {
      this.app.criticalPathDone = true;
      var promise = this.app.loadLazyController('<controller>');
      sinon.assert.called(this.app.loadLazyControllers);
      assert.isTrue(promise === '<promise>');
      assert.isTrue(this.app.dynamicLazy['<controller>'] === '<promise>');
    });

    test('Should return existing lazy load promise', function() {
      this.app.criticalPathDone = true;
      this.app.dynamicLazy['<controller>'] = '<existing-promise>';
      var promise = this.app.loadLazyController('<controller>');
      sinon.assert.notCalled(this.app.loadLazyControllers);
      assert.isTrue(promise === '<existing-promise>');
    });
  });

  suite('App#loadLazyControllers()', function() {
    setup(function() {
      this.fakeControllers = [ sinon.spy(), sinon.spy(), sinon.spy() ];
      this.lazyPromise = this.app.loadLazyControllers(this.app.controllers.lazy);
      this.callback = this.app.require.withArgs(this.app.controllers.lazy).args[0][1];
      this.callback.apply(window, this.fakeControllers);
    });

    test('It requires the lazy controllers', function() {
      sinon.assert.calledWith(this.app.require, this.app.controllers.lazy);
    });

    test('It runs each controller, passing in the App instance', function() {
      var self = this;
      this.fakeControllers.forEach(function(fakeController) {
        sinon.assert.calledWith(fakeController, self.app);
      });
    });

    test('It emits `lazyloaded`', function() {
      sinon.assert.calledWith(this.app.emit, 'lazyloaded');
    });

    test('It fulfills the promise', function(done) {
      this.lazyPromise.then(done);
    });
  });

  suite('after critical path', function() {
    setup(function() {

      // Stop annoying logs
      this.sandbox.stub(console, 'log');
      this.app.boot();
      this.app.emit('viewfinder:visible');
    });

    test('It loads lazy controllers', function() {
      sinon.assert.calledWith(this.app.require, this.app.controllers.lazy);
    });

    test('It fires the \'loaded\' event only when:', function(done) {
      var loadLazyControllersRequireCallback = this.app.require.args[0][1];

      // 1. Lazy controllers have loaded
      loadLazyControllersRequireCallback();

      // 2. Storage has been checked
      this.app.emit('storage:checked');

      this.app.once('loaded', done);
    });
  });

  suite('App#onKeyDown', function() {
    setup(function() {
      this.settings.keyDownEvents.get.withArgs('volumedown')
        .returns('capture');
      this.settings.keyDownEvents.get.withArgs('volumeup')
        .returns('capture');
      this.settings.keyDownEvents.get.withArgs('camera')
        .returns('capture');
      this.settings.keyDownEvents.get.withArgs('mozcamerafocusadjust')
        .returns('focus');
    });

    test('`volumedown` key emits a `keydown:capture` event', function() {
      this.app.onKeyDown({ key: 'volumedown' });
      sinon.assert.calledWith(this.app.emit, 'keydown:capture');
    });

    test('`volumeup` key emits a `keydown:capture` event', function() {
      this.app.onKeyDown({ key: 'volumeup' });
      sinon.assert.calledWith(this.app.emit, 'keydown:capture');
    });

    test('`camera` key emits a `keydown:capture` event', function() {
      this.app.onKeyDown({ key: 'camera' });
      sinon.assert.calledWith(this.app.emit, 'keydown:capture');
    });

    test('`focus` key emits a `keydown:focus` event', function() {
      this.app.onKeyDown({ key: 'mozcamerafocusadjust' });
      sinon.assert.calledWith(this.app.emit, 'keydown:focus');
    });
  });
});
