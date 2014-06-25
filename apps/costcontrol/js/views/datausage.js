/* global _, ConfigManager, CostControl, debug, Toolkit, Formatting,
          SimManager */
/* jshint -W120 */

/*
 * The data usage tab is in charge of usage charts of mobile and wi-fi networks.
 *
 * It has several canvas areas layered one above the others.
 */
'use strict';
var DataUsageTab = (function() {

  var DAY = 24 * 60 * 60 * 1000;
  var NEVER_PERIOD = 30 * DAY;
  var NEVER_ANCHOR = 21 * DAY;

  var graphicArea, graphicPattern;
  var wifiLayer, mobileLayer, warningLayer, limitsLayer;
  var wifiOverview, mobileOverview;
  var wifiToggle, mobileToggle;
  var wifiItem, mobileItem;

  var costcontrol, initialized, model;

  var DEVICE_RATIO = window.devicePixelRatio || 1;
  function toDevicePixels(origin) {
     return origin * DEVICE_RATIO;
  }

  function setupTab() {
    if (initialized) {
      return;
    }

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

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
      warningLayer = document.getElementById('warning-layer');
      limitsLayer = document.getElementById('limits-layer');

      window.addEventListener('localized', localize);

      // Update and chart visibility
      document.addEventListener('visibilitychange', updateWhenVisible);
      wifiToggle.addEventListener('click', toggleWifi);
      mobileToggle.addEventListener('click', toggleMobile);

      resetButtonState();

      // Setup the model
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          debug('First time setup for model');
          model = {
            height: toDevicePixels(graphicArea.clientHeight),
            width: toDevicePixels(graphicArea.clientWidth),
            originX: Math.floor(toDevicePixels(graphicArea.clientWidth) * 0.15),
            endX: Math.floor(toDevicePixels(graphicArea.clientWidth) * 0.95),
            axis: {
              Y: {
                lower: 0,
                margin: 0.20
              },
              X: {
                lower: calculateLowerDate(settings),
                upper: calculateUpperDate(settings)
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
          ConfigManager.observe('lastCompleteDataReset', updateDataUsage, true);
          ConfigManager.observe('lastDataReset', updateDataUsage, true);
          ConfigManager.observe('nextReset', changeNextReset, true);

          initialized = true;
          requestDataUsage();
        });
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
    if (!initialized) {
      return;
    }

    document.removeEventListener('visibilitychange', updateWhenVisible);
    wifiToggle.removeEventListener('click', toggleWifi);
    mobileToggle.removeEventListener('click', toggleMobile);
    ConfigManager.removeObserver('dataLimit', toggleDataLimit);
    ConfigManager.removeObserver('dataLimitValue', setDataLimit);
    ConfigManager.removeObserver('lastCompleteDataReset', updateDataUsage);
    ConfigManager.removeObserver('lastDataReset', updateDataUsage);
    ConfigManager.removeObserver('nextReset', changeNextReset);

    initialized = false;
  }

  function resetButtonState() {
    SimManager.requestDataSimIcc(function(dataSimIcc) {
      ConfigManager.requestSettings(dataSimIcc.iccId,
                                    function _onSettings(settings) {
        var isMobileChartVisible = settings.isMobileChartVisible;
        if (typeof isMobileChartVisible === 'undefined') {
          isMobileChartVisible = true;
        }
        if (isMobileChartVisible !== mobileToggle.checked) {
          mobileToggle.checked = isMobileChartVisible;
          toggleMobile();
        }

        var isWifiChartVisible = settings.isWifiChartVisible;
        if (typeof isWifiChartVisible === 'undefined') {
          isWifiChartVisible = false;
        }
        if (isWifiChartVisible !== wifiToggle.checked) {
          wifiToggle.checked = isWifiChartVisible;
          toggleWifi();
        }
      });
    });
  }

  function getLimitInBytes(settings) {
    var multiplier = 1000000; // MB
    if (settings.dataLimitUnit === 'GB') {
      multiplier = 1000000000; // GB
    }

    var value = settings.dataLimitValue;
    return (value && value !== 0) ? value * multiplier : null;
  }

  // UPDATES

  // On visibility change
  function updateWhenVisible(evt) {
    if (!document.hidden) {
      requestDataUsage();
    }
  }

  function requestDataUsage() {
    SimManager.requestDataSimIcc(function(dataSimIcc) {
      ConfigManager.requestSettings(dataSimIcc.iccId,
                                    function _onSettings(settings) {
        var requestObj = { type: 'datausage' };
        costcontrol.request(requestObj, updateCharts);
      });
    });
  }

  function updateCharts(result) {
    if (result.status === 'success') {
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          debug('Updating model');
          var modelData = result.data;
          model.data.wifi.samples = modelData.wifi.samples;
          model.data.wifi.total = modelData.wifi.total;
          model.data.mobile.samples = modelData.mobile.samples;
          model.data.mobile.total = modelData.mobile.total;
          model.limits.enabled = settings.dataLimit;
          model.limits.value = getLimitInBytes(settings);
          model.axis.X.upper = calculateUpperDate(settings);
          model.axis.X.lower = calculateLowerDate(settings);
          expandModel(model);

          debug('Rendering');
          updateUI();
        });
      });
    } else {
      console.error('Error requesting data usage. This should not happen.');
    }
  }

  // OBSERVERS

  function toggleDataLimit(value) {
    model.limits.enabled = value;
    drawBackgroundLayer(model);
    drawAxisLayer(model);
    drawLimits(model);
    drawWarningOverlay(model);
  }

  function setDataLimit(value, old, key, settings) {
    model.limits.value = getLimitInBytes(settings);
    expandModel(model);
    updateUI();
  }

  function updateDataUsage(value) {
    requestDataUsage();
  }

  function changeNextReset(value, old, key, settings) {
    model.axis.X.upper = calculateUpperDate(settings);
    model.axis.X.lower = calculateLowerDate(settings);
    expandModel(model);
    updateUI();
  }

  function calculateUpperDate(settings) {
    var today = new Date();
    var trackingPeriod = settings.trackingPeriod;
    var nextReset = settings.nextReset;
    if (trackingPeriod !== 'never' && nextReset) {
      return new Date(nextReset.getTime() - DAY);
    }

    var lastReset = settings.lastCompleteDataReset || today;
    var offset = today.getTime() - lastReset.getTime();
    var upperDate = new Date(lastReset.getTime() + NEVER_PERIOD);
    if (offset >= NEVER_ANCHOR) {
      upperDate = new Date(today.getTime() + (NEVER_PERIOD - NEVER_ANCHOR));
    }

    debug('Upper date:', upperDate);
    return upperDate;
  }

  function calculateLowerDate(settings) {
    var lowerDate = Toolkit.toMidnight(new Date());
    var nextReset = settings.nextReset || lowerDate;
    var trackingPeriod = settings.trackingPeriod;

    if (trackingPeriod === 'weekly') {
      lowerDate.setTime(nextReset.getTime() - (7 * DAY));

    } else if (trackingPeriod === 'monthly') {
      var newMonth = nextReset.getMonth() - 1;
      var newYear = nextReset.getFullYear();
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }

      lowerDate.setDate(nextReset.getDate());
      lowerDate.setMonth(newMonth);
      lowerDate.setYear(newYear);

    } else {
      var lastReset = settings.lastCompleteDataReset || lowerDate;
      lowerDate = lastReset;
      var offset = today.getTime() - lastReset.getTime();
      if (offset >= NEVER_ANCHOR) {
        lowerDate = new Date(today.getTime() - NEVER_ANCHOR);
      }
    }

    debug('Lower date:', lowerDate);
    return lowerDate;
  }

  // Return true if a and b not differ more than threshold
  function same(a, b, threshold) {
    threshold = threshold || 0;
    return Math.abs(a - b) <= threshold;
  }

  // USER INTERFACE

  // On tapping on wifi toggle
  function toggleWifi() {
    var isChecked = wifiToggle.checked;
    wifiLayer.setAttribute('aria-hidden', !isChecked);
    wifiItem.setAttribute('aria-disabled', !isChecked);
    // save wifi toggled state
    ConfigManager.setOption({ isWifiChartVisible: isChecked });
  }

  // On tapping on mobile toggle
  function toggleMobile() {
    var isChecked = mobileToggle.checked;
    mobileLayer.setAttribute('aria-hidden', !isChecked);
    warningLayer.setAttribute('aria-hidden', !isChecked);
    limitsLayer.setAttribute('aria-hidden', !isChecked);
    mobileItem.setAttribute('aria-disabled', !isChecked);
    // save wifi toggled state
    ConfigManager.setOption({ isMobileChartVisible: isChecked });

    if (model) {
      drawBackgroundLayer(model);
      drawAxisLayer(model);
      drawLimits(model);
    }
  }

  // Expand the model with some computed values
  var today = Toolkit.toMidnight(new Date());
  var CHART_BG_RATIO = 0.87;
  function expandModel(base) {

    // Update today
    today = Toolkit.toMidnight(new Date());

    // Graphic settings
    base.originY = Math.floor(base.height * CHART_BG_RATIO);

    // Today value
    base.axis.X.today = today;

    // Normalize today
    Toolkit.toMidnight(base.axis.X.today);
    Toolkit.toMidnight(base.axis.X.lower);
    Toolkit.toMidnight(base.axis.X.upper);

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
    var limitEnabled = true; // XXX: model.limits.enabled;
    base.axis.Y.maxValue = Math.max(limitEnabled ? base.limits.value : 0,
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
    var wifiData = Formatting.roundData(model.data.wifi.total);
    var mobileData = Formatting.roundData(model.data.mobile.total);
    wifiOverview.textContent = Formatting.formatData(wifiData);
    mobileOverview.textContent = Formatting.formatData(mobileData);

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
    canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    ctx.save();

    // White bg
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, model.originY);

    // Horizontal lines every step
    var step = model.axis.Y.step;
    var limitY = model.axis.Y.get(model.limits.value);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = toDevicePixels(1);
    var displayLimit = model.limits.enabled && mobileToggle.checked;
    for (var y = model.originY - step; y > step; y -= step) {
      if (displayLimit && same(y, limitY, 0.1)) {
        continue;
      }
      var drawY = Math.floor(y) - 0.5;
      ctx.beginPath();
      ctx.moveTo(model.originX, drawY);
      ctx.lineTo(model.endX, drawY);
      ctx.stroke();
    }

    // Vertical lines every day
    var days = (model.axis.X.upper - model.axis.X.lower) / DAY;
    step = model.axis.X.len / days;
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = toDevicePixels(1);
    for (var x = model.originX; x <= model.endX; x += step) {
      var drawX = Math.floor(x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(drawX, model.originY);
      ctx.lineTo(drawX, 0);
      ctx.stroke();
      // Ensure draw the last vertical line
      if (((x + step) > model.endX) && (x !== model.endX)) {
        // the 0.5 offset is needed to avoid drawing a double line.
        drawX = model.endX - 0.5;
        ctx.beginPath();
        ctx.moveTo(drawX, model.originY);
        ctx.lineTo(drawX, 0);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function makeCSSFontString(fontSize, fontWeight) {
    return fontWeight + ' ' + fontSize + 'px sans-serif';
  }

  var todayLabel = {};
  var FONTSIZE = toDevicePixels(13);
  var FONTWEIGHT = '600';
  var FONTWEIGHT_AXIS = '400'; // normal font weight
  function drawTodayLayer(model) {
    var canvas = document.getElementById('today-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Compute the X offset
    var offsetX = model.axis.X.get(model.axis.X.today);

    // Configure Centered today text
    var marginTop = toDevicePixels(10);

    var todayTag = formatChartDate(model.axis.X.today);

    // Render the text
    ctx.font = makeCSSFontString(FONTSIZE, FONTWEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Update measues of today label
    var metrics = ctx.measureText(todayTag);
    todayLabel.x0 = offsetX - metrics.width / 2;
    todayLabel.x1 = offsetX + metrics.width / 2;
    if (todayLabel.x1 > model.endX) {
      ctx.textAlign = 'right';
    }

    ctx.fillStyle = 'black';
    ctx.fillText(todayTag, offsetX, model.originY + marginTop);
  }

  function formatChartDate(date) {
    return _('verbose-chart-date-format', {
      'monthday-number': date.getDate(),
      'em-month': _('month-' + date.getMonth() + '-short')
    });
  }

  function drawAxisLayer(model) {

    var canvas = document.getElementById('axis-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Start drawing Y axis
    var step = model.axis.Y.step;
    var dataStep = model.axis.Y.upper - model.axis.Y.maxValue;
    var marginRight = 4;
    var offsetX = model.originX - marginRight;
    ctx.font = makeCSSFontString(FONTSIZE, FONTWEIGHT_AXIS);
    ctx.textAlign = 'right';
    var displayLimit = mobileToggle.checked && model.limits.enabled;
    var lastUnit;
    for (var y = 0.5 + model.originY, value = 0;
         y > step; y -= step, value += dataStep) {

      // First X label for 0 is aligned with the bottom
      if (value === 0) {
        lastUnit = Formatting.smartRound(dataStep, 0)[1];
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#6a6a6a';
        ctx.fillText(Formatting.formatData([0, lastUnit]), offsetX, y - 2.5);
        continue;
      }

      // Rest of labels are aligned with the middle
      var rounded = Formatting.smartRound(value, -1);
      var v = rounded[0];
      var u = rounded[1];
      var label = v;
      if (lastUnit !== u) {
        label = Formatting.formatData([v, u]);
      }

      lastUnit = u;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = displayLimit &&
                      (value === model.limits.value) &&
                      model.limits.enabled ?
                      '#b50202' : '#6a6a6a';
      ctx.fillText(label, offsetX, y);
    }

    // Now the X axis
    ctx.fillStyle = '#6a6a6a';
    var marginTop = toDevicePixels(10);

    // Left tag
    var leftTag = formatChartDate(model.axis.X.lower);
    ctx.font = makeCSSFontString(FONTSIZE, FONTWEIGHT);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';

    var isBelowToday = todayLabel.x0 <=
                       model.originX + ctx.measureText(leftTag).width;
    if (!isBelowToday) {
      ctx.fillText(leftTag, model.originX, model.originY + marginTop);
    }

    // Right tag
    var rightTag = formatChartDate(model.axis.X.upper);
    ctx.textAlign = 'end';

    isBelowToday = todayLabel.x1 >=
                   model.endX - ctx.measureText(rightTag).width;
    if (!isBelowToday) {
      ctx.fillText(rightTag, model.endX, model.originY + marginTop);
    }
  }

  function drawLimits(model) {
    var set = model.limits.value;
    var color = '#b50202';

    var canvas = document.getElementById('limits-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    var displayLimit = mobileToggle.checked && model.limits.enabled;
    if (!displayLimit) {
      return;
    }

    ctx.save();

    var marginTop = 1;
    var offsetY = set ? model.axis.Y.get(model.limits.value) :
                        FONTSIZE + 2 * marginTop;

    ctx.font = makeCSSFontString(FONTSIZE, FONTWEIGHT);

    // The dashed limit line
    var lineLength = toDevicePixels(15);
    var gapLength = toDevicePixels(7);
    ctx.strokeStyle = color;
    ctx.lineWidth = toDevicePixels(1);
    ctx.beginPath();
    for (var x = model.originX, drawY = Math.floor(offsetY) - 0.5;
         x < model.endX; x += gapLength) {
      ctx.moveTo(x, drawY);
      ctx.lineTo(Math.min(x += lineLength, model.endX), drawY);
    }
    ctx.stroke();

    ctx.restore();
  }

  function drawWifiGraphic(model) {
    var samples = model.data.wifi.samples;
    if (!samples) {
      return;
    }

    var canvas = document.getElementById('wifi-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Style
    ctx.fillStyle = '#cbd936';
    ctx.strokeStyle = '#8b9052';
    ctx.lineWidth = toDevicePixels(2);
    ctx.lineJoin = 'round';
    ctx.moveTo(model.originX, model.originY);

    var today = Toolkit.toMidnight(new Date());
    // offset in milliseconds
    var offset = today.getTimezoneOffset() * 60 * 1000;

    var sum = 0; var x, y = model.originY;
    var lastX = model.originX, lastY = model.axis.Y.get(sum);
    for (var i = 0, len = samples.length; i < len; i++) {
      var sample = samples[i];
      var sampleLocalTime = sample.date.getTime() + offset;
      var sampleUTCDate = Toolkit.toMidnight(new Date(sampleLocalTime));

      var isToday = (today.getTime() === sampleUTCDate.getTime());
      var isTomorrow = (today.getTime() + DAY ===  sampleUTCDate.getTime());
      var thereIsATomorrowSample = (isToday && (i + 2 === len));
      // Depends on the hour of the day and the offset, it is possible the
      // networkStats API returns the current data mobile in the  tomorrow
      // sample, because on the UTC hour is another day.
      if (thereIsATomorrowSample) {
        // Join the value of the samples for today and tomorrow
        var tomorrowSample = samples[i+1];
        if (typeof sample.value === 'undefined') {
          sample.value = tomorrowSample.value;
        } else if (typeof tomorrowSample.value !== 'undefined') {
          sample.value += tomorrowSample.value;
        }

        if (i === 0) {
          lastX = model.axis.X.get(sample.date);
        }
        i++;
      }

      if (typeof sample.value === 'undefined') {
        lastX = x = model.axis.X.get(sample.date);
        ctx.moveTo(x, y);

      } else {
        if (i === 0) {
          lastX = model.axis.X.get(sample.date);
        }

        sum += sample.value;
        x = model.axis.X.get(sample.date);
        y = model.axis.Y.get(sum);

        clipAndDrawSegment(ctx, model, lastX, lastY, x, y);

        lastX = x;
        lastY = y;
      }

      var onlyExistTomorrowSample = (i===0 && isTomorrow);
      var isXInsideTheGraph = (x >= model.originX);
      if ((isToday || onlyExistTomorrowSample) && isXInsideTheGraph) {
        drawTodayMark(ctx, x, y, '#8b9052');
        return;
      }
    }
  }

  function drawTodayMark(ctx, x, y, color) {
    ctx.save();
    var radius = toDevicePixels(4);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // Check if the segment of the graph is inside chart area. If so, draw it
  function clipAndDrawSegment(ctx, model, x0, y0, x1, y1) {
    if (x0 >= model.originX && x1 <= model.endX) {
      var x0Fixed = Math.floor(x0) - 0.5;
      var x1Fixed = Math.floor(x1) + 0.5;

      // Fill
      ctx.globalCompositeOperation = 'destination-over';
      ctx.beginPath();
      ctx.lineTo(x1Fixed, y1);
      ctx.lineTo(x1Fixed, model.originY);
      ctx.lineTo(x0Fixed, model.originY);
      ctx.lineTo(x0Fixed, y0);
      ctx.moveTo(x1Fixed, y0);
      ctx.fill();

      // Stroke
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      // It's necessary add 1 to the X coordinate to make up for the offset
      // produced with the drawing of the previous line.
      ctx.moveTo(x0Fixed + 1, y0);
      ctx.lineTo(x1Fixed, y1);
      ctx.stroke();
    }
  }

  function drawMobileGraphic(model) {
    var samples = model.data.mobile.samples;
    if (!samples) {
      return;
    }

    var canvas = document.getElementById('mobile-layer');
    canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(147, 21, 98, 0.7)';
    ctx.strokeStyle = '#762d4a';
    ctx.lineWidth = toDevicePixels(2);
    ctx.lineJoin = 'round';

    var today = Toolkit.toMidnight(new Date());
    // offset in milliseconds
    var offset = today.getTimezoneOffset() * 60 * 1000;

    var sum = 0; var x, y = model.originY;
    var lastX = model.originX, lastY = model.axis.Y.get(sum);
    // Only dealing with the use cases of negative UTC offset because, due to
    // the database granularity, the returned samples are given in UTC days, and
    // we don't know what part of the traffic sample values correspond to the
    // current localtime day.  The query for the samples is generated on the
    // costcontrol module, and  the case into which the returned samples only
    // have one record with the data for the localtime day of yesterday is not
    // possible.

    for (var i = 0, len = samples.length; i < len; i++) {
      var sample = samples[i];
      var sampleLocalTime = sample.date.getTime() + offset;
      var sampleUTCDate = Toolkit.toMidnight(new Date(sampleLocalTime));

      var isToday = (today.getTime() === sampleUTCDate.getTime());
      var isTomorrow = (today.getTime() + DAY ===  sampleUTCDate.getTime());
      var thereIsATomorrowSample = (isToday && (i + 2 === len));
      // Depends on the hour of the day and the offset, it is possible the
      // networkStats API returns the current data mobile in the tomorrow
      // sample, because on the UTC hour is another day.
      if (thereIsATomorrowSample) {
        // Join the value of the samples for today and tomorrow
        var tomorrowSample = samples[i+1];
        if (typeof sample.value === 'undefined') {
          sample.value = tomorrowSample.value;
        } else if (typeof tomorrowSample.value !== 'undefined') {
          sample.value += tomorrowSample.value;
        }

        if (i === 0) {
          lastX = model.axis.X.get(sample.date);
        }
        i++;
      }

      if (typeof sample.value === 'undefined') {
        lastX = x = model.axis.X.get(sample.date);
        ctx.moveTo(x, y);

      } else {
        if (i === 0) {
          lastX = model.axis.X.get(sample.date);
        }

        sum += sample.value;
        x = model.axis.X.get(sample.date);
        y = model.axis.Y.get(sum);

        clipAndDrawSegment(ctx, model, lastX, lastY, x, y);

        lastX = x;
        lastY = y;
      }

      var onlyExistTomorrowSample = (i===0 && isTomorrow);
      var isXInsideTheGraph = (x >= model.originX);
      if ((isToday || onlyExistTomorrowSample) && isXInsideTheGraph) {
        drawTodayMark(ctx, x, y, '#762d4a');
        return;
      }
    }

    var pattern = ctx.createPattern(graphicPattern, 'repeat');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, model.originY);
  }

  function drawWarningOverlay(model) {
    var canvas = document.getElementById('warning-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    if (!model.limits.enabled || model.limits.value === null) {
      return;
    }

    // No problem here
    var mobileUsage = model.data.mobile.total;
    if (mobileUsage <= model.limits.warningValue) {
      return;
    }

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
    var limitValueExceeded = model.axis.Y.get(model.limits.value);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(
      model.originX, 0,
      model.axis.X.len + 0.5, limitValueExceeded
    );
  }

  return {
    initialize: setupTab,
    finalize: finalize
  };
}());

DataUsageTab.initialize();
