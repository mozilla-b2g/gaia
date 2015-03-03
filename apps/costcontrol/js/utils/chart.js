/* global _, debug, Toolkit, Formatting, Common */
/* exported ChartUtils */
'use strict';

var ChartUtils = (function() {
  var DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;
  var DAY = 24 * 60 * 60 * 1000;
  var NEVER_PERIOD = 30 * DAY;
  var NEVER_ANCHOR = 21 * DAY;
  var CHART_BG_RATIO = 0.87;
  var FONT_SIZE = toDevicePixels(13);
  var FONT_WEIGHT = '600';
  var FONT_WEIGHT_AXIS = '400';
  var WIFI_CHART_STROKE = '#8b9052';
  var WIFI_CHART_FILL = '#cbd936';
  var MOBILE_CHART_STROKE = '#762d4a';
  var MOBILE_CHART_FILL = 'rgba(147, 21, 98, 0.7)';

  function toDevicePixels(value) {
    return value * DEVICE_PIXEL_RATIO;
  }

  function makeCSSFontString(fontSize, fontWeight) {
    return fontWeight + ' ' + fontSize + 'px sans-serif';
  }

  function formatChartDate(date) {
    return _('verbose-chart-date-format', {
      'monthday-number': date.getDate(),
      'em-month': _('month-' + date.getMonth() + '-short')
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
    var today = new Date();
    var lowerDate = Toolkit.toMidnight(new Date());
    var nextReset = settings.nextReset || lowerDate;
    var trackingPeriod = settings.trackingPeriod;

    if (trackingPeriod === 'weekly') {
      lowerDate.setTime(nextReset.getTime() - (7 * DAY));
    } else if (trackingPeriod === 'monthly') {
      var monthDate = settings.resetTime;
      var isFirstDayOfPeriod = today.getDate() == monthDate;
      var isAfterFirstDayOfPeriod = today.getDate() > monthDate;
      if (isAfterFirstDayOfPeriod) {
        // lowerDate is in the current month
        lowerDate.setDate(monthDate);
      } else if (!isFirstDayOfPeriod) {
        // lowerDate is on the previous month
        var LAST_DAY_OF_PREVIOUS_MONTH = 0;
        var newMonth = today.getMonth() - 1;
        var newYear = today.getFullYear();
        if (newMonth < 0) {
          newMonth = 11;
          newYear--;
        }

        lowerDate = Toolkit.toMidnight(new Date(newYear, newMonth, monthDate));
        // The day of the month of lowerDate is different to settings.resetTime
        // value when the resetTime day doesn't exists this month, (eg. 30th
        // February), on this case, the lowerDate must be the last day of the
        // previous month
        if (lowerDate.getDate() != monthDate) {
          lowerDate = Toolkit.toMidnight(new Date());
          lowerDate.setDate(LAST_DAY_OF_PREVIOUS_MONTH);
        }
      }
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

  // Expand the model with some computed values
  function expandModel(base) {

    // Update today
    var today = Toolkit.toMidnight(new Date());

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
    base.limits.warning = Common.DATA_USAGE_WARNING;
    base.limits.warningValue = base.limits.value * Common.DATA_USAGE_WARNING;
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

  function drawTodayMark(ctx, x, y, color) {
    ctx.save();
    var radius = toDevicePixels(4);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  function drawBackgroundLayer(canvas, model, showMobile) {
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
    var displayLimit = model.limits.enabled && showMobile;
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

    // Return true if a and b not differ more than threshold
    function same(a, b, threshold) {
      threshold = threshold || 0;
      return Math.abs(a - b) <= threshold;
    }
  }

  function drawTodayLayer(canvas, model) {
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Compute the X offset
    var offsetX = model.axis.X.get(model.axis.X.today);

    // Configure Centered today text
    var marginTop = toDevicePixels(10);

    var todayTag = formatChartDate(model.axis.X.today);

    // Render the text
    ctx.font = makeCSSFontString(FONT_SIZE, FONT_WEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Update measues of today label
    var metrics = ctx.measureText(todayTag);
    model.todayLabel.x0 = offsetX - metrics.width / 2;
    model.todayLabel.x1 = offsetX + metrics.width / 2;
    if (model.todayLabel.x1 > model.endX) {
      ctx.textAlign = 'right';
    }

    ctx.fillStyle = 'black';
    ctx.fillText(todayTag, offsetX, model.originY + marginTop);

    setAccessibilityAttributes(canvas, 'today-layer', { today: todayTag });
  }

  function drawAxisLayer(canvas, model, showMobile) {
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Start drawing Y axis
    var step = model.axis.Y.step;
    var dataStep = model.axis.Y.upper - model.axis.Y.maxValue;
    var marginRight = 4;
    var offsetX = model.originX - marginRight;
    ctx.font = makeCSSFontString(FONT_SIZE, FONT_WEIGHT_AXIS);
    ctx.textAlign = 'right';
    var displayLimit = showMobile && model.limits.enabled;
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
    ctx.font = makeCSSFontString(FONT_SIZE, FONT_WEIGHT);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    var isBelowToday = model.todayLabel.x0 <=
                       model.originX + ctx.measureText(leftTag).width;
    if (!isBelowToday) {
      ctx.fillText(leftTag, model.originX, model.originY + marginTop);
    }

    // Right tag
    var rightTag = formatChartDate(model.axis.X.upper);
    ctx.textAlign = 'right';

    isBelowToday = model.todayLabel.x1 >=
                   model.endX - ctx.measureText(rightTag).width;
    if (!isBelowToday) {
      ctx.fillText(rightTag, model.endX, model.originY + marginTop);
    }

    setAccessibilityAttributes(canvas, 'axis-layer',
                               { from: leftTag, to: rightTag });
  }

  function setAccessibilityAttributes(element, identifier, data) {
    if (identifier) {
      element.setAttribute('data-l10n-id', identifier);
      if (data) {
        element.setAttribute('data-l10n-args', JSON.stringify(data));
      }
    } else {
      element.removeAttribute('data-l10n-id');
      element.removeAttribute('data-l10n-args');
      element.removeAttribute('aria-label');
    }
  }

  function drawLimits(canvas, model, showMobile) {
    var set = model.limits.value;
    var color = '#b50202';

    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    var displayLimit = showMobile && model.limits.enabled;
    if (!displayLimit) {
      return;
    }

    ctx.save();

    var marginTop = 1;
    var offsetY = set ? model.axis.Y.get(model.limits.value) :
                        FONT_SIZE + 2 * marginTop;

    ctx.font = makeCSSFontString(FONT_SIZE, FONT_WEIGHT);

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

    setAccessibilityAttributes(canvas,
      'limit-layer-' + model.limits.dataLimitUnit,
      { value: model.limits.dataLimitValue });
  }

  function drawDataLayer(canvas, model, sampleType, style) {
    var samples = (model.data[sampleType] || {}).samples;
    if (!samples) {
      return;
    }

    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    // Style
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = toDevicePixels(2);
    ctx.lineJoin = 'round';
    ctx.moveTo(model.originX, model.originY);

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
        drawTodayMark(ctx, x, y, style.stroke);
        return;
      }
    }

    if (!style.pattern) {
      return;
    }

    var pattern = ctx.createPattern(style.pattern, 'repeat');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, model.width, model.originY);
  }

  function drawWarningLayer(canvas, model) {
    canvas.height = model.height;
    canvas.width = model.width;
    var ctx = canvas.getContext('2d');

    if (!model.limits.enabled || model.limits.value === null) {
      setAccessibilityAttributes(canvas);
      return;
    }

    // No problem here
    var mobileUsage = model.data.mobile.total;
    var mobileUsageDifference = mobileUsage - model.limits.value;
    if (mobileUsage <= model.limits.warningValue) {
      setAccessibilityAttributes(canvas);
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

      setAccessibilityAttributes(canvas, 'warning-layer', {
        value: Formatting.formatData(Formatting.roundData(
          -mobileUsageDifference))
      });

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
    setAccessibilityAttributes(canvas, 'limit-exceeded-layer', {
      value: Formatting.formatData(Formatting.roundData(mobileUsageDifference))
    });
  }

  return {
    // Constants
    WIFI_CHART_STROKE: WIFI_CHART_STROKE,
    WIFI_CHART_FILL: WIFI_CHART_FILL,
    MOBILE_CHART_STROKE: MOBILE_CHART_STROKE,
    MOBILE_CHART_FILL: MOBILE_CHART_FILL,

    // Functions
    toDevicePixels: toDevicePixels,
    makeCSSFontString: makeCSSFontString,
    formatChartDate: formatChartDate,
    getLimitInBytes: getLimitInBytes,
    calculateUpperDate: calculateUpperDate,
    calculateLowerDate: calculateLowerDate,
    expandModel: expandModel,
    clipAndDrawSegment: clipAndDrawSegment,
    drawTodayMark: drawTodayMark,
    drawBackgroundLayer: drawBackgroundLayer,
    drawTodayLayer: drawTodayLayer,
    drawAxisLayer: drawAxisLayer,
    drawLimits: drawLimits,
    drawDataLayer: drawDataLayer,
    drawWarningLayer: drawWarningLayer
  };
}());
