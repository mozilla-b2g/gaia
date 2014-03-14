suite('controllers/battery', function() {
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;

    req([
      'app',
      'controllers/battery',
      'lib/settings',
      'views/notification'
    ], function(
      App, BatteryController, Settings, NotificationView) {
      self.BatteryController = BatteryController.BatteryController;
      self.NotificationView = NotificationView;
      self.Settings = Settings;
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
    this.app.settings.battery = sinon.createStubInstance(this.Settings);
    this.app.settings.battery.get.withArgs('levels').returns(levels);
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

    // Our test instance
    this.controller = new this.BatteryController(this.app);
  });

  suite('BatteryController()', function() {
    test('Should listen to the following events', function() {
      assert.ok(this.app.on.calledWith('change:batteryStatus'));
      assert.ok(this.app.battery.addEventListener.calledWith('levelchange'));
      assert.ok(this.app.battery.addEventListener.calledWith('chargingchange'));
    });

    test('Should update the status initially', function() {
      assert.ok(this.app.set.calledWith('batteryStatus', 'healthy'));
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
});
