suite('controllers/battery', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'controllers/battery',
      'lib/settings',
      'lib/setting',
      'views/notification'
    ], function(
      App, BatteryController, Settings, Setting, NotificationView) {
      self.BatteryController = BatteryController.BatteryController;
      self.NotificationView = NotificationView;
      self.Settings = Settings;
      self.Setting = Setting;
      self.App = App;
      done();
    });
  });

  setup(function() {
    var levels = {
      low: 15,
      verylow: 10,
      critical: 6,
      shutdown: 5,
      healthy: 100
    };

    this.sandbox = sinon.sandbox.create();
    this.app = sinon.createStubInstance(this.App);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.battery = sinon.createStubInstance(this.Setting);
    this.app.settings.battery.get.withArgs('levels').returns(levels);
    this.app.l10n = { get: sinon.stub() };
    this.app.localized = sinon.stub().returns(true);
    this.app.views = {
      notification: sinon.createStubInstance(this.NotificationView)
    };

    // Fake battery
    this.app.battery = {
      addEventListener: sinon.stub(),
      level: 1,
      charging: false
    };

    // Shortcuts
    this.notification = this.app.views.notification;

    // Keep reference of
    // things we want to restore
    this.backup = {
      mozSettings: navigator.mozSettings
    };

    // Mock object that mimicks
    // mozSettings get API. Inside
    // tests set this.mozSettingsGetResult
    // define the result of the mock call.
    navigator.mozSettings = {
      createLock: function() { return this; },
      get: sinon.stub(),
      set: sinon.stub(),
      addObserver: sinon.stub()
    };

    navigator.mozSettings.get.withArgs('powersave.enabled').returns(
      Promise.resolve({'powersave.enabled': false})
    );

    navigator.mozSettings.get.withArgs('screen.timeout').returns(
      Promise.resolve({'screen.timeout': 60})
    );

    // Our test instance
    this.controller = new this.BatteryController(this.app);
  });

  teardown(function() {
    this.sandbox.restore();
    navigator.mozSettings = this.backup.mozSettings;
  });

  suite('BatteryController()', function() {
    test('Should listen to the following events', function() {
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('camera:configured'));
      assert.ok(this.app.on.calledWith('camera:previewactive'));
      assert.ok(this.app.battery.addEventListener.calledWith('levelchange'));
      assert.ok(this.app.battery.addEventListener.calledWith('chargingchange'));
      assert.ok(navigator.mozSettings.addObserver.calledWith('powersave.enabled'));
    });

    test('Should update the status initially', function() {
      assert.ok(this.app.set.calledWith('batteryStatus', 'healthy'));
    });

    test('Should query power save state', function() {
      assert.ok(navigator.mozSettings.get.calledWith('powersave.enabled'));
    });
  });

  suite('BatteryController#updateStatus()', function() {
    test('should call app.set with batteryStatus and battery charging' +
        ' on updateStatus', function() {
      this.app.battery.charging = true;
      this.controller.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'charging'));
    });

    test('should call app.set with batteryStatus and low battery level' +
        ' on updateStatus', function() {
      this.app.battery.level = 0.11;
      this.controller.app.get
        .withArgs('batteryStatus')
        .returns('charging');

      this.controller.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'low'));
    });

    test('should call app.set with batteryStatus and verylow battery' +
          ' level on updateStatus', function() {
      this.app.battery.level = 0.10;
      this.controller.app.get
        .withArgs('batteryStatus')
        .returns('low');

      this.controller.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'verylow'));
    });

    test('should call app.set with batteryStatus and critical battery' +
        ' level on updateStatus', function() {
      this.app.battery.level = 0.06;
      this.controller.app.get
        .withArgs('batteryStatus')
        .returns('verylow');

      this.controller.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'critical'));
    });

    test('should call app.set with batteryStatus and battery shutdown' +
        ' level on updateStatus', function() {
      this.app.battery.level = 0.05;
      this.controller.app.get
        .withArgs('batteryStatus')
        .returns('critical');

      this.controller.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'shutdown'));
    });

    test('should call app.set with batteryStatus and battery healthy' +
        ' level on updateStatus', function() {
      this.app.battery.level = 1;
      this.controller.app.get
        .withArgs('batteryStatus')
        .returns('charging');

      this.controller.updateStatus();
      assert.ok(this.app.set.calledWith('batteryStatus', 'healthy'));
    });

    test('should wait for the app to be localized', function() {
      this.app.battery.level = 0.06;
      this.app.localized.returns(false);
      this.controller.app.get
        .withArgs('batteryStatus')
        .returns('critical');

      this.controller.updateStatus();
      assert.ok(this.app.on.calledWith('localized'));
    });
  });

  suite('BatteryController#onStatusChange()', function() {
    test('Should display notification if required', function() {
      this.controller.onStatusChange('low');
      assert.isTrue(this.notification.display.called);
      this.notification.display.reset();

      this.controller.onStatusChange('verylow');
      assert.isTrue(this.notification.display.called);
      this.notification.display.reset();

      this.controller.onStatusChange('critical');
      assert.isTrue(this.notification.display.called);
      this.notification.display.reset();

      this.controller.onStatusChange('healthy');
      assert.isFalse(this.notification.display.called);
      this.notification.display.reset();

      this.controller.onStatusChange('shutdown');
      assert.isFalse(this.notification.display.called);
      this.notification.display.reset();
    });

    test('Should always clear the last notification', function() {
      this.controller.onStatusChange('low');
      assert.isTrue(this.notification.clear.called);
    });
  });

  suite('BatteryController#restoreScreenTimeout', function() {
    test('Should do nothing if no old timeout cached', function() {
      this.controller.restoreScreenTimeout();
      assert.isFalse(navigator.mozSettings.set.called);
    });

    test('Should restore original timeout if cached', function() {
      this.controller.cachedScreenTimeout = 120;
      this.controller.restoreScreenTimeout();
      assert.ok(navigator.mozSettings.set.called);
      assert.ok(typeof(this.controller.cachedScreenTimeout) === 'undefined');
    });
  });

  suite('BatteryController#updateScreenTimeout', function() {
    setup(function() {
      this.sandbox.stub(this.controller, 'restoreScreenTimeout');
      this.app.hidden = false;
      this.controller.powerSave = true;
      this.controller.powerSaveScreenTimeout = 120;
      navigator.mozSettings.get.reset();
      navigator.mozSettings.set.reset();
    });

    test('Should do nothing if app is hidden', function() {
      this.app.hidden = true;
      this.controller.updateScreenTimeout();
      assert.isFalse(navigator.mozSettings.get.called);
      assert.isFalse(this.controller.restoreScreenTimeout.called);
    });

    test('Should do nothing if no timeout configured', function() {
      delete this.controller.powerSaveScreenTimeout;
      this.controller.updateScreenTimeout();
      assert.isFalse(navigator.mozSettings.get.called);
      assert.isFalse(this.controller.restoreScreenTimeout.called);
    });

    test('Should query screen timeout if power save enabled', function() {
      this.controller.updateScreenTimeout();
      assert.isTrue(navigator.mozSettings.get.calledWith('screen.timeout'));
    });

    test('Should call `restoreScreenTimeout` if power save disabled', function() {
      this.controller.powerSave = false;
      this.controller.updateScreenTimeout();
      sinon.assert.called(this.controller.restoreScreenTimeout);
    });
  });

  suite('BatteryController#onPowerSaveChange()', function() {
    setup(function() {
      this.sandbox.stub(this.controller, 'updateScreenTimeout');
      this.controller.onPowerSaveChange({settingValue: 'result'});
    });

    test('Should emit `battery:powersave`', function() {
      assert.ok(this.app.emit.calledWith('battery:powersave', 'result'));
    });

    test('Should call `updateScreenTimeout`', function() {
      sinon.assert.called(this.controller.updateScreenTimeout);
    });

    test('Should save power save status', function() {
      assert.equal(this.controller.powerSave, 'result');
    });
  });

  suite('BatteryController#onPreviewActive', function() {
    setup(function() {
      this.sandbox.stub(this.controller, 'restoreScreenTimeout');
    });

    test('Should do nothing if preview activated', function() {
      this.controller.onPreviewActive(true);
      sinon.assert.notCalled(this.controller.restoreScreenTimeout);
    });

    test('Should call `restoreScreenTimeout` if preview deactivated', function() {
      this.controller.onPreviewActive(false);
      sinon.assert.called(this.controller.restoreScreenTimeout);
    });
  });
});
