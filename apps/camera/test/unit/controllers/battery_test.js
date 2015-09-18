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

    // Our test instance
    this.controller = new this.BatteryController(this.app);
  });

  teardown(function() {
    navigator.mozSettings = this.backup.mozSettings;
  });

  suite('BatteryController()', function() {
    test('Should listen to the following events', function() {
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.on.calledWith('change:recording'));
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

  suite('BatteryController#updatePowerSave()', function() {
    setup(function() {
      this.controller.powerSave = true;
      this.controller.powerSaveEnabled = true;
      this.app.get.withArgs('recording').returns(false);
    });

    test('Should emit `battery:powersave` if changed', function() {
      this.controller.powerSave = false;
      this.controller.updatePowerSave();
      assert.isTrue(this.controller.powerSave);
      assert.ok(this.app.emit.calledWith('battery:powersave', true));
    });

    test('Should disable if recording', function() {
      this.app.get.withArgs('recording').returns(true);
      this.controller.updatePowerSave();
      assert.isFalse(this.controller.powerSave);
      assert.ok(this.app.emit.calledWith('battery:powersave', false));
    });

    test('Should disable if power save disabled', function() {
      this.controller.powerSaveEnabled = false;
      this.controller.updatePowerSave();
      assert.isFalse(this.controller.powerSave);
      assert.ok(this.app.emit.calledWith('battery:powersave', false));
    });
  });

  suite('BatteryController#onPowerSaveChange()', function() {
    setup(function() {
      sinon.stub(this.controller, 'updatePowerSave');
      this.controller.onPowerSaveChange({settingValue: 'result'});
    });

    test('Should cache power save enabled state', function() {
      assert.isTrue(this.controller.powerSaveEnabled === 'result');
    });

    test('Should call `updatePowerSave`', function() {
      assert.ok(this.controller.updatePowerSave.called);
    });
  });
});
