/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';
const kAutoUnlock = true;

// Change the display state (off, locked, default)
var displayState;
function changeDisplayState(state) {
  displayState = state;

  // update clock and battery status (if needed)
  updateClock();
  updateBattery();

  // Make sure the source viewer is not visible.
  if (state == "locked")
    hideSourceViewer();
}

function IconGrid(container) {
  this.grid = container;
  this.page = 0;

  // update the layout state
  var rect = container.getBoundingClientRect();
  this.pageWidth = rect.width;
  this.pageHeight = window.innerHeight;
  this.reflow();

  // install custom panning handler
  var self = this;
  var customDragger = {
    dragging: null,
    panning: null,
    isPan: function isPan(x1, y1, x2, y2) {
      var kRadius = 10;
      return Math.abs(x1 - x2) > kRadius || Math.abs(y1 - y2) > kRadius;
    },
    onTouchStart: function onTouchStart(evt) {
      window.removeEventListener('MozBeforePaint', self, true);
      this.startX = this.lastX = evt.pageX;
      this.startY = this.lastY = evt.pageY;
      this.startTime = evt.timeStamp;
    }, 

    onTouchEnd: function onTouchEnd(evt) {
      var offsetX = this.startX - evt.pageX;
      var diffX = Math.abs(offsetX);

      var quick = (evt.timeStamp - this.startTime < 200);
      var small = diffX > 10 && diffX < 100;
      var flick = quick && small;

      if (flick) {
        var direction = offsetX > 0 ? 1 : -1;
        self.setPage(self.page + direction, 400);
      } else {
        var page = Math.round(container.scrollLeft / self.pageWidth);
        self.setPage(page, 200);
      }
      window.addEventListener('MozBeforePaint', self, true);
    },   

    onTouchMove: function onTouchMove(evt) {
      var offsetX = this.lastX - evt.pageX;
      this.lastX = evt.pageX;
      container.scrollLeft = container.scrollLeft + offsetX;
    },
    
    handleEvent: function handleEvent(evt) {
      var target = evt.target;
      switch(evt.type) {
        case "touchstart":
          evt.preventDefault();
        case 'mousedown':
          hideSourceViewer();
          customDragger.onTouchStart(evt.touches ? evt.touches[0] : evt);
          this.touch = true;
          break
        case "touchmove":
          evt.preventDefault();
        case 'mousemove':
          if (!this.touch)
            return;

          if (this.dragging) {
            container.setAttribute('panning', true);
            var offsetX = evt.pageX - this.lastX;
            var offsetY = evt.pageY - this.lastY;
            this.dragging.style.MozTransform = 'translate(' + offsetX + 'px, ' + offsetY + 'px)';
          } else if (!this.panning && this.isPan(evt.pageX, evt.pageY, this.startX, this.startY)) {
            this.panning = true;
            this.startX = this.lastX = evt.pageX;
            this.startY = this.lastY = evt.pageY;
            document.getElementById('activeHandler').setCapture();
            container.setAttribute('panning', true);
            customDragger.onTouchMove(evt.touches ? evt.touches[0] : evt);
          } else if (this.panning) {
            customDragger.onTouchMove(evt.touches ? evt.touches[0] : evt);
          }
          break;
        case "touchend":
          evt.preventDefault();
        case 'mouseup':
          if (this.dragging) {
            container.removeAttribute('panning');
            this.dragging.removeAttribute('draggable');
            this.dragging.style.MozTransform = '';
            this.dragging = this.touch = false;
          } else if (this.panning) {
            document.releaseCapture();
            container.removeAttribute('panning');
            this.panning = this.touch = false;
            customDragger.onTouchEnd(evt.touches ? evt.touches[0] : evt);
          } else if (this.touch) {
            this.touch = false;
            var event = document.createEvent("UIEvents");
            event.initUIEvent("tap", true, true, window, 1);
            evt.target.dispatchEvent(event);
          }
          break;
        case 'contextmenu':
          if (!target.classList || !target.classList.contains('app'))
            return;
 
          target.setAttribute('draggable', 'true');
          target.style.MozTransform = 'translate(0px, 0px)';
          this.startX = evt.clientX;
          this.startY = evt.clientY;
          this.dragging = target;
          break;
        case 'tap':
          openApplication(evt.target.getAttribute('data-url'));
          break;
      }
    }
  };
  // install event handlers
  container.customDragger = customDragger;
  container.addEventListener('mousedown', customDragger, true);
  container.addEventListener('touchstart', customDragger, true);
  window.addEventListener('mousemove', customDragger, true);
  window.addEventListener('touchmove', customDragger, true);
  window.addEventListener('mouseup', customDragger, true);
  window.addEventListener('touchend', customDragger, true);
  container.addEventListener('tap', customDragger, true);
  container.addEventListener('contextmenu', customDragger, true);
  window.addEventListener('resize', this, true);
  window.addEventListener('keypress', this, true);
};

function hideSourceViewer() {
  document.getElementById("viewsource").style.visibility = "hidden";
}

