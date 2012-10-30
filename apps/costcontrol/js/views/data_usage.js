/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Utility functions
function getWindowTop(obj) {
  var top;
  top = obj.offsetTop;
  while (!!(obj = obj.offsetParent)) {
    top += obj.offsetTop;
  }
  return top;
}

function getWindowLeft(obj) {
  var left;
  left = obj.offsetLeft;
  while (!!(obj = obj.offsetParent)) {
    left += obj.offsetLeft;
  }
  return left;
}

// Data Usage is in charge of display detailed information about data
// consumption per application and interface.
var TAB_DATA_USAGE = 'datausage-tab';
viewManager.tabs[TAB_DATA_USAGE] = (function cc_setUpDataUsage() {

  var _model, _installedObservers = false;
  var _graphicArea, _graphicPattern;
  var _wifiLayer, _mobileLayer;
  var _wifiOverview, _mobileOverview;

  // Bind the activation of the tab to the proper filter
  function _configureUI() {
    _graphicArea = document.getElementById('graphic-area');
    _graphicPattern = document.getElementById('graphic-pattern');
    _wifiLayer = document.getElementById('wifi-layer');
    _mobileLayer = document.getElementById('mobile-layer');
    _wifiOverview = document.getElementById('wifiOverview');
    _mobileOverview = document.getElementById('mobileOverview');

    // Shows data usage tab when pressing the data usage filter
    var dataUsageTab = document.getElementById('datausage-tab-filter');
    dataUsageTab.addEventListener('click', function ccapp_onDataUsageTab() {
      viewManager.changeViewTo(TAB_DATA_USAGE);
    });

    // Toggle chart visibility
    var wifiToggle = document.getElementById('wifiCheck');
    _wifiLayer.setAttribute('aria-hidden', !wifiToggle.checked);
    wifiToggle.addEventListener('click', function ccapp_toggleWifiChart() {
      _wifiLayer.setAttribute('aria-hidden', !wifiToggle.checked);
    });

    var mobileToggle = document.getElementById('mobileCheck');
    _mobileLayer.setAttribute('aria-hidden', !mobileToggle.checked);
    mobileToggle.addEventListener('click', function ccapp_toggleMobileChart() {
      _mobileLayer.setAttribute('aria-hidden', !mobileToggle.checked);
    });
  }

  // Show the dialog for setting data limit (this reuses the )
  function _showSetDataLimit() {
    var settingsWindow = document.getElementById('settings-view').contentWindow;
    var dialog = settingsWindow.document.getElementById('data-limit-dialog');

    // Show dialog, settings and get focus
    settingsWindow.viewManager.changeViewTo(dialog.id);
    settingsVManager.changeViewTo(SETTINGS_VIEW);
    dialog.querySelector('input').focus();

    // Program the buttons of close / done to close current settings
    var doneButton = dialog.querySelector('.recommend');
    var closeButton = dialog.querySelector('.cancel');
    var returnToChart = function ccapp_returnToChart() {
      settingsVManager.closeCurrentView();
      closeButton.removeEventListener('click', returnToChart);
      doneButton.removeEventListener('click', returnToChart);
    }

    doneButton.addEventListener('click', returnToChart);
    closeButton.addEventListener('click', returnToChart);
  }

  // Configure clickable areas of the chart
  function _configureChartControls() {
    var controls = document.getElementById('limits-layer');
    var offsetX = getWindowLeft(controls);
    var offsetY = getWindowTop(controls);

    function checkContent(x, y, threshold) {
      threshold = threshold || 0;
      var context = controls.getContext('2d');
      var data = context.getImageData(x - offsetX, y - offsetY, 1, 1).data;
      return data[3] > threshold;
    }

    var element, elementX, elementY;
    controls.addEventListener('click',
      function ccapp_onCanvasClick(event) {
        element = event.target;
        if (!checkContent(event.clientX, event.clientY))
          return;

        if (pressing) {
          var enabled = Service.settings.option('data_limit');
          Service.settings.option('data_limit', !enabled);
        }
      }
    );

    var pressing, longPressTimeout;
    controls.addEventListener('mousedown',
      function ccapp_onCanvasMousedown(event) {
        if (!checkContent(event.clientX, event.clientY))
          return;

        pressing = true;
        longPressTimeout = setTimeout(function() {
          pressing = false;
          _showSetDataLimit();
        }, 500);
      }
    );

    controls.addEventListener('mouseup',
      function ccapp_onCanvasMouseup(event) {
        clearTimeout(longPressTimeout);
      }
    );
  }

  // Expand the model with some computed values
  function _expandModel(base) {

    // Graphic settings
    base.originY = Math.floor(base.height * 5 / 6);

    // Normalize today
    _toMidnight(base.axis.X.today);
    _toMidnight(base.axis.X.lower);
    _toMidnight(base.axis.X.upper);

    // X axis projection function to convert a value into a pixel value
    var xLowerBound = base.axis.X.lower.getTime();
    var xSize = base.axis.X.upper.getTime() - xLowerBound;
    base.axis.X.get = function cc_dataToXPx(value) {
      var projection = (value.getTime() - xLowerBound) / xSize;
      return projection * base.width;
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
    }
    base.axis.Y.step = base.axis.Y.get(base.axis.Y.maxValue);

    // Limits
    base.limits.warning = Service.getDataUsageWarning();
    base.limits.warningValue = base.limits.value * base.limits.warning;
  }

  // Set the date to 00:00:00.000
  function _toMidnight(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
  }

  // Setup the model
  function _updateCharts(evt) {

    // First time setup of the model
    if (!_model) {
      debug('First time setup for model');
      _model = {
        height: _graphicArea.clientHeight,
        width: _graphicArea.clientWidth,
        originX: 0,
        axis: {
          Y: {
            lower: 0,
            margin: 0.20
          }
        },
        limits: {
          enabled: Service.settings.option('data_limit'),
          value: Service.dataLimitInBytes
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
    }

    // Observers to keep the model synchronized
    // TODO: Take a deep though about the model and think about how
    // to set it completely async.
    if (!_installedObservers) {
      debug('Installing observers');

      // Relevant dates
      var today = new Date();
      var tomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24);
      _toMidnight(tomorrow);
      var yesterday = new Date(today.getTime() - 1000 * 60 * 60 * 24);
      _toMidnight(yesterday);

      // Data limit, the value or the unit has change
      Service.settings.observe('data_limit',
        function ccapp_onDataLimitChanged(value) {
          _model.limits.enabled = value;
          _drawLimits(_model);
          _drawWarningOverlay(_model);
        }
      );

      debug('Installing observers 1');
      // XXX: here is a trick. In settings, when unit is changed, the
      // option data_limit_value is "touched" so it suffices to observe
      // data_limit_value to be aware about both changes in value or unit
      Service.settings.observe('data_limit_value',
        function ccapp_onDataLimitValueChanged(value) {
          _model.limits.value = Service.dataLimitInBytes;
          _expandModel(_model);
          _updateUI();
        }
      );

      debug('Installing observers 2');
      // X axis
      Service.settings.observe('lastdatareset',
        function ccapp_onLastResetValueChanged(value) {
          _model.axis.X.lower = value ? new Date(value) :
                                        new Date(yesterday);
          _expandModel(_model);
          _updateUI();
        }
      );

      debug('Installing observers 3');
      Service.settings.observe('next_reset',
        function ccapp_onNextResetChanged(value) {
          _model.axis.X.upper = value ? new Date(value) :
                                        new Date(tomorrow);
          _expandModel(_model);
          _updateUI();
        }
      );

      _installedObservers = true;
      debug('Installing observers COMPLETE');
    }

    // Local update
    if (evt) {
      debug('Updating _model');
      var modelData = evt.detail;
      _model.axis.X = {
        lower: modelData.start,
        upper: modelData.end,
        today: modelData.today
      };
      _model.data.wifi.samples = modelData.wifi.samples;
      _model.data.wifi.total = modelData.wifi.total;
      _model.data.mobile.samples = modelData.mobile.samples;
      _model.data.mobile.total = modelData.mobile.total;

      _expandModel(_model);
    }

    debug('Rendering');
    _updateUI();
  }

  function _init() {
    var status = Service.getServiceStatus();
    if (!status.enabledFunctionalities.datausage) {
      debug('Data usage functionality disabled. ' +
            'Skippin Data Usage Tab set up.');
      return;
    }

    debug('Initializing Data Usage Tab');
    _configureUI();
    _configureChartControls();

    Service.setDataUsageCallbacks({onsuccess: _updateCharts});

    document.addEventListener('mozvisibilitychange',
      function ccapp_visibility(evt) {
        if (!document.mozHidden)
          Service.requestDataUsage();
      }
    );

    Service.requestDataUsage();
  }

  function _drawBackgroundLayer(model) {
    var canvas = document.getElementById('background-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // A linear gradient from transparent to opaque white
    var bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(255,255,255,0)');
    bgGradient.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, model.originY);

    // A line just after the end of the gradient
    var lineY = model.originY - 1.5;
    ctx.beginPath();
    ctx.strokeStyle = '#d5d5d5';
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.stroke();

    // Lines every step
    var step = model.axis.Y.step;
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    for (var y = model.originY - step; y > step; y -= step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function _drawAxisLayer(model) {

    var canvas = document.getElementById('axis-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Start drawing Y axis
    var step = model.axis.Y.step;
    var dataStep = model.axis.Y.upper - model.axis.Y.maxValue;
    var marginLeft = 4, marginBottom = 4;
    var fontsize = 12;
    ctx.font = '500 ' + fontsize + 'px Arial';
    ctx.fillStyle = '#6a6a6a';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'start';
    for (var y = model.originY, value = 0;
         y > 0; y -= step, value += dataStep) {
      ctx.fillText(padData(value).join(' '), marginLeft, y - marginBottom);
    }

    // Now the X axis
    if (Service.settings.option('tracking_period') === 'never')
      return;

    var marginTop = 10;
    var leftTag =
      model.axis.X.lower.toLocaleFormat('%b %d').toUpperCase();
    ctx.font = '600 ' + fontsize + 'px Arial';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';
    ctx.fillText(leftTag, marginLeft, model.originY + marginTop);

    var rightTag =
      model.axis.X.upper.toLocaleFormat('%b %d').toUpperCase();
    ctx.textAlign = 'end';
    ctx.fillText(rightTag, width - marginLeft, model.originY + marginTop);
  }

  function _drawTodayLayer(model) {
    var canvas = document.getElementById('today-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Compute the X offset
    var offsetX = model.axis.X.get(model.axis.X.today) + 0.5;

    // Draw the vertical line
    ctx.fillStyle = '#626262';
    ctx.fillRect(offsetX - 0.5, 0.5, 1, model.originY);
    ctx.fillStyle = 'white';
    ctx.fillRect(offsetX - 1, 0.5, 1, model.originY);

    ctx.beginPath();
    ctx.strokeStyle = 'white';
    ctx.moveTo(offsetX, 0.5);
    ctx.lineTo(offsetX + 6.5, 0.5);
    ctx.stroke();

    // The shadow as a gradient
    var shadowLength = 10;
    var shadow = ctx.createLinearGradient(
      offsetX + 0.5, 0,
      offsetX + 0.5 + shadowLength, 0
    );
    shadow.addColorStop(0, 'rgba(128, 128, 128, 0.3)');
    shadow.addColorStop(1, 'rgba(128, 128, 128, 0.0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(
      offsetX + 0.5, 1.5,
      shadowLength, model.originY - 3.5
    );

    // Configure Centered today text
    var fontsize = 12;
    var marginTop = 10;
    var tagTop = model.axis.X.today.toLocaleFormat('%b %d').toUpperCase();
    var tagBottom = _('today').toUpperCase();

    // The box around the text
    var widthTop = ctx.measureText(tagTop).width;
    var widthBottom = ctx.measureText(tagBottom).width;
    var maxWidth = widthTop.width > widthBottom ? widthTop : widthBottom;
    var marginSide = 10;
    var radiusTop = 3;
    var radiusBottom = 3;

    var topRight = {
      x: offsetX + (maxWidth / 2) + marginSide,
      y: model.originY + (marginTop / 2)
    };
    var bottomRight = {
      x: topRight.x,
      y: topRight.y + (fontsize * 2) + marginTop
    };
    var bottomLeft = {
      x: offsetX - (maxWidth / 2) - marginSide,
      y: bottomRight.y
    };
    var topLeft = {
      x: bottomLeft.x,
      y: topRight.y
    };

    ctx.beginPath();
    ctx.strokeStyle = '#626262';
    ctx.fillStyle = 'white';

    ctx.moveTo(offsetX, model.originY);
    ctx.lineTo(topRight.x - radiusTop, topRight.y);
    ctx.arcTo(
      topRight.x, topRight.y,
      topRight.x, topRight.y + radiusTop,
      radiusTop
    );

    ctx.lineTo(bottomRight.x, bottomRight.y - radiusBottom);
    ctx.arcTo(
      bottomRight.x, bottomRight.y,
      bottomRight.x - radiusBottom, bottomRight.y,
      radiusBottom
    );

    ctx.lineTo(bottomLeft.x + radiusBottom, bottomLeft.y);
    ctx.arcTo(
      bottomLeft.x, bottomLeft.y,
      bottomLeft.x, bottomLeft.y - radiusBottom,
      radiusBottom
    );

    ctx.lineTo(topLeft.x, topLeft.y + radiusTop);

    // Here a trick to simplify this:
    // it is the same as the beginnign but to the other X direction
    ctx.moveTo(offsetX, model.originY);
    ctx.lineTo(topLeft.x + radiusTop, topLeft.y);
    ctx.arcTo(
      topLeft.x, topLeft.y,
      topLeft.x, topLeft.y + radiusTop,
      radiusTop
    );

    ctx.fill();
    ctx.stroke();

    // Render the text
    ctx.font = '600 ' + fontsize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'black';
    ctx.fillText(tagTop, offsetX, model.originY + marginTop);
    ctx.fillText(tagBottom, offsetX, model.originY + marginTop + fontsize);


    // Finally, draw the two circles
    var radius = 3;
    ctx.strokeStyle = '#626262';
    ctx.fillStyle = '#cbd936';
    ctx.lineWidth = 1;
    var todayWifi = model.data.wifi.total;
    ctx.beginPath();
    ctx.arc(offsetX, model.axis.Y.get(todayWifi), radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgb(157, 54, 117)';
    ctx.lineWidth = 1;
    var todayMobile = model.data.mobile.total;
    ctx.beginPath();
    ctx.arc(offsetX, model.axis.Y.get(todayMobile), radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  function _drawLimits(model) {
    var enabled = model.limits.enabled;
    var set = model.limits.value;
    var color = 'rgba(255, 0, 0, ' + (enabled ? '1.0' : '0.3') + ')';

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


    // The left marker
    var semiHeight = fontsize / 2 + marginTop;
    var tag = model.limits.value ? roundData(model.limits.value).join(' ') :
                                   _('not-set').toUpperCase();

    var tagWidth = ctx.measureText(tag).width;
    var topLeft = {
      x: 0,
      y: offsetY - semiHeight - marginTop
    };
    var topRight = {
      x: marginLeft + tagWidth + marginLeft,
      y: topLeft.y
    };
    var arrowVertex = {
      x: topRight.x + marginLeft,
      y: offsetY
    };
    var bottomRight = {
      x: topRight.x,
      y: offsetY + semiHeight + marginTop
    };
    var bottomLeft = {
      x: topLeft.x,
      y: bottomRight.y
    };
    var leftVertex = arrowVertex.x;

    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(arrowVertex.x, arrowVertex.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(topLeft.x, topLeft.y);

    // The shadow
    ctx.shadowColor = '#888';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fill();

    // And the text
    ctx.shadowColor = 'transparent';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'start';
    ctx.fillStyle = 'white';
    ctx.fillText(tag, marginLeft, offsetY + marginTop);

    // The right mark
    tag = _('limit').toUpperCase();
    tagWidth = ctx.measureText(tag).width;
    topLeft = {
      x: width - marginLeft - tagWidth - marginLeft,
      y: offsetY - semiHeight - marginTop
    };
    arrowVertex = {
      x: topLeft.x - marginLeft,
      y: offsetY
    };
    topRight = {
      x: width,
      y: topLeft.y
    };
    bottomRight = {
      x: topRight.x,
      y: offsetY + semiHeight + marginTop
    };
    bottomLeft = {
      x: topLeft.x,
      y: bottomRight.y
    };
    var rightVertex = arrowVertex.x;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(arrowVertex.x, arrowVertex.y);
    ctx.lineTo(topLeft.x, topLeft.y);

    // The shadow
    ctx.shadowColor = '#888';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fill();

    // And the text
    ctx.shadowColor = 'transparent';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'end';
    ctx.fillStyle = 'white';
    ctx.fillText(tag, width - marginLeft, offsetY + marginTop);

    // The limit line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(leftVertex, offsetY + 0.5);
    ctx.lineTo(rightVertex, offsetY + 0.5);
    ctx.stroke();
  }

  function _drawWifiGraphic(model) {
    var canvas = document.getElementById('wifi-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(203, 217, 54, 0.7)';
    var samples = model.data.wifi.samples;
    ctx.beginPath();
    ctx.moveTo(model.originX, model.originY - 2.5);
    var sum = 0; var x, y;
    var lastX = model.originX, lastY = model.axis.Y.get(sum);
    for (var i = 0, len = samples.length; i < len; i++) {
      var sample = samples[i];
      if (sample.value == undefined) {
        lastX = x = model.axis.X.get(sample.date);
        ctx.moveTo(x, y);
        continue;
      }

      x = model.axis.X.get(sample.date);
      y = model.axis.Y.get(sum += sample.value);

      ctx.lineTo(x, y);
      ctx.lineTo(x, model.originY - 2.5);
      ctx.lineTo(lastX, model.originY - 2.5);
      ctx.lineTo(lastX, lastY);
      ctx.moveTo(x, y);
      lastX = x;
      lastY = y;
    }
    // Set max accumulation for today indicator
    ctx.fill();

    var pattern = ctx.createPattern(_graphicPattern, 'repeat');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, model.originY);
  }

  function _drawMobileGraphic(model) {
    var canvas = document.getElementById('mobile-layer');
    var height = canvas.height = model.height;
    var width = canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.fillStyle = 'rgba(147, 21, 98, 0.65)';
    ctx.strokeStyle = 'transparent';
    var samples = model.data.mobile.samples;
    var sum = 0; var x, y;
    var lastX = model.originX, lastY = model.axis.Y.get(sum);
    for (var i = 0, len = samples.length; i < len; i++) {
      var sample = samples[i];
      if (sample.value == undefined) {
        lastX = x = model.axis.X.get(sample.date);
        ctx.moveTo(x, y);
        continue;
      }

      x = model.axis.X.get(sample.date);
      y = model.axis.Y.get(sum += sample.value);

      ctx.lineTo(x, y);
      ctx.lineTo(x, model.originY - 2.5);
      ctx.lineTo(lastX, model.originY - 2.5);
      ctx.lineTo(lastX, lastY);
      ctx.moveTo(x, y);
      lastX = x;
      lastY = y;
    }
    // Set max accumulation for today indicator
    ctx.shadowColor = 'rgba(64, 64, 64, 0.7)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = -1;
    ctx.shadowOffsetY = -1;
    ctx.stroke();
    ctx.fill();

    var pattern = ctx.createPattern(_graphicPattern, 'repeat');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, model.originY);
  }

  function _drawWarningOverlay(model) {
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
      var limitValue = Math.round(model.axis.Y.get(model.limits.value));
      var warningValue =
        Math.round(model.axis.Y.get(model.limits.warningValue));
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 112, 0, 0.5)';
      ctx.fillRect(
        model.originX, limitValue,
        width, warningValue - limitValue
      );

      // And the dashed line
      var lineLength = 5;
      var gapLength = 2;
      ctx.strokeStyle = 'rgba(255, 112, 0, 1.0)';
      ctx.beginPath();
      for (var x = width, y = warningValue - 0.5; x > 0; x -= gapLength) {
        ctx.moveTo(x, y);
        ctx.lineTo(x -= lineLength, y);
      }
      ctx.stroke();

      return;
    }

    // Limit exceeded
    var limitValue = model.axis.Y.get(model.limits.value);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(
      model.originX, 0,
      width, limitValue
    );
  }

  function _updateUI() {
    // Update overview
    _wifiOverview.textContent = padData(_model.data.wifi.total).join(' ');
    _mobileOverview.textContent = padData(_model.data.mobile.total).join(' ');

    // Render the charts
    _drawBackgroundLayer(_model);
    _drawAxisLayer(_model);
    _drawWifiGraphic(_model);
    _drawMobileGraphic(_model);
    _drawWarningOverlay(_model);
    _drawTodayLayer(_model);
    _drawLimits(_model);
  }

  // Updates the UI to match the localization
  function _localize() {
    _drawAxisLayer(_model);
    _drawTodayLayer(_model);
    _drawLimits(_model);
  }

  return {
    init: _init,
    localize: _localize,
    updateUI: _updateUI
  };
}());

// Add to views as well
Views[TAB_DATA_USAGE] = viewManager.tabs[TAB_DATA_USAGE];
