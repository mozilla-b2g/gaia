/* global _, ConfigManager, CostControl, debug, Toolkit, Formatting,
          SimManager, Common */
/* jshint -W120 */

/*
 * The data usage tab is in charge of usage charts of mobile and wi-fi networks.
 *
 * It has several canvas areas layered one above the others.
 */
'use strict';
var DataUsageTab = (function() {

  const DAY = 24 * 60 * 60 * 1000;
  const NEVER_PERIOD = 30 * DAY;
  const NEVER_ANCHOR = 21 * DAY;

  const DEVICE_RATIO = window.devicePixelRatio || 1;
  const REM_RATIO = 10;

  const BAR_BLUE = '#00caf2';
  const BAR_YELLOW = '#ff9500';
  const BAR_RED = '#b90000';

  var mobileLayer, limitsLayer;
  var costcontrol, initialized, model;

  function DataUsageModel() {
    var graphicArea = document.getElementById('graphic-area');
    this.height = toDevicePixels(graphicArea.clientHeight);
    this.width = toDevicePixels(graphicArea.clientWidth);
    this.originX = Math.floor(remToPixels(5.4));
    this.originY = Math.floor(remToPixels(12.6));
    this.endX = Math.floor(this.width - remToPixels(6));
    this.totalBarHeight = toDevicePixels(remToPixels(1.2));

    this.axis = {
      Y: {
        lower: 0,
        margin: 0.20
      },
      X: {}
    };

    this.limits = {};

    this.data = {
      wifi: {
        enabled: true,
        total: 0
      },
      mobile: {
        enabled: true,
        total: 0
      }
    };
  }

  DataUsageModel.prototype = {
    init: function(callback) {
      var self = this;

      function finishInit() {
        if (callback) {
          callback(self);
        }
      }

      function loadApps() {
        if (!Common.allAppsLoaded) {
          Common.loadApps(finishInit, finishInit);
        } else {
          finishInit();
        }
      }

      function loadInterfaces() {
        if (!Common.allNetworkInterfacesLoaded) {
          var initInterfaces = self.initInterfaces.bind(self, loadApps);
          Common.loadNetworkInterfaces(initInterfaces, initInterfaces);
        } else {
          self.initInterfaces(loadApps);
        }
      }

      loadInterfaces();
    },

    initInterfaces: function(callback) {
      var self = this;
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        var iccId = dataSimIcc.iccId;
        ConfigManager.requestSettings(iccId, function _onSettings(settings) {
          self.axis.X.lower = calculateLowerDate(settings);
          self.axis.X.upper = calculateUpperDate(settings);
          self.limits.enabled = settings.dataLimit;
          self.limits.value = getLimitInBytes(settings);

          if (callback) {
            callback();
          }
        });
      });
    },

    enableDataLimit: function(enabled) {
      this.limits.enabled = enabled;
    },

    setDataLimit: function(limit) {
      this.limits.value = limit;
      this.update();
    },

    setXRange: function(lower, upper) {
      this.axis.X.lower = lower;
      this.axis.X.upper = upper;
      this.update();
    },

    updateData: function(data) {
      this.data.wifi.samples = data.wifi.samples;
      this.data.wifi.total = data.wifi.total;
      this.data.mobile.total = data.mobile.total;
      this.data.mobile.apps = data.mobile.apps;

      var samplesByDate = {};
      var today = Toolkit.toMidnight(new Date());
      // offset in milliseconds
      var offset = today.getTimezoneOffset() * 60 * 1000;
      Object.keys(this.data.mobile.apps).forEach(function(manifestUrl) {
        var samples = this.data.mobile.apps[manifestUrl].samples;
        samples.forEach(function(sample) {
          var sampleLocalTime = sample.date.getTime() + offset;
          var sampleUTCDate = Toolkit.toMidnight(new Date(sampleLocalTime));

          var aggregateSample = samplesByDate[sampleUTCDate.getTime()];
          if (!aggregateSample) {
            aggregateSample = samplesByDate[sampleUTCDate.getTime()] = {
              value: 0,
              date: sample.date
            };
          }

          aggregateSample.value += sample.value;
        });

        this.data.mobile.samples = Object.keys(samplesByDate).map(
          function(date) {
            return samplesByDate[date];
          });
        this.data.mobile.samples.sort(function(a, b) {
          return a.date.getTime() - b.date.getTime();
        });

      }, this);
    },

    updateSettings: function(settings) {
      this.limits.enabled = settings.dataLimit;
      this.limits.value = getLimitInBytes(settings);
      this.axis.X.upper = calculateUpperDate(settings);
      this.axis.X.lower = calculateLowerDate(settings);
    },

    update: function() {
      // Update today
      var today = Toolkit.toMidnight(new Date());

      // Graphic settings
      //this.originY = Math.floor(this.height * CHART_BG_RATIO);

      // Today value
      this.axis.X.today = today;

      // Normalize today
      Toolkit.toMidnight(this.axis.X.today);
      Toolkit.toMidnight(this.axis.X.lower);
      Toolkit.toMidnight(this.axis.X.upper);

      // X axis projection function to convert a value into a pixel value
      var xLowerBound = this.axis.X.lower.getTime();
      var xSize = this.axis.X.upper.getTime() - xLowerBound;
      var realWidth = this.endX - this.originX;
      this.axis.X.len = realWidth;
      var self = this;
      this.axis.X.get = function cc_dataToXPx(value) {
        var projection = (value.getTime() - xLowerBound) / xSize;
        return projection * realWidth + self.originX;
      };

      // Y max value
      var limitEnabled = true; // XXX: model.limits.enabled;
      this.axis.Y.maxValue = Math.max(limitEnabled ? this.limits.value : 0,
                                      this.data.mobile.total,
                                      this.data.wifi.total);

      // Y axis projection function and automatic values
      this.axis.Y.range = this.axis.Y.upper - this.axis.Y.lower;
      this.axis.Y.upper = (1 + this.axis.Y.margin) * this.axis.Y.maxValue;
      var yLowerBound = this.axis.Y.lower;
      var ySize = this.axis.Y.upper - yLowerBound;
      this.axis.Y.get = function cc_dataToYPx(value) {
        var projection = (value - yLowerBound) / ySize;
        return self.originY * (1 - projection);
      };
      this.axis.Y.step = this.axis.Y.get(this.axis.Y.maxValue);

      // Limits
      this.limits.warning = costcontrol.getDataUsageWarning();
      this.limits.warningValue = this.limits.value * this.limits.warning;
    }
  };

  function toDevicePixels(origin) {
     return origin * DEVICE_RATIO;
  }

  function remToPixels(origin) {
    return REM_RATIO * origin * DEVICE_RATIO;
  }

  function setupTab() {
    if (initialized) {
      return;
    }

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

      // HTML entities
      mobileLayer = document.getElementById('mobile-layer');
      limitsLayer = document.getElementById('limits-layer');

      window.addEventListener('localized', localize);

      // Update and chart visibility
      document.addEventListener('visibilitychange', updateWhenVisible);

      resetButtonState();

      // Setup the model
      model = new DataUsageModel();
      model.init(function() {
        initialized = true;
        requestDataUsage();
      });
    });
  }

  function localize() {
    if (initialized) {
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

        var isWifiChartVisible = settings.isWifiChartVisible;
        if (typeof isWifiChartVisible === 'undefined') {
          isWifiChartVisible = false;
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

        var manifestURLs = Common.allApps.map(function(app) {
          return app.manifestURL;
        });

        var requestObj = { type: 'datausage', apps: manifestURLs };
        costcontrol.request(requestObj, updateCharts);
      });
    });
  }

  function updateCharts(result) {
    if (result.status === 'success') {
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          model.updateData(result.data);
          model.updateSettings(settings);
          model.update();

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
    model.enableDataLimit(value);
    drawBackgroundLayer(model);
    drawAxisLayer(model);
    drawLimits(model);
  }

  function setDataLimit(value, old, key, settings) {
    model.setDataLimit(getLimitInBytes(settings));
    updateUI();
  }

  function updateDataUsage(value) {
    requestDataUsage();
  }

  function changeNextReset(value, old, key, settings) {
    model.setXRange(calculateLowerDate(settings),
                    calculateUpperDate(settings));
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

  function getAppManifest(app) {
    return app.manifest || app.updateManifest;
  }

  function getAppName(app) {
    var manifest = getAppManifest(app);
    var userLang = document.documentElement.lang;
    var locales = manifest.locales;
    var localized = locales && locales[userLang] && locales[userLang].name;

    return localized || manifest.name;
  }

  function getAppIcon(app) {
    var manifest = getAppManifest(app);
    var icons = manifest.icons;
    var defaultImage = '../style/images/app/icons/default.png';

    if (!icons || !Object.keys(icons).length) {
      return defaultImage;
    }

    // The preferred size is 30 by the default. If we use HDPI device, we may
    // use the image larger than 30 * 1.5 = 45 pixels.
    var preferredIconSize = 30 * (window.devicePixelRatio || 1);
    var preferredSize = Number.MAX_VALUE;
    var max = 0;

    for (var size in icons) {
      size = parseInt(size, 10);
      if (size > max) {
        max = size;
      }

      if (size >= preferredIconSize && size < preferredSize) {
        preferredSize = size;
      }
    }
    // If there is an icon matching the preferred size, we return the result,
    // if there isn't, we will return the maximum available size.
    if (preferredSize === Number.MAX_VALUE) {
      preferredSize = max;
    }

    var url = icons[preferredSize];

    if (url) {
      return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
    } else {
      return defaultImage;
    }
  }

  // Return true if a and b not differ more than threshold
  function same(a, b, threshold) {
    threshold = threshold || 0;
    return Math.abs(a - b) <= threshold;
  }

  // USER INTERFACE

  // Expand the model with some computed values
  var today = Toolkit.toMidnight(new Date());

  function updateUI() {
    // Render the charts
    drawBackgroundLayer(model);
    drawAxisLayer(model);
    drawMobileGraphic(model);
    drawLimits(model);
    drawTotalBar(model);
    drawApps(model);
  }

  function drawBackgroundLayer(model) {
    var canvas = document.getElementById('background-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    ctx.save();

    // Horizontal lines every step
    var limitY = model.axis.Y.get(model.limits.value);
    var step = (model.originY - limitY) / 2;
    ctx.strokeStyle = '#5f5f5f';
    ctx.lineWidth = toDevicePixels(1);

    var displayLimit = model.limits.enabled;
    for (var y = model.originY - step; y > step; y -= step) {
      if (displayLimit && same(y, limitY, 0.1)) {
        continue;
      }
      var drawY = Math.floor(y) - 0.5;
      ctx.beginPath();
      var gapLength = toDevicePixels(2);
      var lineLength = toDevicePixels(2);
      for (var x = model.originX; x < model.endX; x += gapLength) {
        ctx.moveTo(x, drawY);
        ctx.lineTo(Math.min(x += lineLength, model.endX), drawY);
      }
      ctx.stroke();
    }

    ctx.moveTo(model.originX, model.originY);
    ctx.lineTo(model.endX, model.originY);
    ctx.stroke();

    ctx.restore();
  }

  function makeCSSFontString(fontSize, fontWeight) {
    return fontWeight + ' ' + fontSize + 'rem sans-serif';
  }

  var todayLabel = {};
  var FONTSIZE = '1.8';
  var FONTWEIGHT = '500';
  var FONTWEIGHT_AXIS = '400'; // normal font weight

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
    var marginRight = 4;
    var offsetX = model.originX - marginRight;
    ctx.font = makeCSSFontString(FONTSIZE, FONTWEIGHT);
    ctx.textAlign = 'right';

    var displayLimit = model.limits.enabled;

    var rounded = Formatting.smartRound(model.limits.value, -1);
    var v = rounded[0];
    var u = rounded[1];
    var label = Formatting.formatData([v, u]);
    var marginTop = 1;
    var offsetY = displayLimit ? model.axis.Y.get(model.limits.value) :
                                 FONTSIZE + 2 * marginTop;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = displayLimit &&
                    model.limits.enabled ?
                    '#b90000' : '#6a6a6a';
    ctx.fillText(label, offsetX, offsetY);

    // Now the X axis
    ctx.fillStyle = '#6a6a6a';
    marginTop = toDevicePixels(10);

    // Left tag
    var leftTag = formatChartDate(model.axis.X.lower);
    ctx.font = makeCSSFontString(FONTSIZE, FONTWEIGHT_AXIS);
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
    var color = '#b90000';

    var canvas = document.getElementById('limits-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    var displayLimit = model.limits.enabled;
    if (!displayLimit) {
      return;
    }

    ctx.save();

    var marginTop = 1;
    var offsetY = set ? model.axis.Y.get(model.limits.value) :
                        FONTSIZE + 2 * marginTop;

    ctx.font = makeCSSFontString(FONTSIZE, FONTWEIGHT);

    // The dashed limit line
    var lineLength = toDevicePixels(2);
    var gapLength = toDevicePixels(2);
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

  function drawBar(ctx, model, x, y, amount) {
    var spacing = 2;

    var today = Toolkit.toMidnight(new Date());
    var daysInMonth = new Date(today.getYear(), today.getMonth(), 0).getDate();

    var barWidth = Math.floor((model.endX - model.originX) /
                              (daysInMonth * spacing));

    // account for the height of the x axis marker
    var barHeight = model.originY - y;
    var diff = (model.limits.value - amount) / model.limits.value;

    ctx.fillStyle = BAR_BLUE;
    if (diff > 0 && diff <= 0.1) {
      ctx.fillStyle = BAR_YELLOW;
    } else if (amount > model.limits.value) {
      ctx.fillStyle = BAR_RED;
    }

    ctx.fillRect(x, y, barWidth, barHeight);
  }

  function drawMobileGraphic(model) {
    var samples = model.data.mobile.samples;
    if (!samples) {
      return;
    }

    var canvas = document.getElementById('mobile-layer');
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    ctx.save();

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

        drawBar(ctx, model, x, y, sum);
        lastX = x;
        lastY = y;
      }

      if (isToday) {
        return;
      }
    }

    ctx.restore();
  }

  function drawTotalBar(model) {
    var canvas = document.getElementById('app-usage-total-bar');
    canvas.width = toDevicePixels(canvas.clientWidth);
    canvas.height = toDevicePixels(canvas.clientHeight);
    var ctx = canvas.getContext('2d');

    var offsetX = remToPixels(0.9);

    ctx.fillStyle = '#5f5f5f';
    ctx.fillRect(offsetX, 0, canvas.width - (offsetX * 2),
                 model.totalBarHeight);

    var mobileTotal = model.data.mobile.total;
    var warnValue = model.limits.value * 0.9;

    var useYellow = mobileTotal >= warnValue;
    var useRed = mobileTotal >= model.limits.value;

    var barMax = Math.max(mobileTotal, model.limits.value);
    var blueWidth = (Math.min(mobileTotal, warnValue) / barMax) * canvas.width;
    ctx.fillStyle = BAR_BLUE;
    ctx.fillRect(offsetX, 0, blueWidth, model.totalBarHeight);

    var leftLabelStyle = '#000000';
    if (useYellow) {
      var yellowWidth =
        ((Math.min(mobileTotal, model.limits.value) - warnValue) / barMax) *
        canvas.width;

      ctx.fillStyle = BAR_YELLOW;
      ctx.fillRect(blueWidth, 0, yellowWidth, model.totalBarHeight);

      if (useRed) {
        var redWidth = ((mobileTotal - model.limits.value) / barMax) *
                       canvas.width;

        ctx.fillStyle = BAR_RED;
        ctx.fillRect(blueWidth + yellowWidth, 0, redWidth,
                     model.totalBarHeight);

        leftLabelStyle = BAR_RED;
      }
    }

    ctx.font = makeCSSFontString('2.0', '500');
    ctx.fillStyle = leftLabelStyle;

    var label = Formatting.formatData(Formatting.smartRound(mobileTotal, -1));
    ctx.fillText(label, 0, model.totalBarHeight + remToPixels(1.5));

    label = Formatting.formatData(
      Formatting.smartRound(model.limits.value, -1));

    var measure = ctx.measureText(label);
    ctx.fillStyle = '#000000';
    ctx.fillText(label, canvas.width - measure.width,
                 model.totalBarHeight + remToPixels(1.5));
  }

  function drawApps(model) {
    var appList = document.getElementById('app-usage-list');
    appList.innerHTML = '';

    var apps = model.data.mobile.apps;
    var manifests = Object.keys(apps);
    var noData = document.getElementById('app-usage-no-data');
    if (manifests.length === 0) {
      noData.style.display = 'inline';
    } else {
      noData.style.display = 'none';
    }

    manifests.sort(function(a, b) {
      return apps[b].total - apps[a].total;
    });

    var fragment = document.createDocumentFragment();
    manifests.forEach(function(manifestURL) {
      var app = Common.allApps.find(function(app) {
        return app.manifestURL === manifestURL;
      });

      var appData = apps[manifestURL];

      var appElement = document.createElement('li');
      appElement.className = 'app-item';

      var imgElement = document.createElement('div');
      imgElement.className = 'app-image';
      imgElement.style.backgroundImage = 'url(' + getAppIcon(app) + ')';
      appElement.appendChild(imgElement);

      var appInfoElement = document.createElement('div');
      appInfoElement.className = 'app-info';
      appElement.appendChild(appInfoElement);

      var nameElement = document.createElement('div');
      nameElement.className = 'app-info-row app-name';
      nameElement.textContent = getAppName(app);
      appInfoElement.appendChild(nameElement);

      var barElement = document.createElement('div');
      barElement.className = 'app-info-row app-usage-bar';
      appInfoElement.appendChild(barElement);

      var usedBarElement = document.createElement('div');
      usedBarElement.className = 'app-usage-bar-used';

      var total = model.data.mobile.total;
      if (model.limits.enabled && model.limits.value !== null) {
        total = Math.max(total, model.limits.value);
      }

      var usedPercent = (appData.total / total) * 100;
      usedBarElement.style.width = usedPercent + '%';
      barElement.appendChild(usedBarElement);

      var usageElement = document.createElement('div');
      usageElement.className = 'app-info-row app-usage-total';
      usageElement.textContent = '' + Formatting.formatData(
        Formatting.roundData(appData.total));

      appInfoElement.appendChild(usageElement);

      fragment.appendChild(appElement);
    });

    appList.appendChild(fragment);
  }

  return {
    initialize: setupTab,
    finalize: finalize
  };
}());

DataUsageTab.initialize();