IconGrid.prototype = {
  add: function(url, src, label) {
    var app = document.createElement('div');
    app.classList.toggle('app');
    app.setAttribute('data-url', url);
    app.setAttribute("data-text", label);
    app.style.backgroundImage = 'url(' + src + ')';
    this.grid.appendChild(app);
  },

  remove: function(app) {
    this.grid.removeChild(app);
  },

  reflow: function() {
    var calcWidth = this.pageWidth + 'px';
    this.grid.style.MozColumnWidth = calcWidth;

    var calcHeight = '-moz-calc(' + this.pageHeight + 'px - 9.5mozmm)';
    this.grid.style.height = calcHeight;
  },

  setPage: function(page, duration) {
    this.page = page;

    RequestAnimationFrame();
    this.startPosition = this.grid.scrollLeft;
    this.pagePosition = page * this.pageWidth;
    this.startTime = GetAnimationClockTime();
    this.stopTime = this.startTime + duration;
  },

  handleEvent: function(evt) {
    switch (evt.type) {
      case 'resize':
        var rect = this.grid.getBoundingClientRect();
        this.pageWidth = rect.width;
        this.pageHeight = window.innerHeight;
        var currentPage = this.page;
        this.reflow();
        this.page = currentPage;
        break;
      case 'keypress':
        if (evt.keyCode != evt.DOM_VK_ESCAPE)
          break;

        var event = document.createEvent("UIEvents");
        event.initUIEvent("appclose", true, true, window, 1);
        window.top.dispatchEvent(event);
        break;
      case 'MozBeforePaint':
        var container = this.grid;
        var elapsed = GetElapsed(this.startTime,
                                 this.stopTime,
                                 GetAnimationClockTime());
        var position = Physics.Linear(elapsed,
                                      this.startPosition,
                                      container.scrollLeft,
                                      this.pagePosition);
        container.scrollLeft = position;
        if (position == this.pagePosition)
          return;

        RequestAnimationFrame();
        break;
    }
  }
}

// Return the current time of the "animation clock", which ticks on
// each frame drawn.
function GetAnimationClockTime() {
  return window.mozAnimationStartTime ||
         window.webkitAnimationStartTime ||
         window.animationStartTime;
}

function RequestAnimationFrame() {
  if (window.mozRequestAnimationFrame)
    window.mozRequestAnimationFrame();
  else if (window.webkitRequestAnimationFrame)
    window.webkitRequestAnimationFrame();
  else if (window.requestAnimationFrame)
    window.requestAnimationFrame();
}

function GetElapsed(start, stop, now) {
  return (now < start || now > stop) ? 1 : ((now - start) / (stop - start));
};

var Physics = {
  Linear: function(elapsed, start, current, target) {
    return start + (target - start) * elapsed;
  }
}

function LockScreen(overlay) {
  this.overlay = overlay;
  overlay.addEventListener('touchstart', this, true);
  overlay.addEventListener('touchmove', this, true);
  overlay.addEventListener('touchend', this, true);
  overlay.addEventListener('touchcancel', this, true);
  overlay.addEventListener('mousedown', this, true);
  overlay.addEventListener('mouseup', this, true);
  overlay.addEventListener('mousemove', this, true);
  overlay.addEventListener('mouseout', this, true);
}

LockScreen.prototype = {
  onTouchStart: function onTouchStart(evt) {
    this.start = evt.pageY;
    this.panning = true;
  },
  onTouchMove: function onTouchMove(evt) {
    if (!this.panning)
      return;

    this.offset = evt.pageY - this.start;

    var style = this.overlay.style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + this.offset + 'px)';
  },
  onTouchEnd: function onTouchEnd(evt) {
    if (!this.panning)
      return;

    this.offset = evt.pageY - this.start;
    if (Math.abs(this.offset) < window.innerHeight / 4)
      this.lock();
    else
      this.unlock(this.offset);
    this.panning = false;
  },
  handleEvent: function handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
      case 'touchstart':
        this.onTouchStart(evt.touches ? evt.touches[0] : evt);
        break;
      case 'mousemove':
      case 'touchmove':
        this.onTouchMove(evt.touches ? evt.touches[0] : evt);
        break;
      case 'mouseup':
      case 'mouseout':
      case 'touchend':
      case 'touchcancel':
        this.onTouchEnd(evt.touches ? evt.touches[0] : evt);
        break;
    }
    evt.preventDefault();
  },
  unlock: function(direction) {
    var offset = '100%';
    if (direction < 0)
      offset = '-' + offset;
    var style = this.overlay.style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(' + offset + ')';
    changeDisplayState('unlocked');
  },
  lock: function() {
    var style = this.overlay.style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(0)';
    changeDisplayState('locked');
  }
}

