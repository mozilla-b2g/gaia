/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Data Usage is in charge of display detailed information about data
// consumption per application and interface.
var TAB_DATA_USAGE = 'datausage-tab';
appVManager.tabs[TAB_DATA_USAGE] = (function cc_setUpDataUsage() {

  // for testing, get data for last 30 min instead of last month
  var precision = 1000 * 60;
  //var precision = 1000 * 60 * 60 * 24;

  var end = new Date(
    Math.floor(new Date().getTime() / precision) * precision
  );

  var start = new Date(
    Math.floor(new Date().getTime() / precision) * precision
  );

  //start.setMonth(start.getMonth() - 1);
  //var days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  start.setMinutes(start.getMinutes() - 30);
  var days = Math.floor((end - start) / precision);

  //var _enabledNetworkTypes = navigator.mozNetworkStats.types;
  var _enabledNetworkTypes = {
    wifi: true,
    mobile: true
  };

  // Debug data
  var dataWifi = {
    rxBytes: [26340, 25136, 26685, 26384, 24923, 26720, 27056, 27327, 26218,
              27444, 27000, 45809, 45208, 27696, 25266, 28372, 27563, 31374,
              28574, 25670, 27358, 27466, 27318, 22169, 39645, 24830, 27227,
              26340, 24830, 0, 3759],

    txBytes: [2, 72, 72, 72, 66, 72, 72, 72, 72, 72, 72, 48, 44620, 72, 72, 72,
              72, 72, 72, 72, 72, 72, 72, 6, 3400, 72, 72, 72, 72, 0, 30],

    connectionType: 'wifi',
    startDate: start,
    endDate: end
  };

  var dataMobile = {
    rxBytes: [37597, 41674, 25387, 26596, 26392, 24818, 26396, 27003, 26658,
              24898, 26564, 26328, 26615, 24860, 26340, 26592, 25952, 25537,
              26340, 0, 0, 72959, 46493, 26508, 26844, 25042, 26664, 27255,
              38846, 39829, 27908],

    txBytes: [30, 3392, 72, 72, 72, 72, 72, 72, 72, 72, 44980, 72, 72, 72, 72,
              72, 72, 72, 72, 0, 0, 18, 3394, 72, 72, 72, 72, 72, 36, 3400, 72],

    connectionType: 'mobile',
    startDate: start,
    endDate: end
  };

  // Graphs colors
  var colorMobile = {
    stroke: '#046559',
    fill: '#009d89',
    axis: 'transparent',
    grid: 'transparent'
  };

  var colorWifi = {
    stroke: '#9ca81e',
    fill: '#cbd936',
    axis: 'transparent',
    grid: 'transparent'
  };

  // Attach event listeners for manual updates
  function _init() {
    debug('Initializing Data Usage Tab');
    var dataUsageTab = document.getElementById('datausage-tab-filter');
    dataUsageTab.addEventListener('click', function ccapp_onDataUsageTab() {
      appVManager.changeViewTo(TAB_DATA_USAGE);
    });

    _updateUI();
  }

  function _paint(canvas, networkStats, color) {
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    var x_space = width / days;

    var ctx = canvas.getContext('2d');
    var rx = networkStats.rxBytes;
    var tx = networkStats.txBytes;

    debug('ConnectionType: ' + networkStats.connectionType);
    debug('StartDate: ' + networkStats.startDate);
    debug('EndDate: ' + networkStats.endDate);

    if (rx && tx) {
      debug('Data rx: ' + rx);
      debug('Data tx: ' + tx);

      // Check if data is available from start/end date, else insert '0'
      if (networkStats.startDate > start) {
        var offset =
          Math.floor((networkStats.startDate - start) / precision) - 1;

        debug('add ' + offset);
        for (var i = 0; i < offset; i++) {
          rx.unshift(0);
          tx.unshift(0);
        }
      }

      if (networkStats.endDate < end) {
        var offset =
          Math.floor((end - networkStats.startDate) / precision) - 1;
        debug('add ' + offset);
        for (var i = 0; i < offset; i++) {
          rx.push(0);
          tx.push(0);
        }
      }

      // Normalize data
      var sum = 0;
      for (var i in rx)
        sum += rx[i] + tx[i];

      var scale_factor = height / sum;

      // Draw rx data
      var x = 1;
      var y = height - ((rx[0] + tx[0]) * scale_factor);

      ctx.strokeStyle = color.stroke;
      ctx.fillStyle = color.fill;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (var i = 1; i < days - 1; i++) {
        x += x_space;
        y -= (rx[i] + tx[i]) * scale_factor;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineTo(x, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // Draw tx data
      var x = 1;
      var y = height - (tx[0] * scale_factor);

      ctx.strokeStyle = color.stroke;
      ctx.fillStyle = color.fill;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (var i = 1; i < days - 1; i++) {
        x += x_space;
        y -= tx[i] * scale_factor;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineTo(x, height);
      ctx.lineTo(0, height);
      ctx.fill();
    }

    // Draw axis
    ctx.strokeStyle = color.axis;
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(1, height);
    ctx.lineTo(width, height);
    ctx.stroke();

    // Draw subX
    var x = 1;

    ctx.strokeStyle = color.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < days - 1; i++) {
      x += x_space;
      ctx.moveTo(x, height - 1);
      ctx.lineTo(x, 0);
    }
    ctx.stroke();
  }

  function _overviewUI(networkStats) {
    var rx = networkStats.rxBytes;
    var tx = networkStats.txBytes;
    var type = networkStats.connectionType;

    //Sum bytes
    var rxBytes = 0;
    for (var i in rx) {
      rxBytes += rx[i];
    }

    var txBytes = 0;
    for (var i in tx) {
      txBytes += tx[i];
    }

    //Default MB operations
    var totalMB = (rxBytes + txBytes) / 1024;
    totalMB = totalMB.toFixed();
    var value = totalMB;
    var unit = 'MB';

    //Convert MB to GB
    if (totalMB >= 1024) {
     value = totalMB / 1024;
     value = value.toFixed(1);
     unit = 'GB';
    }

    //Apply to UI
    document.getElementById(type + 'Overview').innerHTML = value + unit;

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
    ctx.fillRect(0, 0, width, options.originY );

    // A line just after the end of the gradient
    var lineY = options.originY - 1.5;
    ctx.beginPath();
    ctx.strokeStyle = '#d5d5d5';
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.stroke();

    // Lines every step
    var step =  options.axis.Y.step;
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    for (var y = options.originY - step; y > 0; y -= step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function _drawAxisLayer(options) {
    function pad(value) {
      if (value === 0)
        return '0MB';

      if (value < 1000) {
        var str = (10 * Math.ceil(value/10)) + 'M';
        switch(str.length) {
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
      ctx.fillText(pad(value), marginLeft, y - marginBottom);
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
    var lower = options.axis.X.lower.getTime();
    var upper = options.axis.X.upper.getTime() - lower;
    var today = options.axis.X.today.getTime() - lower;
    var offsetX = Math.round(today / upper * width);

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
      offsetX + 0.5 + shadowLength, options.originY - 3.5
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
    var radiusBottom = 5;

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
    // it is the same as the beginnign but to the other direction
    ctx.moveTo(offsetX, options.originY);
    ctx.lineTo(topLeft.x + radiusTop, topLeft.y);
    ctx.arcTo(
      topLeft.x, topLeft.y,
      topLeft.x, topLeft.y + radiusTop,
      radiusTop
    );

    ctx.stroke();
  }

  function _updateUI() {
    var graphicArea = document.getElementById('graphic-area');

    var options = {
      height: graphicArea.clientHeight,
      width: graphicArea.clientWidth,
      get originY() {
        delete this.originY;
        return (this.originY = Math.floor(this.height * 5/6));
      },
      originX: 0,
      axis: {
        X: {
          lower: new Date(2012, 0, 1),
          upper: new Date(2012, 0, 31),
          today: new Date(2012, 0, 21)
        },
        Y: {
          lower: 0,
          margin: 0.20,
          maxValue: 2356,
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
            return options.originY * (1 - value / this.upper);
          }
        }
      }
    };

    _drawBackgroundLayer(options);
    _drawAxisLayer(options);
    _drawTodayLayer(options);
  }

/*  function _updateUI() {

    for (var type in _enabledNetworkTypes) if (_enabledNetworkTypes[type]) {

      var color = (type === 'wifi') ? colorWifi : colorMobile;

      if (DEBUGGING) {
        var dataDebug = (type === 'wifi') ? dataWifi : dataMobile;
        var canvas = document
          .getElementById(dataDebug.connectionType + 'GraphCanvas');

        _paint(canvas, dataDebug, color);
        _overviewUI(dataDebug);

      } else {
        if (!('mozNetworkStats' in navigator))
          return;

        var req = navigator.mozNetworkStats.getNetworkStats({
          startDate: start,
          endDate: end,
          connectionType: type
        });

        req.onsuccess = function(event) {
          var data = event.target.result;
          var canvas = document
            .getElementById(data.connectionType + 'GraphCanvas');

          _paint(canvas, data, color);
          _overviewUI(data);
        };

        req.onerror = function() {
          debug('Error requesting network stats: ' + this.error.name);
        };
      }
    }
  }*/

  return {
    init: _init,
    updateUI: _updateUI
  };
}());

// Add to views as well
Views[TAB_DATA_USAGE] = appVManager.tabs[TAB_DATA_USAGE];
