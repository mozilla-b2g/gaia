// Compass application for B2G
// Contributed by José Manuel Cantera (jmcf@tid.es)

(function() {
  var canvas,
      ctx,
      config = {},
      currentRotation = 0.0;

  // Constants for compass drawing parameters
  var CIRCLE_MARGIN = 10,
      CIRCLE_LINE_WIDTH = 2,
      CENTER_LINE_WIDTH = NUMBERS_LINE_WIDTH = 1,
      CENTER_DISTANCE_STAR = 8,
      // 15 degrees
      RADIALS_INTERVAL = 15,
      // In radians
      RADIALS_INTERVAL_RAD = (Math.PI / 12.0),
      RADIALS_MARKER_LENGHT = 7,
      FONT_CARDINALS = 'bold 12px MozTT',
      LABEL_POSITION_X = 4,
      LABEL_POSITION_Y = 20;

  function init() {
    canvas = document.getElementsByTagName('canvas')[0];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');

    calculateParams();
  }

  function calculateParams() {
    config.centerx = canvas.width / 2;
    config.centery = canvas.height / 2;
    config.radius = config.centerx - CIRCLE_MARGIN;
  }

  function paint() {
    paintCircle();
    paintCenter();
    paintRadials();
  }

  function paintCircle() {
    var centerx = config.centerx;
    var centery = config.centery;
    var radius = config.radius;

    ctx.lineWidth = CIRCLE_LINE_WIDTH;
    ctx.beginPath();

    // The circumference (from 0 radians to 2PI radians)
    ctx.arc(centerx, centery, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function paintCenter() {
    var centerx = config.centerx;
    var centery = config.centery;
    var radius = config.radius;

    ctx.save();

    ctx.lineWidth = CENTER_LINE_WIDTH;

    ctx.translate(centerx, centery);
    ctx.rotate(currentRotation);

    ctx.beginPath();
    ctx.moveTo(0, 0 - radius / 2);
    ctx.lineTo(0, 0 + radius / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0 - radius / 2, 0);
    ctx.lineTo(0 + radius / 2, 0);
    ctx.stroke();

    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.rotate(Math.PI / 2.0);

      ctx.moveTo(radius / 2, 0);
      ctx.lineTo(CENTER_DISTANCE_STAR, -CENTER_DISTANCE_STAR);
      ctx.lineTo(0, 0);
      ctx.lineTo(CENTER_DISTANCE_STAR, CENTER_DISTANCE_STAR);

      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  function paintRadials() {
    var radius = config.radius;
    var centerx = config.centerx;
    var centery = config.centery;

    var cardinals = {
      '90' : 'E',
      '180' : 'S',
      '270' : 'W',
      '360' : 'N'
    };

    ctx.save();

    ctx.translate(centerx, centery);
    ctx.rotate(currentRotation);

    var numToPaint = 360 / RADIALS_INTERVAL;
    var next = RADIALS_INTERVAL;

    for (var i = 0; i < numToPaint; i++) {
      ctx.beginPath();

      ctx.rotate(RADIALS_INTERVAL_RAD);
      ctx.moveTo(0, -(radius - RADIALS_MARKER_LENGHT));
      ctx.lineTo(0, - radius);

      ctx.lineWidth = CIRCLE_LINE_WIDTH;
      ctx.stroke();

      ctx.lineWidth = NUMBERS_LINE_WIDTH;

      var label;
      var cardinal = false;
      // Every 90 degrees the cardinals are painted
      if (next % 90 != 0) {
        label = next.toString();
      }
      else {
          label = cardinals[next.toString()];
          cardinal = true;
      }

      // Label (number or cardinal) are only showed every two markers)
      if ((i + 1) % 2 == 0) {
        ctx.save();

        if (cardinal) {
          ctx.font = FONT_CARDINALS;
        }
        ctx.strokeText(label, -LABEL_POSITION_X, -(radius - LABEL_POSITION_Y));

        ctx.restore();
      }
      next += RADIALS_INTERVAL;
    }

    ctx.restore();
  }

  function invalidate() {
    canvas.width = canvas.width;
  }

  function orientationDataChanged(e) {
    currentRotation = - ((Math.PI * e.alpha) / 180.0);

    invalidate();
    paint();
  }

  // Everything starts
  init();
  paint();
  window.addEventListener('deviceorientation', orientationDataChanged, true);

})();