function startup() {
  var lockScreen = new LockScreen(document.getElementById('lockscreen'));
  kAutoUnlock ? lockScreen.unlock(-1) : lockScreen.lock();

  var applications = [
    { label: 'Phone', src: 'images/Phone.png',
      url: 'dialer/dialer.html' },
    { label: 'Messages', src: 'images/Messages.png',
      url: 'sms/sms.html' },
    { label: 'Calendar', src: 'images/Calendar.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Gallery', src: 'images/Gallery.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Camera', src: 'images/Camera.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Maps', src: 'images/Maps.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'YouTube', src: 'images/YouTube.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Calculator', src: 'images/Calculator.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Books', src: 'images/Books.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Browser', src: 'images/Browser.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Music', src: 'images/Music.png',
      url: 'data:text/html,<font color="blue">Hello' },
    { label: 'Settings', src: 'images/Settings.png',
      url: 'settings/settings.html' },
  ];

  var homescreen = document.getElementById('homescreen');
  var iconGrid = new IconGrid(homescreen);
  for (var k = 0; k < 10; k++)
  for (var i = 0; i < applications.length; i++) {
    var app = applications[i];
    iconGrid.add(app.url, app.src, app.label);
  }

  // XXX In the long term this is probably bad for battery
  window.setInterval(updateClock, 60000);
  updateClock();

  try {
    var battery = window.navigator.mozBattery;
    battery.addEventListener('chargingchange', updateBattery);
    battery.addEventListener('levelchange', updateBattery);
    battery.addEventListener('statuschange', updateBattery);
    updateBattery();
  } catch(e) {
    console.log('Error when initializing the battery: ' + e);
  }

  var lastPaintCount = window.mozPaintCount;
  var frameRateWidget = document.getElementById("frameRate");
  window.setInterval(function showFrameRate() {
    frameRateWidget.innerHTML = '(' + (window.mozPaintCount - lastPaintCount) + ')';
    lastPaintCount = window.mozPaintCount;
  }, 1000);

  WindowManager.start();
}

var WindowManager = {
  start: function wm_start() {
    window.addEventListener('appclose', this, true);
  },
  stop: function wm_stop() {},
  handleEvent: function wm_handleEvent(evt) {
    switch (evt.type) {
      case 'appclose':
        var windows = document.getElementById('windows');
        if (!windows.childElementCount)
          return;

        // TODO when existing window will be checked, this should be
        // point to the real window
        var topWindow = windows.lastElementChild;
        topWindow.classList.toggle('animateClosing');

        window.addEventListener(
          'animationend',
          function listener() {
            window.removeEventListener('animationend', listener, false);
            windows.removeChild(topWindow);
            if (!windows.childElementCount)
              windows.setAttribute('hidden', 'true');
          },
          false);
        break;
      default:
        throw new Error('Unhandled event in WindowManager');
        break;
    }
  }
};

// open the application referred to by |url| into a new window, or
// bring its window to front if already open.
function openApplication(url) {
  // TODO
  //var existingWindow = document.querySelector('#windows > ...');

  var newWindow = document.createElement('iframe');
  newWindow.className = 'appWindow';
  // XXX need to decide whether to try to load this during animation
  newWindow.src = url;

  // animate the window opening
  newWindow.classList.toggle('animateOpening');

  var windows = document.getElementById('windows');
  windows.removeAttribute('hidden');
  windows.appendChild(newWindow);

  window.addEventListener(
    'animationend',
    function listener() {
      newWindow.classList.toggle('animateOpening');
      window.removeEventListener('animationend', listener, false);
    },
    false);
}

function closeApplication(url) {
}


// Update the clock and schedule a new update if appropriate
function updateClock() {
  // If the display is off, there is nothing to do here
  if (displayState == 'off')
    return;

  var now = new Date();
  var match = document.getElementsByClassName('time');
  for (var n = 0; n < match.length; ++n) {
    var element = match[n];
    element.textContent = now.toLocaleFormat(element.dataset.format);
  }

  // Schedule another clock update when a new minute rolls around
  var now = new Date();
  var sec = now.getSeconds();
  setTimeout(updateClock, (59 - sec) * 1000);
}

function updateBattery() {
  var battery = window.navigator.mozBattery;
  if (!battery)
    return;

  // If the display is off, there is nothing to do here
  if (displayState == 'off') {
    battery.removeEventListener('chargingchange', updateBattery);
    battery.removeEventListener('levelchange', updateBattery);
    battery.removeEventListener('statuschange', updateBattery);
    return;
  }

  var elements = document.getElementsByClassName('battery');
  for (var n = 0; n < elements.length; ++n) {
    var element = elements[n];
    var fuel = element.children[0];
    var charging = element.children[1];
    if (battery.charging) {
      fuel.className = 'charging';
      charging.visible = true;
    } else {
      var level = battery.level;
      fuel.style.width = (level / 4) + 'px';
      if (level <= 5)
        fuel.className = 'critical';
      else if (level <= 15)
        fuel.className = 'low';
      else
        fuel.className = '';
    }
  }

  // Make sure we will be called for any changes to the battery status
  battery.addEventListener('chargingchange', updateBattery);
  battery.addEventListener('levelchange', updateBattery);
  battery.addEventListener('statuschange', updateBattery);
}

