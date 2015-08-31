'use strict';

/* global AdvancedTelemetryHelper, MockNavigatorSettings  */

require('/shared/js/advanced_telemetry_helper.js');
require('/shared/js/settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

/*
 * This test suite has several sub-suites that verify that:
 * 1) The metric is formatted correctly for a counter type of histogram
 * 2) The metric is formatted correctly for a linear type of histogram
 * 3) The metric is formatted correctly for an exponential type of histogram
 * 4) The metric is formatted correctly for logging a value for all types
 * 5) Disabling and Enabling the telemetry flag setting works correctly.
 */
suite('AdvancedTelemetryHelper:', function() {
  var realMozSettings;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  /*
   * This suite makes sure that the metrics are formatted properly.
   */
  suite('counter metric formatting:', function() {
    var ath;

    setup(function(done) {
      this.sinon.stub(console, 'info');
      // Suppress the error message
      this.sinon.stub(console, 'warn');

      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, { settingValue: true });
      done();
    });

    teardown(function() {
    });

    test('should call console info once', function(done) {
      ath = new AdvancedTelemetryHelper(AdvancedTelemetryHelper.HISTOGRAM_COUNT,
        'mymetric');
      sinon.assert.calledOnce(console.info);
      done();
    });

    test('should format the console message correctly', function(done) {
      ath = new AdvancedTelemetryHelper(AdvancedTelemetryHelper.HISTOGRAM_COUNT,
        'mymetric');
      sinon.assert.calledWith(console.info, 'telemetry|mymetric|4|1|0|0');
      done();
    });

    test('should not write format the message if missing param',
    function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_COUNT);
      sinon.assert.notCalled(console.info);
      // Should call a warning message.
      sinon.assert.calledOnce(console.warn);
      done();
    });
  });

  suite('linear metric formatting:', function() {
    var ath;

    setup(function(done) {
      this.sinon.stub(console, 'info');
      // Suppress the error message
      this.sinon.stub(console, 'warn');

      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, { settingValue: true });
      done();
    });

    teardown(function() {
    });

    test('should call console info once', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_LINEAR, 'mymetric', 10, 1, 10000, 5);
      sinon.assert.calledOnce(console.info);
      done();
    });

    test('should format the message correctly with full params',
    function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_LINEAR, 'mymetric', 1, 10000, 5);
      sinon.assert.calledWith(console.info, 'telemetry|mymetric|1|1|10000|5');
      done();
    });

    test('should not write format message if missing param', function(done) {
      ath = new AdvancedTelemetryHelper();
      sinon.assert.notCalled(console.info);
      // Should call a warning message.
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should not write format message if 3 params sent', function(done) {
      ath = new AdvancedTelemetryHelper('mymetric', 10, 1);
      sinon.assert.notCalled(console.info);
      // Should call a warning message.
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should not write format message if 2 params sent', function(done) {
      ath = new AdvancedTelemetryHelper('mymetric', 10);
      sinon.assert.notCalled(console.info);
      // Should call a warning message.
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should handle 0 min value and correct to 1', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_LINEAR, 'mymetric', 0, 1000, 10);
      sinon.assert.calledWith(console.info, 'telemetry|mymetric|1|1|1000|10');
      done();
    });

    test('should not allow underscores in metricname', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_LINEAR, 'my_metric', 0, 1000, 10);
      sinon.assert.calledWith(console.info, 'telemetry|my-metric|1|1|1000|10');
      done();
    });
  });

  suite('exponential metric formatting:', function() {
    var ath;

    setup(function(done) {
      this.sinon.stub(console, 'info');
      // Suppress the error message
      this.sinon.stub(console, 'warn');

      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, { settingValue: true });
      done();
    });

    teardown(function() {
    });

    test('should call console info once', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_EXP, 'mymetric', 0, 10000, 5);
      sinon.assert.calledOnce(console.info);
      done();
    });

    test('should format the message correctly with full params',
    function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_EXP, 'mymetric', 1, 10000, 5);
      sinon.assert.calledWith(console.info,
        'telemetry|mymetric|0|1|10000|5');
      done();
    });

    test('should not write format the message if missing param',
    function(done) {
      ath = new AdvancedTelemetryHelper();
      sinon.assert.notCalled(console.info);
      // Should call a warning message.
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should not write format message if 3 params sent', function(done) {
      ath = new AdvancedTelemetryHelper('mymetric', 10, 1);
      sinon.assert.notCalled(console.info);
      // Should call a warning message.
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should not write format message if 2 params sent', function(done) {
      ath = new AdvancedTelemetryHelper('mymetric', 10);
      sinon.assert.notCalled(console.info);
      // Should call a warning message.
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should handle 0 min value and correct to 1', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_EXP, 'mymetric', 0, 1000, 10);
      sinon.assert.calledWith(console.info, 'telemetry|mymetric|0|1|1000|10');
      done();
    });

    test('should not allow underscores in metricname', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_EXP, 'my_metric', 0, 1000, 10);
      sinon.assert.calledWith(console.info, 'telemetry|my-metric|0|1|1000|10');
      done();
    });
  });

  suite('log metric formatting:', function() {
    var ath;

    setup(function(done) {
      this.sinon.stub(console, 'info');
      // Suppress the error message
      this.sinon.stub(console, 'warn');

      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, { settingValue: true });
      done();
    });

    teardown(function() {
    });

    test('should format log for counter message properly', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_COUNT, 'mymetric');
      ath.add();
      sinon.assert.calledWith(console.info, 'telemetry|mymetric|1');
      done();
    });

    test('should format log correctly with parameter', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_COUNT, 'mymetric');
      ath.add(2);
      sinon.assert.calledWith(console.info, 'telemetry|mymetric|1');
      done();
    });

    test('should format log correctly for exp', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_EXP, 'mymetric', 1, 100, 10);
      ath.add(15);

      sinon.assert.calledWith(console.info, 'telemetry|mymetric|15');
      done();
    });

    test('should format log correctly for linear', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_LINEAR, 'mymetric', 1, 100, 10);
      ath.add(15);

      sinon.assert.calledWith(console.info, 'telemetry|mymetric|15');
      done();
    });

    test('should not log if no value for exp', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_EXP, 'mymetric', 1, 100, 10);
      ath.add();
      // Checking for calledOnce as it will be called once from the call
      // to .exp(...) but should not be called from the call to .log()
      sinon.assert.calledOnce(console.info);
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should not log if no value for linear', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_LINEAR, 'mymetric', 1, 100, 10);
      ath.add();
      // Checking for calledOnce as it will be called once from the call
      // to .linear(...) but should not be called from the call to .log()
      sinon.assert.calledOnce(console.info);
      sinon.assert.calledOnce(console.warn);
      done();
    });

    test('should not log if null or < 1 value for exp', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_EXP, 'mymetric', 1, 100, 10);
      ath.add(null);
      ath.add(-1);
      ath.add(0);
      // Checking for calledOnce as it will be called once from the call
      // to .exp(...) but should not be called from the call to .log() with
      // invalid params
      sinon.assert.calledOnce(console.info);
      sinon.assert.calledThrice(console.warn);
      done();
    });

    test('should not log if null or < 1 value for linear', function(done) {
      ath = new AdvancedTelemetryHelper(
        AdvancedTelemetryHelper.HISTOGRAM_LINEAR, 'mymetric', 1, 100, 10);
      ath.add(null);
      ath.add(-1);
      ath.add(0);
      // Checking for calledOnce as it will be called once from the call
      // to .linear(...) but should not be called from the call to .log() with
      // invalid params
      sinon.assert.calledOnce(console.info);
      sinon.assert.calledThrice(console.warn);
      done();
    });
  });

  suite('settings suite', function() {
    var ath, mockSettings, clock;

    setup(function(done) {
      this.sinon.stub(console, 'info');
      // Suppress the error message
      this.sinon.stub(console, 'warn');

      AdvancedTelemetryHelper.telemetryEnabled = false;
      mockSettings = MockNavigatorSettings.mSettings;
      clock = this.sinon.useFakeTimers();

      done();
    });

    teardown(function() {
    });

    test('should not create a message if telemetry disabled', function(done) {
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, { settingValue: false });

      ath = new AdvancedTelemetryHelper(AdvancedTelemetryHelper.HISTOGRAM_EXP,
        'mymetricexp', 0, 10000, 5);
      sinon.assert.notCalled(console.info);
      done();
    });

    test('should start writing setting enabled at runtime', function(done) {
      // Setting should be disabled by default
      assert(AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, false);

      // Enable it
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, { settingValue: true });

      ath = new AdvancedTelemetryHelper(AdvancedTelemetryHelper.HISTOGRAM_EXP,
        'mymetric', 0, 10000, 5);
      ath.add(1);
      ath.add(2);

      sinon.assert.calledThrice(console.info);

      // Disable it
      MockNavigatorSettings.mTriggerObservers(
        AdvancedTelemetryHelper.TELEMETRY_ENABLED_KEY, { settingValue: false });

      // Call it once more
      ath.add(5);

      // Should not be called again as telemetry was disabled.
      sinon.assert.calledThrice(console.info);
      done();
    });
  });
});
