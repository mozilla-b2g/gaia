'use strict';

// XXX this test is affected by a canvas bug 919364 which shows incorrect result
// To use this test, you may need to use old gecko version like g18

// UTILS
var util = {
  // Use this function to get correct click position on canvas
  relMouseCoords: function(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    var eventX = evt.clientX - rect.left;
    var eventY = evt.clientY - rect.top;
    return {x: eventX, y: eventY};
  },

  clearScreen: function(ctx) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  },

  drawRectFromCoord: function(ctx, x1, y1, x2, y2) {
    ctx.translate(0.5, 0.5);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.translate(-0.5, -0.5);
  },

  // Fill rect without overlapping border,
  fillRectFromCoord: function(ctx, x1, y1, x2, y2) {
    ctx.fillRect(x1 + 1, y1 + 1, (x2 - x1) - 1, (y2 - y1) - 1);
  },

  drawCircle: function(ctx, x, y, radius, width, color) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.translate(0.5, 0.5);
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.translate(-0.5, -0.5);
    ctx.closePath();
    ctx.stroke();
  },

  distance_sqr: function(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
  },

  // Return the index less or equal to num
  binary_search: function(arr, num) {
    var begin = 0;
    var end = arr.length - 1;
    while (begin < end) {
      var pivot = Math.round((begin + end) / 2);
      if (num < arr[pivot]) {
        end = pivot - 1;
      }
      else if (num > arr[pivot]) {
        begin = pivot + 1;
      }
      else {
        return pivot;
      }
    }
    if (num < arr[begin]) {
      return begin - 1;
    }
    return begin;
  }
};

// TEST 1
// Draw 4 circles on the corners and 1 circle in the center
var test1 = function(canvas) {
  var ctx = canvas.getContext('2d');
  var circle_radius = Math.min(canvas.width, canvas.height) * 0.1;
  var circles_coord = [[circle_radius, circle_radius],
                       [circle_radius, canvas.height - circle_radius],
                       [canvas.width - circle_radius, circle_radius],
                       [canvas.width - circle_radius, canvas.height - circle_radius],
                       [canvas.width / 2, canvas.height / 2]];
  var lineWidth = 2;
  var lineColor = 'red';
  var lineColorClicked = 'lime';
  var is_clicked = [];

  (function init() {
    util.clearScreen(ctx);

    // Draw not-clicked circle
    for (var i = 0; i < circles_coord.length; i++) {
      util.drawCircle(ctx, circles_coord[i][0], circles_coord[i][1],
                      circle_radius, lineWidth, lineColor);
      is_clicked[i] = false;
    }
  })();

  // Touch test, change circle color if touch point is in the circle.
  // Test ends if all circles are touched
  this.test = function(x, y) {
    for (var i = 0; i < circles_coord.length; i++) {
      if (!is_clicked[i] &&
         util.distance_sqr(x, y, circles_coord[i][0], circles_coord[i][1]) <
                         circle_radius * circle_radius) {
        // Clear red circle by covering a bigger white circle on it
        util.drawCircle(ctx, circles_coord[i][0], circles_coord[i][1],
                        circle_radius, lineWidth + 2, 'white');
        // Draw new circle
        util.drawCircle(ctx, circles_coord[i][0], circles_coord[i][1],
                        circle_radius, lineWidth, lineColorClicked);

        is_clicked[i] = true;
        break;
      }
    }

    for (var i = 0; i < circles_coord.length; i++) {
      if (!is_clicked[i]) {
        return false;
      }
    }
    // Test over
    return true;
  };
};

