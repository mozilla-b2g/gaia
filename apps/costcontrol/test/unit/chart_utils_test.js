/* global ChartUtils, Toolkit, Common */

'use strict';

require('/test/unit/mock_date.js');
require('/test/unit/mock_debug.js');
require('/test/unit/mock_moz_l10n.js');
require('/js/common.js');
require('/js/utils/toolkit.js');
require('/js/utils/chart.js');

suite('ChartUtils suite >', function() {

  var CHART_BG_RATIO = 0.87;
  var DAY = 24 * 60 * 60 * 1000;
  var NEVER_PERIOD = 30 * DAY;

  var realMozL10n, realDate;
  var now;

  if (!window.navigator.mozL10n) {
    window.navigator.mozL10n = null;
  }

  suiteSetup(function() {
    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realDate = window.Date;
    now = new realDate(2014, 0, 1); // 2014-01-01
    window.Date = new window.MockDateFactory(now);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
    window.Date = realDate;
  });

  test('convert to device pixels', function() {
    assert.equal(ChartUtils.toDevicePixels(100), 100 * window.devicePixelRatio);
  });

  test('make a valid CSS font string', function() {
    assert.equal(ChartUtils.makeCSSFontString(10, 'normal'),
      'normal 10px sans-serif');
  });

  test('get data limit in raw bytes', function() {
    var mbSettings = {
      dataLimitUnit: 'MB',
      dataLimitValue: 1
    };
    var gbSettings = {
      dataLimitUnit: 'GB',
      dataLimitValue: 1
    };
    assert.equal(ChartUtils.getLimitInBytes(mbSettings), 1000000);
    assert.equal(ChartUtils.getLimitInBytes(gbSettings), 1000000000);
  });

  test('calculate upper date', function() {
    var weeklySettings = {
      trackingPeriod: 'weekly',
      lastCompleteDataReset: now,
      nextReset: new realDate(2014, 0, 8)
    };
    var monthlySettings = {
      trackingPeriod: 'monthly',
      lastCompleteDataReset: now,
      nextReset: new realDate(2014, 1, 1)
    };
    var neverSettings = {
      trackingPeriod: 'never',
      lastCompleteDataReset: now
    };

    assert.equal(ChartUtils.calculateUpperDate(weeklySettings).toUTCString(),
      new realDate(weeklySettings.nextReset.getTime() - DAY).toUTCString());
    assert.equal(ChartUtils.calculateUpperDate(monthlySettings).toUTCString(),
      new realDate(monthlySettings.nextReset.getTime() - DAY).toUTCString());
    assert.equal(ChartUtils.calculateUpperDate(neverSettings).toUTCString(),
      new realDate(now.getTime() + NEVER_PERIOD).toUTCString());
  });

  test('calculate lower date', function() {
    var weeklySettings = {
      trackingPeriod: 'weekly',
      lastCompleteDataReset: now,
      nextReset: new realDate(2014, 0, 8)
    };
    var monthlySettings = {
      trackingPeriod: 'monthly',
      lastCompleteDataReset: now,
      nextReset: new realDate(2014, 1, 1)
    };
    var neverSettings = {
      trackingPeriod: 'never',
      lastCompleteDataReset: now
    };

    assert.equal(ChartUtils.calculateLowerDate(weeklySettings).toUTCString(),
      new realDate(now).toUTCString());
    assert.equal(ChartUtils.calculateLowerDate(monthlySettings).toUTCString(),
      new realDate(now).toUTCString());
    assert.equal(ChartUtils.calculateLowerDate(neverSettings).toUTCString(),
      new realDate(now).toUTCString());
  });

  test('expand the base model with computed values', function() {
    var base = {
      width: 100,
      height: 100,
      originX: 15,
      endX: 95,
      axis: {
        X: {
          lower: new realDate(2014, 0, 1),
          upper: new realDate(2014, 0, 31)
        },
        Y: {
          lower: 0,
          margin: 0.20
        }
      },
      limits: {
        enabled: true,
        value: 10000000 // 10 MB
      },
      data: {
        wifi: {
          enabled: true,
          total: 0
        },
        mobile: {
          enabled: true,
          total: 0
        }
      },
      todayLabel: {}
    };

    ChartUtils.expandModel(base);

    assert.equal(base.originY, Math.floor(base.height * CHART_BG_RATIO));
    assert.equal(base.axis.X.today.toUTCString(),
      Toolkit.toMidnight(now).toUTCString());
    assert.equal(base.axis.X.len, base.endX - base.originX);
    assert.equal(typeof base.axis.X.get, 'function');
    assert.equal(typeof base.axis.Y.get, 'function');
    assert.equal(base.axis.Y.maxValue, Math.max(
      base.limits.value, base.data.mobile.total, base.data.wifi.total));
    assert.equal(base.axis.Y.upper, (1 + base.axis.Y.margin) *
      base.axis.Y.maxValue);
    assert.equal(base.axis.Y.step, base.axis.Y.get(base.axis.Y.maxValue));
    assert.equal(base.limits.warning, Common.DATA_USAGE_WARNING);
    assert.equal(base.limits.warningValue, base.limits.value *
      Common.DATA_USAGE_WARNING);
  });

});
