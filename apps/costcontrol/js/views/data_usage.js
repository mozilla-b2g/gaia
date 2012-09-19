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

  var _options;
  var _graphicArea, _graphicPattern;

  // Attach event listeners for manual updates
  function _init() {
    debug('Initializing Data Usage Tab');
    _graphicArea = document.getElementById('graphic-area');
    _graphicPattern = document.getElementById('graphic-pattern');

    var dataUsageTab = document.getElementById('datausage-tab-filter');
    dataUsageTab.addEventListener('click', function ccapp_onDataUsageTab() {
      viewManager.changeViewTo(TAB_DATA_USAGE);
    });

    var controls = document.getElementById('limits-layer');

    // TODO: Remove this, or refactor to not use an inner scope
    (function() {
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
            debug('limitClicked');
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
            debug('setLimit');
          }, 500);
        }
      );

      controls.addEventListener('mouseup',
        function ccapp_onCanvasMouseup(event) {
          clearTimeout(longPressTimeout);
        }
      );

    }());

    function getFakeValues(startDate, howMany, size, gapsize) {
      var fakeData = [];
      var oneDay = 1000 * 60 * 60 * 24;
      var lastValue = 0, gapmode = 0, nomoregaps = false;
      for (var i = 0, currentDate = startDate.getTime();
           i < howMany;
           i++, currentDate += oneDay) {

        if (!nomoregaps && i > howMany / 2) {
          gapmode = gapsize;
          nomoregaps = true;
        }

        var sampleIncrement = Math.floor(Math.random() * size);
        var sampleDate = new Date();
        sampleDate.setTime(currentDate);
        if (gapmode) {
          fakeData.push({
            date: sampleDate
          });
          gapmode--;

        } else {
          fakeData.push({
            value: sampleIncrement,
            date: sampleDate
          });
        }
      }
      return fakeData;
    }

    _options = {
      height: _graphicArea.clientHeight,
      width: _graphicArea.clientWidth,
      get originY() {
        delete this.originY;
        return (this.originY = Math.floor(this.height * 5 / 6));
      },
      originX: 0,
      axis: {
        X: {
          lower: new Date(2012, 0, 1),
          upper: new Date(2012, 0, 31),
          today: new Date(2012, 0, 21),
          get: function cc_dataToXPx(value) {
            var projection = (value.getTime() - this.lower.getTime()) /
                              (this.upper.getTime() - this.lower.getTime());
            return projection * _options.width;
          }
        },
        Y: {
          lower: 0,
          margin: 0.20,
          maxValue: 2356000000,
          get range() {
            delete this.range;
            return (this.range = this.upper - this.lower);
          },
          get upper() {
            delete this.upper;
            return (this.upper = (1 + this.margin) * this.maxValue);
          },
          get step() {
            delete this.step;
            return (this.step = this.get(this.maxValue));
          },
          get: function cc_dataToYPx(value) {
            var projection = (value - this.lower) / (this.upper - this.lower);
            return _options.originY * (1 - projection);
          }
        }
      },
      limits: {
        value: 990000000,
        warning: 0.80,
        get warningValue() {
          delete this.warningValue;
          return (this.warningValue = this.value * this.warning);
        }
      },
      data: {
        wifi: {
          enabled: true,
          samples: getFakeValues(new Date(2012, 0, 1), 21, 150000000, 5)
        },
        mobile: {
          enabled: true,
          samples: getFakeValues(new Date(2012, 0, 1), 21, 150000000 * 0.75, 5)
        }
      }
    };


    _updateUI();
  }

  function _drawBackgroundLayer(options) {
    var canvas = document.getElementById('background-layer');
    var height = canvas.height = options.height;
    var width = canvas.width = options.width;
    var ctx = canvas.getContext('2d');

    // A linear gradient from transparent to opaque white
    var bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(255,255,255,0)');
    bgGradient.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, options.originY);

    // A line just after the end of the gradient
    var lineY = options.originY - 1.5;
    ctx.beginPath();
    ctx.strokeStyle = '#d5d5d5';
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.stroke();

    // Lines every step
    var step = options.axis.Y.step;
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    for (var y = options.originY - step; y > step; y -= step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function _pad(value) {
    if (value === 0)
      return '0MB';

    value = value / 1000000;

    if (value < 1000) {
      var str = (10 * Math.ceil(value / 10)) + 'M';
      switch (str.length) {
        case 2:
          return '00' + str;
        case 3:
          return '0' + str;
        default:
          return str;
      }
    }

    return (value / 1000).toFixed(1) + 'G';
  }

  function _drawAxisLayer(options) {

    var canvas = document.getElementById('axis-layer');
    var height = canvas.height = options.height;
    var width = canvas.width = options.width;
    var ctx = canvas.getContext('2d');

    // Start drawing Y axis
    var step = options.axis.Y.step;
    var dataStep = options.axis.Y.upper - options.axis.Y.maxValue;
    var marginLeft = 4, marginBottom = 4;
    var fontsize = 12;
    ctx.font = '500 ' + fontsize + 'px Arial';
    ctx.fillStyle = '#6a6a6a';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'start';
    for (var y = options.originY, value = 0;
         y > 0; y -= step, value += dataStep) {
      ctx.fillText(_pad(value), marginLeft, y - marginBottom);
    }

    // Now the X axis
    var marginTop = 10;
    var leftTag =
      options.axis.X.lower.toLocaleFormat('%b %d').toUpperCase();
    ctx.font = '600 ' + fontsize + 'px Arial';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';
    ctx.fillText(leftTag, marginLeft, options.originY + marginTop);

    var rightTag =
      options.axis.X.upper.toLocaleFormat('%b %d').toUpperCase();
    ctx.textAlign = 'end';
    ctx.fillText(rightTag, width - marginLeft, options.originY + marginTop);
  }

  function _drawTodayLayer(options) {
    var canvas = document.getElementById('today-layer');
    var height = canvas.height = options.height;
    var width = canvas.width = options.width;
    var ctx = canvas.getContext('2d');

    // Compute the X offset
    var offsetX = options.axis.X.get(options.axis.X.today);

    // Draw the vertical line
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    ctx.moveTo(offsetX - 0.5, options.originY);
    ctx.lineTo(offsetX - 0.5, 0.5);
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
      shadowLength, options.originY - 3.5
    );

    // Centered today text
    var fontsize = 12;
    var marginTop = 10;
    var tagTop = options.axis.X.today.toLocaleFormat('%b %d').toUpperCase();
    var tagBottom = _('today').toUpperCase();
    ctx.font = '600 ' + fontsize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'black';
    ctx.fillText(tagTop, offsetX, options.originY + marginTop);
    ctx.fillText(tagBottom, offsetX, options.originY + marginTop + fontsize);

    // The box around the text
    var widthTop = ctx.measureText(tagTop).width;
    var widthBottom = ctx.measureText(tagBottom).width;
    var maxWidth = widthTop.width > widthBottom ? widthTop : widthBottom;
    var marginSide = 10;
    var radiusTop = 3;
    var radiusBottom = 3;

    var topRight = {
      x: offsetX + (maxWidth / 2) + marginSide,
      y: options.originY + (marginTop / 2)
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

    ctx.strokeStyle = 'white';
    ctx.beginPath();

    ctx.moveTo(offsetX, options.originY);
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
    ctx.moveTo(offsetX, options.originY);
    ctx.lineTo(topLeft.x + radiusTop, topLeft.y);
    ctx.arcTo(
      topLeft.x, topLeft.y,
      topLeft.x, topLeft.y + radiusTop,
      radiusTop
    );

    ctx.stroke();

    // Finally, draw the two circles
    var radius = 3;
    ctx.strokeStyle = 'white';
    ctx.fillStyle = '#cbd936';
    ctx.lineWidth = 3;
    var todayWifi = options.data.wifi.sumToday;
    ctx.beginPath();
    ctx.arc(offsetX, options.axis.Y.get(todayWifi), radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();

    ctx.fillStyle = 'rgb(157, 54, 117)';
    ctx.lineWidth = 3;
    var todayMobile = options.data.mobile.sumToday;
    ctx.beginPath();
    ctx.arc(offsetX, options.axis.Y.get(todayMobile), radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();
  }

  function _drawLimits(options) {
    var canvas = document.getElementById('limits-layer');
    var height = canvas.height = options.height;
    var width = canvas.width = options.width;
    var ctx = canvas.getContext('2d');
    ctx.font = '600 ' + 12 + 'px Arial';

    // The limit line
    var marginLeft = 4;
    var marginTop = 1;
    var offsetY = Math.floor(options.axis.Y.get(options.limits.value));
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.moveTo(0, offsetY + 0.5);
    ctx.lineTo(width, offsetY + 0.5);
    ctx.stroke();

    // The left marker
    var fontsize = 12;
    var tag = _pad(options.limits.value);
    var tagWidth = ctx.measureText(tag).width;
    var semiHeight = fontsize / 2 + marginTop;

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

    ctx.beginPath();
    ctx.fillStyle = 'red';
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

    // Now the warning
    offsetY = Math.floor(options.axis.Y.get(options.limits.warningValue));

    // The right mark
    tag = Math.round(options.limits.warning * 100) + '%';
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

    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'red';
    ctx.shadowColor = 'transparent';
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(arrowVertex.x, arrowVertex.y);
    ctx.lineTo(topLeft.x, topLeft.y);
    ctx.stroke();
    ctx.fill();

    // The text
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'start';
    ctx.fillStyle = 'red';
    ctx.fillText(tag, arrowVertex.x + 2 * marginLeft, offsetY + marginTop);

    // And the dashed line
    var lineLength = 5;
    var gapLength = 2;
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    for (var x = arrowVertex.x, y = offsetY + 0.5; x > 0; x -= gapLength) {
      ctx.moveTo(x, y);
      ctx.lineTo(x -= lineLength, y);
    }
    ctx.stroke();
  }

  function _drawWifiGraphic(options) {
    var canvas = document.getElementById('wifi-layer');
    var height = canvas.height = options.height;
    var width = canvas.width = options.width;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(203, 217, 54, 0.7)';
    var samples = options.data.wifi.samples;
    ctx.beginPath();
    ctx.moveTo(options.originX, options.originY - 2.5);
    var sum = 0; var x, y;
    var lastX = options.originX, lastY = options.axis.Y.get(sum);
    for (var i = 0, len = samples.length; i < len; i++) {
      var sample = samples[i];
      if (sample.value == undefined) {
        lastX = x = options.axis.X.get(sample.date);
        ctx.moveTo(x, y);
        continue;
      }

      x = options.axis.X.get(sample.date);
      y = options.axis.Y.get(sum += sample.value);

      ctx.lineTo(x, y);
      ctx.lineTo(x, options.originY - 2.5);
      ctx.lineTo(lastX, options.originY - 2.5);
      ctx.lineTo(lastX, lastY);
      ctx.moveTo(x, y);
      lastX = x;
      lastY = y;
    }
    // Set max accumulation for today indicator
    options.data.wifi.sumToday = sum;
    ctx.fill();

    var pattern = ctx.createPattern(_graphicPattern, 'repeat');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, options.originY);
  }

  function _drawMobileGraphic(options) {
    var canvas = document.getElementById('mobile-layer');
    var height = canvas.height = options.height;
    var width = canvas.width = options.width;
    var ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.fillStyle = 'rgba(147, 21, 98, 0.65)';
    ctx.strokeStyle = 'transparent';
    var samples = options.data.mobile.samples;
    var sum = 0; var x, y;
    var lastX = options.originX, lastY = options.axis.Y.get(sum);
    for (var i = 0, len = samples.length; i < len; i++) {
      var sample = samples[i];
      if (sample.value == undefined) {
        lastX = x = options.axis.X.get(sample.date);
        ctx.moveTo(x, y);
        continue;
      }

      x = options.axis.X.get(sample.date);
      y = options.axis.Y.get(sum += sample.value);

      ctx.lineTo(x, y);
      ctx.lineTo(x, options.originY - 2.5);
      ctx.lineTo(lastX, options.originY - 2.5);
      ctx.lineTo(lastX, lastY);
      ctx.moveTo(x, y);
      lastX = x;
      lastY = y;
    }
    // Set max accumulation for today indicator
    options.data.mobile.sumToday = sum;
    ctx.shadowColor = 'rgba(64, 64, 64, 0.7)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = -1;
    ctx.shadowOffsetY = -1;
    ctx.stroke();
    ctx.fill();

    var pattern = ctx.createPattern(_graphicPattern, 'repeat');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, options.originY);
  }

  function _drawWarningOverlay(options) {
    var canvas = document.getElementById('warning-layer');
    var height = canvas.height = options.height;
    var width = canvas.width = options.width;
    var ctx = canvas.getContext('2d');

    // No problem here
    var mobileUsage = options.data.mobile.sumToday;
    if (mobileUsage <= options.limits.warningValue)
      return;

    // Warning mode
    if (mobileUsage <= options.limits.value) {
      var limitValue = Math.round(options.axis.Y.get(options.limits.value));
      var warningValue =
        Math.round(options.axis.Y.get(options.limits.warningValue));
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 112, 0, 0.5)';
      ctx.fillRect(
        options.originX, limitValue,
        width, warningValue - limitValue
      );
      return;
    }

    // Limit exceeded
    var limitValue = options.axis.Y.get(options.limits.value);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.fillRect(
      options.originX, 0,
      width, limitValue
    );
  }

  function _updateUI() {
    _drawBackgroundLayer(_options);
    _drawAxisLayer(_options);
    _drawWifiGraphic(_options);
    _drawMobileGraphic(_options);
    _drawWarningOverlay(_options);
    _drawTodayLayer(_options);
    _drawLimits(_options);
  }

  // Updates the UI to match the localization
  function _localize() {
    _drawAxisLayer(_options);
    _drawLimits(_options);
  }

  return {
    init: _init,
    localize: _localize,
    updateUI: _updateUI
  };
}());

// Add to views as well
Views[TAB_DATA_USAGE] = viewManager.tabs[TAB_DATA_USAGE];