// TEST 2
// Draw several cubes on the edge of screen
var test2 = function(canvas) {
  var ctx = canvas.getContext('2d');
  var aspect = canvas.width / canvas.height;
  var cubes_num_vertical = 20;
  var cubes_num_horizontal = Math.round(cubes_num_vertical * aspect);
  var cube_width = canvas.width / cubes_num_horizontal;
  var cube_height = canvas.height / cubes_num_vertical;

  var cube_coord_x = [];
  var cube_coord_y = [];
  var is_clicked_top = [];
  var is_clicked_bottom = [];
  var is_clicked_left = [];
  var is_clicked_right = [];
  var total_clicked = 0;

  (function init() {
    util.clearScreen(ctx);
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'lime';
    ctx.lineWidth = 1;

    // Because width/height of screen can not be divided evenly
    // So we precaculate the grid (coordination) of cubes for future use
    for (var i = 0; i < cubes_num_horizontal; i++) {
      cube_coord_x[i] = Math.round(cube_width * i);
    }
    cube_coord_x[cubes_num_horizontal] = canvas.width - 1;
    for (var i = 0; i < cubes_num_vertical; i++) {
      cube_coord_y[i] = Math.round(cube_height * i);
    }
    cube_coord_y[cubes_num_vertical] = canvas.height - 1;

    // Draw Top/Bottom/Left/Right cubes
    for (var i = 0; i < cubes_num_horizontal; i++) {
      util.drawRectFromCoord(ctx, cube_coord_x[i], cube_coord_y[0],
                                  cube_coord_x[i + 1], cube_coord_y[1]);
      is_clicked_top[i] = false;
    }
    for (var i = 0; i < cubes_num_horizontal; i++) {
      util.drawRectFromCoord(ctx,
                             cube_coord_x[i],
                             cube_coord_y[cubes_num_vertical - 1],
                             cube_coord_x[i + 1],
                             cube_coord_y[cubes_num_vertical]);
      is_clicked_bottom[i] = false;
    }
    for (var i = 0; i < cubes_num_vertical; i++) {
      util.drawRectFromCoord(ctx,
                             cube_coord_x[0],
                             cube_coord_y[i],
                             cube_coord_x[1],
                             cube_coord_y[i + 1]);
      is_clicked_left[i] = false;
    }
    for (var i = 0; i < cubes_num_vertical; i++) {
      util.drawRectFromCoord(ctx,
                             cube_coord_x[cubes_num_horizontal - 1],
                             cube_coord_y[i],
                             cube_coord_x[cubes_num_horizontal],
                             cube_coord_y[i + 1]);
      is_clicked_right[i] = false;
    }
  }
  )();

  // Touch test, fill cubes if touch point is in the cube.
  // Test ends if all cubes are touched
  this.test = function(x, y) {
    if (cube_coord_x[1] <= x && x <= cube_coord_x[cubes_num_horizontal - 1] &&
        cube_coord_y[1] <= y && y <= cube_coord_y[cubes_num_vertical - 1]) {
      return false;
    }

    var startXi = util.binary_search(cube_coord_x, x);
    var startYi = util.binary_search(cube_coord_y, y);
    util.fillRectFromCoord(ctx,
                           cube_coord_x[startXi],
                           cube_coord_y[startYi],
                           cube_coord_x[startXi + 1],
                           cube_coord_y[startYi + 1]);
    if (startYi == 0 && !is_clicked_top[startXi]) {
      is_clicked_top[startXi] = true;
    }
    if (startYi == cubes_num_vertical - 1 && !is_clicked_bottom[startXi]) {
      is_clicked_bottom[startXi] = true;
    }
    if (startXi == 0 && !is_clicked_left[startYi]) {
      is_clicked_left[startYi] = true;
    }
    if (startXi == cubes_num_horizontal - 1 && !is_clicked_right[startYi]) {
      is_clicked_right[startYi] = true;
    }

    for (var i = 0; i < cubes_num_vertical; i++) {
      if (!is_clicked_left[i] || !is_clicked_right[i]) {
        return false;
      }
    }
    for (var i = 0; i < cubes_num_horizontal; i++) {
      if (!is_clicked_top[i] || !is_clicked_bottom[i]) {
        return false;
      }
    }
    // Test over
    return true;
  };
};

var test_driver = function() {
  var current_test = null;
  var canvas = document.getElementById('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';

  function proceed() {
    if (current_test == null) {
      current_test = new test1(canvas);
    }
    else if (current_test instanceof test1) {
      current_test = new test2(canvas);
    }
    else if (current_test instanceof test2) {
      document.mozCancelFullScreen();
    }
  }

  proceed();

  this.touch = function(x, y) {
    var result = current_test.test(x, y);
    if (result) {
      proceed();
    }
  };
};

// Handle touch input
// Codes modified from https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Events/Touch_events
var touchTest = function() {
  var ongoingTouches = [];
  var driver = null;
  var canvas = null;

  function copyTouch(touch) {
    return { identifier: touch.identifier,
             pageX: touch.pageX,
             pageY: touch.pageY };
  }

  function ongoingTouchIndexById(idToFind) {
    for (var i = 0; i < ongoingTouches.length; i++) {
      var id = ongoingTouches[i].identifier;

      if (id == idToFind) {
        return i;
      }
    }
    return -1;    // not found
  }

  function handleEvent(evt) {
    var touches = evt.changedTouches;
    evt.preventDefault();

    switch (evt.type) {
      case 'touchstart':
        for (var i = 0; i < touches.length; i++) {
          ongoingTouches.push(copyTouch(touches[i]));
          var coord = util.relMouseCoords(canvas, touches[i]);
          driver.touch(coord.x, coord.y);
        }
        break;
      case 'touchmove':
        for (var i = 0; i < touches.length; i++) {
          var coord = util.relMouseCoords(canvas, touches[i]);
          var idx = ongoingTouchIndexById(touches[i].identifier);

          if (idx >= 0) {
            var coord_last = util.relMouseCoords(canvas, ongoingTouches[idx]);
            driver.touch(coord.x, coord.y);
            // swap in the new touch record
            ongoingTouches.splice(idx, 1, copyTouch(touches[i]));
          } else {
            console.log('can\'t figure out which touch to continue');
          }
        }
        break;
      case 'touchend':
        for (var i = 0; i < touches.length; i++) {
          var coord = util.relMouseCoords(canvas, touches[i]);
          var idx = ongoingTouchIndexById(touches[i].identifier);

          if (idx >= 0) {
            ongoingTouches.splice(i, 1);  // remove it; we're done
          } else {
            console.log('can\'t figure out which touch to end');
          }
        }
        break;
      case 'touchcancel':
        for (var i = 0; i < touches.length; i++) {
          ongoingTouches.splice(i, 1);  // remove it; we're done
        }
        break;
    }
  }

  this.init = function() {
    driver = new test_driver();

    if (canvas == null) {
      canvas = document.getElementsByTagName('canvas')[0];
      canvas.addEventListener('touchstart', handleEvent, false);
      canvas.addEventListener('touchend', handleEvent, false);
      canvas.addEventListener('touchcancel', handleEvent, false);
      canvas.addEventListener('touchleave', handleEvent, false);
      canvas.addEventListener('touchmove', handleEvent, false);
      console.log('initialized.');
    }
  };
};

window.addEventListener('load', function() {
  document.getElementById('start').addEventListener('click', function() {
    document.getElementById('information').classList.add('invisible');
    document.getElementById('canvas').classList.remove('invisible');
    document.body.mozRequestFullScreen();
  });
});

window.addEventListener('resize', function() {
  if (document.mozFullScreen || document.webkitIsFullScreen) {
    var test = new touchTest;
    test.init();
  }
});
