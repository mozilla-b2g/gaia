/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function IconGrid(container, iconWidth, iconHeight) {
  this.grid = container;
  this.iconWidth = iconWidth;
  this.iconHeight = iconHeight;

  // update the layout state
  var pageWidth = window.innerWidth;
  var pageHeight = window.innerHeight;
  this.reflow(pageWidth, pageHeight);

  // install event handlers
  window.addEventListener("resize", this, true);

  // install custom panning handler
  var self = this;
  var customDragger = {
    kinetic: false,
    dragging: null,
    isDraggable: function isDraggable(target, scroller) {
      return { x: true, y: false }; 
    },   

    dragStart: function dragStart(cx, cy, target, scroller) {
      this.max = container.scrollLeft + window.innerWidth;
      this.min = container.scrollLeft - window.innerWidth;
      container.setAttribute("panning", "true");
      window.removeEventListener("MozBeforePaint", self, true);
    },   

    dragStop: function dragStop(dx, dy, scroller) {
      var currentPage = Math.round(container.scrollLeft / window.innerWidth);
      self.setPage(currentPage);
      container.removeAttribute("panning");
      window.addEventListener("MozBeforePaint", self, true);
    },   

    dragMove: function dragMove(dx, dy, scroller) {
      var oldX = container.scrollLeft;
      container.scrollLeft = 
        Math.max(Math.min(container.scrollLeft + dx, this.max), this.min); 
      var newX = container.scrollLeft;
      return (oldX - newX);
    },
    
    handleEvent: function handleEvent(evt) {
      var target = evt.target;
      switch(evt.type) {
        case "TapLong":
          if (!target.classList || !target.classList.contains("app"))
            return;
 
          target.setAttribute("draggable", "true");
          target.style.MozTransform = "translate(0px, 0px)";
          this.startX = evt.clientX;
          this.startY = evt.clientY;
          this.dragging = target;
          break;
        case "mousemove":
          target = this.dragging;
          if (!target)
            return;

          var offsetX = evt.clientX - this.startX;
          var offsetY = evt.clientY - this.startY;
          target.style.MozTransform = "translate(" + offsetX + "px, " + offsetY + "px)";
          break;
        case "mouseup":
          target = this.dragging;
          if (!target)
            return;

          target.removeAttribute("draggable");
          target.style.MozTransform = "";
          this.dragging = null;
          break;
        case "TapSingle":
          openApplication(evt.target.getAttribute("data-url"));
          break;
      }
    }
  };
  container.customDragger = customDragger;
  window.addEventListener("mouseup", customDragger, true);
  window.addEventListener("mousemove", customDragger, true);
  window.addEventListener("TapSingle", customDragger, true);
  window.addEventListener("TapLong", customDragger, true);
}

IconGrid.prototype = {
  add: function(url, src, label) {
    var app = document.createElement("div");
    app.classList.toggle("app");
    app.setAttribute("data-url", url);

    var icon = document.createElement("img");
    icon.classList.toggle("icon");
    icon.src = src;

    var title = document.createElement("span");
    title.classList.toggle("title");
    title.appendChild(document.createTextNode(label));

    app.appendChild(icon);
    app.appendChild(title);
    this.grid.appendChild(app);
  },

  remove: function(app) {
    this.grid.removeChild(app);
  },

  reflow: function(width, height) {
    var calcWidth = width + "px";
    this.grid.style.MozColumnWidth = calcWidth;

    var calcHeight = "-moz-calc(" + height + "px - 9.5mozmm)";
    this.grid.style.height = calcHeight;
  },

  setPage: function(page) {
    this.page = page;
    window.mozRequestAnimationFrame();
  },

  handleEvent: function(evt) {
    switch (evt.type) {
      case "resize":
        var currentPage = this.page;
        this.reflow(window.innerWidth, window.innerHeight);
        this.page = currentPage;
        break;
      case "MozBeforePaint":
        var container = this.grid;
        var currentPosition = container.scrollLeft;
        var pagePosition = this.page * window.innerWidth;

        var kSlowFactor = 5;
        var step = (pagePosition - currentPosition) / kSlowFactor;
        if (Math.abs(step) >= 1) {
          container.scrollLeft += step;
          window.mozRequestAnimationFrame();
          return;
        }
        container.scrollLeft = pagePosition;
        break;
    }
  }
}

function startup() {
  var applications = [
    { label: 'Phone', src: 'images/Phone.png',
      url: 'dialer/dialer.html' },
    { label: 'Messages', src: 'images/Messages.png',
      url: 'data:text/html,<font color="blue">Hello' },
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

  var homescreen = document.getElementById("homescreen");
  var iconGrid = new IconGrid(homescreen, 96, 96);
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
    battery.addEventListener("chargingchange", updateBattery);
    battery.addEventListener("levelchange", updateBattery);
    battery.addEventListener("statuschange", updateBattery);
    updateBattery();
  } catch(e) {
    console.log("Error when initializing the battery: " + e);
  }

  WindowManager.start();
}

var WindowManager = {
  start: function wm_start() {
    window.addEventListener("appclose", this, true);
  },
  stop: function wm_stop() {},
  handleEvent: function wm_handleEvent(evt) {
    switch (evt.type) {
      case "appclose":
        var windows = document.getElementById('windows');
        if (windows.childElementCount <= 1)
          return;

        var loadScreen = document.getElementById('loadAnimationScreen');
        loadScreen.style.display = 'block';
        loadScreen.classList.toggle('animateClosing');

        // TODO when existing window will be checked, this should be
        // point to the real window
        var topWindow = windows.lastElementChild;
        windows.removeChild(topWindow);

        window.addEventListener(
          'animationend',
          function listener() {
            loadScreen.className = '';
            loadScreen.style.display = 'none';
            window.removeEventListener('animationend', listener, false);

            if (windows.childElementCount <= 1)
              windows.setAttribute("hidden", "true");
          },
          false);
        break;
      default:
        throw new Error("Unhandled event in WindowManager");
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
  newWindow.style.display = 'none';
  // XXX need to decide whether to try to load this during animation
  newWindow.src = url;

  var windows = document.getElementById('windows');
  windows.removeAttribute("hidden");
  windows.appendChild(newWindow);

  var loadScreen = document.getElementById('loadAnimationScreen');
  loadScreen.classList.toggle('animateOpening');
  loadScreen.style.display = 'block';

  window.addEventListener(
    'animationend',
    function listener() {
      loadScreen.classList.toggle('animateOpening');
      loadScreen.style.display = 'none';
      newWindow.style.display = 'block';
      window.removeEventListener('animationend', listener, false);
    },
    false);
}

function updateClock() {
  var now = new Date();
  var str = now.getHours();
  str += ':';
  var mins = now.getMinutes();
  if (mins < 10)
    str += "0";
  str += mins;
  document.getElementById('statusClock').innerHTML = str;
}

function updateBattery() {
  var battery = document.getElementById('statusBattery');
  var level = window.navigator.mozBattery.level;
  var charging = window.navigator.mozBattery.charging;
  if (charging) {
    battery.className = 'batteryCharging';
  } else {
    document.getElementById('battery-fuel').style.width = (level / 4) + 'px';
    if (level <= 5)
      battery.className = 'critical';
    else if (level <= 15)
      battery.className = 'low';
    else
      battery.className = '';
  }
}
