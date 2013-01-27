
/*
 * The data usage tab is in charge of usage charts of mobile and wi-fi networks.
 *
 * It has several canvas areas layered one above the others.
 */

var DataUsageTab = (function() {

  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  var today = new Date();
  var tomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24);
  toMidnight(tomorrow);
  var yesterday = new Date(today.getTime() - 1000 * 60 * 60 * 24);
  toMidnight(yesterday);

  var graphicArea, graphicPattern;
  var wifiLayer, mobileLayer;
  var wifiOverview, mobileOverview;
  var wifiToggle, mobileToggle;
  var wifiItem, mobileItem;
  var dateFormat, dateFormatter;

  var tabmanager, costcontrol, initialized, model;
  function setupTab(tmgr) {
    if (initialized)
      return;

    dateFormat = _('chart-date-format') || '%b %e';
    dateFormatter = new navigator.mozL10n.DateTimeFormat();

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;
      tabmanager = tmgr;

      // HTML entities
      graphicArea = document.getElementById('graphic-area');
      graphicPattern = document.getElementById('graphic-pattern');
      wifiLayer = document.getElementById('wifi-layer');
      mobileLayer = document.getElementById('mobile-layer');
      mobileItem = document.getElementById('mobileItem');
      wifiItem = document.getElementById('wifiItem');
      wifiOverview = document.getElementById('wifiOverview');
      mobileOverview = document.getElementById('mobileOverview');
      wifiToggle = document.getElementById('wifiCheck');
      mobileToggle = document.getElementById('mobileCheck');

      window.addEventListener('localized', localize);

      // Configure showing tab
      var dataUsageTab = document.getElementById('datausage-tab-filter');
      dataUsageTab.addEventListener('click', function _showTab() {
        tabmanager.changeViewTo('datausage-tab');
      });

      // Update and chart visibility
      document.addEventListener('mozvisibilitychange', updateWhenVisible);
      wifiToggle.addEventListener('click', toggleWifi);
      mobileToggle.addEventListener('click', toggleMobile);

      // Setup the model
      ConfigManager.requestSettings(function _onSettings(settings) {
        debug('First time setup for model');
        var lastDataReset = settings.lastDataReset;
        var nextReset = settings.nextReset;
        trackingPeriod = settings.trackingPeriod;
        model = {
          height: graphicArea.clientHeight,
          width: graphicArea.clientWidth,
          originX: Math.floor(graphicArea.clientWidth * 0.15),
          endX: Math.floor(graphicArea.clientWidth * 0.95),
          axis: {
            Y: {
              lower: 0,
              margin: 0.20
            },
            X: {
              lower: lastDataReset ? new Date(lastDataReset) :
                                     new Date(yesterday),
              upper: nextReset ? new Date(nextReset.getTime()) :
                                 new Date(tomorrow),
              today: today
            }
          },
          limits: {
            enabled: settings.dataLimit,
            value: getLimitInBytes(settings)
          },
          data: {
            wifi: {
              enabled: true
            },
            mobile: {
              enabled: true
            }
          }
        };

        ConfigManager.observe('dataLimit', toggleDataLimit, true);
        ConfigManager.observe('dataLimitValue', setDataLimit, true);
        ConfigManager.observe('lastDataReset', changeLastReset, true);
        ConfigManager.observe('nextReset', changeNextReset, true);

        expandModel(model);
        requestDataUsage();

        initialized = true;
      });
    });
  }

  function localize() {
    if (initialized) {
      drawTodayLayer(model);
      drawAxisLayer(model);
      drawLimits(model);
      // updateUI();
    }
  }

  function finalize() {
    if (!initialized)
      return;

    document.removeEventListener('mozvisibilitychange', updateWhenVisible);
    wifiToggle.removeEventListener('click', toggleWifi);
    mobileToggle.removeEventListener('click', toggleMobile);
    ConfigManager.removeObserver('dataLimit', toggleDataLimit);
    ConfigManager.removeObserver('dataLimitValue', setDataLimit);
    ConfigManager.removeObserver('lastDataReset', changeLastReset);
    ConfigManager.removeObserver('nextReset', changeNextReset);

    initialized = false;
  }

  function getLimitInBytes(settings) {
    var multiplier = 1000000; // MB
    if (settings.dataLimitUnit === 'GB')
      multiplier = 1000000000; // GB

    var value = settings.dataLimitValue;
    return (value && value !== 0) ? value * multiplier : null;
  }

  // UPDATES

  // On visibility change
  function updateWhenVisible(evt) {
    if (!document.mozHidden)
      requestDataUsage();
  }

  function requestDataUsage() {
    var requestObj = { type: 'datausage' };
    costcontrol.request(requestObj, updateCharts);
  }

  function updateCharts(result) {
    if (result.status === 'success') {
      debug('Updating model');
      var modelData = result.data;
      model.axis.X = {
        lower: modelData.start,
        upper: modelData.end,
        today: modelData.today
      };
      model.data.wifi.samples = modelData.wifi.samples;
      model.data.wifi.total = modelData.wifi.total;
      model.data.mobile.samples = modelData.mobile.samples;
      model.data.mobile.total = modelData.mobile.total;

      expandModel(model);
    }

    debug('Rendering');
    updateUI();
  }

  // OBSERVERS

  function toggleDataLimit(value) {
    model.limits.enabled = value;
    drawAxisLayer(model);
    drawLimits(model);
    drawWarningOverlay(model);
  }

  function setDataLimit(value, old, key, settings) {
    model.limits.value = getLimitInBytes(settings);
    expandModel(model);
    updateUI();
  }

  function changeLastReset(value) {
    model.axis.X.lower = value ? new Date(value) : new Date(yesterday);
    expandModel(model);
    requestDataUsage();
  }

  function changeNextReset(value, old, key, settings) {
    trackingPeriod = settings.trackingPeriod;
    model.axis.X.upper = value ? new Date(value.getTime() - DAY) :
                                 new Date(tomorrow);
    expandModel(model);
    updateUI();
  }

  // USER INTERFACE

  // On tapping on wifi toggle
  function toggleWifi() {
    wifiLayer.setAttribute('aria-hidden', !wifiToggle.checked);
    wifiItem.setAttribute('aria-disabled', !wifiToggle.checked);
  }

  // On tapping on mobile toggle
  function toggleMobile() {
    mobileLayer.setAttribute('aria-hidden', !mobileToggle.checked);
    mobileItem.setAttribute('aria-disabled', !mobileToggle.checked);
  }

  // Expand the model with some computed values
  function expandModel(base) {

    // Graphic settings
    base.originY = Math.floor(base.height * 5 / 6);

    // Normalize today
    toMidnight(base.axis.X.today);
    toMidnight(base.axis.X.lower);
    toMidnight(base.axis.X.upper);

    // X axis projection function to convert a value into a pixel value
    var xLowerBound = base.axis.X.lower.getTime();
    var xSize = base.axis.X.upper.getTime() - xLowerBound;
    var realWidth = base.endX - base.originX;
    base.axis.X.len = realWidth;
    base.axis.X.get = function cc_dataToXPx(value) {
      var projection = (value.getTime() - xLowerBound) / xSize;
      return projection * realWidth + base.originX;
    };

    // Y max value
    base.axis.Y.maxValue = Math.max(base.limits.value,
                                    base.data.mobile.total,
                                    base.data.wifi.total);

    // Y axis projection function and automatic values
    base.axis.Y.range = base.axis.Y.upper - base.axis.Y.lower;
    base.axis.Y.upper = (1 + base.axis.Y.margin) * base.axis.Y.maxValue;
    var yLowerBound = base.axis.Y.lower;
    var ySize = base.axis.Y.upper - yLowerBound;
    base.axis.Y.get = function cc_dataToYPx(value) {
      var projection = (value - yLowerBound) / ySize;
      return base.originY * (1 - projection);
    };
    base.axis.Y.step = base.axis.Y.get(base.axis.Y.maxValue);

    // Limits
    base.limits.warning = costcontrol.getDataUsageWarning();
    base.limits.warningValue = base.limits.value * base.limits.warning;
  }

  function updateUI() {
    // Update overview
    wifiOverview.textContent = formatData(roundData(model.data.wifi.total));
    mobileOverview.textContent = formatData(roundData(model.data.mobile.total));

    // Render the charts
    drawBackgroundLayer(model);
    drawTodayLayer(model);
    drawAxisLayer(model);
    drawWifiGraphic(model);
    drawMobileGraphic(model);
    drawWarningOverlay(model);
    drawLimits(model);
  }

  function drawBackgroundLayer(model) {
    var canvas = document.getElementById('background-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // White bg
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, model.originY);

    // Horizontal lines every step
    var step = model.axis.Y.step;
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    for (var y = 0.5 + model.originY - step; y > step; y -= step) {
      ctx.moveTo(model.originX, y);
      ctx.lineTo(model.endX, y);
      ctx.stroke();
    }

    // Vertical lines every day
    var day = 1000 * 60 * 60 * 24; // milliseconds in a day
    var days = (model.axis.X.upper - model.axis.X.lower) / day;
    var step = model.axis.X.len / days;
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (var x = model.originX; x <= model.endX; x += step) {
      ctx.moveTo(x, model.originY);
      ctx.lineTo(x, 0);
      ctx.stroke();
    }
  }

  var todayLabel = {};
  function drawTodayLayer(model) {
    var canvas = document.getElementById('today-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Compute the X offset
    var offsetX = model.axis.X.get(model.axis.X.today) + 0.5;

    // Configure Centered today text
    var fontsize = 14;
    var marginTop = 10;
    
    var todayTag = dateFormatter.localeFormat(model.axis.X.today, dateFormat);

    // Render the text
    ctx.font = '600 ' + fontsize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Update measues of today label
    var metrics = ctx.measureText(todayTag);
    todayLabel.x0 = offsetX - metrics.width / 2;
    todayLabel.x1 = offsetX + metrics.width / 2;
    if (todayLabel.x1 > model.endX)
      ctx.textAlign = 'right';

    ctx.fillStyle = 'black';
    ctx.fillText(todayTag, offsetX, model.originY + marginTop);
  }

  var trackingPeriod;
  function drawAxisLayer(model) {

    var canvas = document.getElementById('axis-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Start drawing Y axis
    var step = model.axis.Y.step;
    var dataStep = model.axis.Y.upper - model.axis.Y.maxValue;
    var offsetX = model.originX / 2, marginBottom = 4;
    var fontsize = 14;
    ctx.font = '500 ' + fontsize + 'px Arial';
    ctx.textAlign = 'center';
    var lastUnit;
    for (var y = 0.5 + model.originY, value = 0;
         y > step; y -= step, value += dataStep) {

      // First X label for 0 is aligned with the bottom
      if (value === 0) {
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatData(smartRound(0, 0)), offsetX, y - 2.5);
        continue;
      }

      // Rest of labels are aligned with the middle
      var rounded = smartRound(value, 0);
      var v = rounded[0];
      var u = rounded[1][0];
      var label = v;
      if (lastUnit !== u)
        label = formatData([v, u]);

      lastUnit = u;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = (value === model.limits.value) && model.limits.enabled ?
                      '#b50202' : '#6a6a6a';
      ctx.fillText(label, offsetX, y);
    }

    // Now the X axis
    if (trackingPeriod === 'never')
      return;

    ctx.fillStyle = '#6a6a6a';
    var marginTop = 10;

    // Left tag
    var leftTag = dateFormatter.localeFormat(model.axis.X.lower, dateFormat);
    ctx.font = '600 ' + fontsize + 'px Arial';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';

    var isBelowToday = todayLabel.x0 <=
                       model.originX + ctx.measureText(leftTag).width;
    if (!isBelowToday)
      ctx.fillText(leftTag, model.originX, model.originY + marginTop);

    // Right tag
    var rightTag = dateFormatter.localeFormat(model.axis.X.upper, dateFormat);
    ctx.textAlign = 'end';

    isBelowToday = todayLabel.x1 >=
                   model.endX - ctx.measureText(rightTag).width;
    if (!isBelowToday) {
      ctx.fillText(rightTag, model.endX, model.originY + marginTop);
    }
  }

  function drawLimits(model) {
    var enabled = model.limits.enabled;
    var set = model.limits.value;
    var color = enabled ? '#b50202' : '#878787';

    var canvas = document.getElementById('limits-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');
    ctx.font = '600 ' + 12 + 'px Arial';

    var fontsize = 12;
    var marginLeft = 4;
    var marginTop = 1;
    var offsetY = set ? Math.floor(model.axis.Y.get(model.limits.value)) :
                        fontsize + 2 * marginTop;

    // The dashed limit line
    var lineLength = 15;
    var gapLength = 7;
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (var x = model.originX, y = offsetY - 0.5;
         x < model.endX; x += gapLength) {
      ctx.moveTo(x, y);
      ctx.lineTo(Math.min(x += lineLength, model.endX), y);
    }
    ctx.stroke();
  }

  function drawWifiGraphic(model) {
    var samples = model.data.wifi.samples;
    if (!samples)
      return;

    var canvas = document.getElementById('wifi-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Fill
    ctx.fillStyle = '#cbd936';
    ctx.strokeStyle = '#8b9052';
    ctx.lineWidth = 2;
    ctx.moveTo(model.originX, model.originY);
    var sum = 0; var x, y, slopeX;
    var lastX = model.originX, lastY = model.axis.Y.get(sum);
    for (var i = 0, len = samples.length; i < len; i++) {

      var sample = samples[i];
      if (sample.value == undefined) {
        lastX = x = model.axis.X.get(sample.date);
        ctx.moveTo(x, y);
        continue;
      }

      sum += sample.value;
      x = model.axis.X.get(sample.date);
      slopeX = x + 0.5; // Used instead of x, avoid some graphic errors
      y = model.axis.Y.get(sum);

      // Fill
      ctx.beginPath();
      ctx.lineTo(slopeX, y);
      ctx.lineTo(slopeX, model.originY);
      ctx.lineTo(lastX, model.originY);
      ctx.lineTo(lastX, lastY);
      ctx.moveTo(slopeX, y);
      ctx.fill();

      // Stroke
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastX = x;
      lastY = y;
    }

    // The circle
    var radius = 4;
    ctx.fillStyle = '#8b9052';
    var todayWifi = model.data.wifi.total;
    ctx.beginPath();
    ctx.arc(x, model.axis.Y.get(todayWifi), radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawMobileGraphic(model) {
    var samples = model.data.mobile.samples;
    if (!samples)
      return;

    var canvas = document.getElementById('mobile-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(147, 21, 98, 0.7)';
    ctx.strokeStyle = '#762d4a';
    ctx.lineWidth = 2;

    var sum = 0; var x, y, slopeX;
    var lastX = model.originX, lastY = model.axis.Y.get(sum);
    for (var i = 0, len = samples.length; i < len; i++) {
      var sample = samples[i];
      if (sample.value == undefined) {
        lastX = x = model.axis.X.get(sample.date);
        ctx.moveTo(x, y);
        continue;
      }

      sum += sample.value;
      x = model.axis.X.get(sample.date);
      slopeX = x + 0.5;
      y = model.axis.Y.get(sum);

      // Fill
      ctx.beginPath();
      ctx.lineTo(slopeX, y);
      ctx.lineTo(slopeX, model.originY);
      ctx.lineTo(lastX, model.originY);
      ctx.lineTo(lastX, lastY);
      ctx.moveTo(slopeX, y);
      ctx.fill();

      // Stroke
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastX = x;
      lastY = y;
    }

    var pattern = ctx.createPattern(graphicPattern, 'repeat');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, model.originY);

    // The circle
    var radius = 4;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#762d4a';
    var todayMobile = model.data.mobile.total;
    ctx.beginPath();
    ctx.arc(x, model.axis.Y.get(todayMobile), radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawWarningOverlay(model) {
    var canvas = document.getElementById('warning-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    if (!model.limits.enabled || model.limits.value === null)
      return;

    // No problem here
    var mobileUsage = model.data.mobile.total;
    if (mobileUsage <= model.limits.warningValue)
      return;

    // Warning mode
    if (mobileUsage <= model.limits.value) {
      var limitValue = Math.floor(model.axis.Y.get(model.limits.value));
      var warningValue =
        Math.round(model.axis.Y.get(model.limits.warningValue));
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 112, 0, 0.5)';
      ctx.fillRect(
        model.originX, limitValue,
        model.axis.X.len + 0.5, warningValue - limitValue
      );

      return;
    }

    // Limit exceeded
    var limitValue = model.axis.Y.get(model.limits.value);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(
      model.originX, 0,
      model.axis.X.len + 0.5, limitValue
    );
  }

  return {
    initialize: setupTab,
    finalize: finalize
  };
}());
