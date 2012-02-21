/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const SHORTCUTS_HEIGHT = 144;

var displayState;

function foregroundAppURL() {
  var win = WindowManager.getForegroundWindow();
  return (win !== null) ? win.application.url : window.document.URL;
}

function toggleSourceViewer(url) {
  if (isSourceViewerActive()) {
    hideSourceViewer(url);
  } else {
    showSourceViewer(url);
  }
}

function getSourceViewerElement() {
  return content.document.getElementById('appViewsource');
}

function isSourceViewerActive() {
  var viewsource = getSourceViewerElement();
  return viewsource !== null && viewsource.style.visibility != 'hidden';
}

function showSourceViewer(url) {
  var document = content.document;
  var viewsource = getSourceViewerElement();
  if (!viewsource) {
    var style = '#appViewsource { ' +
                '  position: absolute;' +
                '  top: -moz-calc(10%);' +
                '  left: -moz-calc(10%);' +
                '  width: -moz-calc(80% - 2 * 15px);' +
                '  height: -moz-calc(80% - 2 * 15px);' +
                '  visibility: hidden;' +
                '  box-shadow: 10px 10px 5px #888;' +
                '  margin: 15px;' +
                '  background-color: white;' +
                '  opacity: 0.92;' +
                '  color: black;' +
                '  z-index: 9999;' +
                '}';
    document.styleSheets[0].insertRule(style, 0);

    viewsource = document.createElement('iframe');
    viewsource.id = 'appViewsource';
    document.body.appendChild(viewsource);
  }
  viewsource.style.visibility = 'visible';
  viewsource.src = 'view-source: ' + url;
}

function hideSourceViewer() {
  var viewsource = getSourceViewerElement();
  if (viewsource !== null) {
    viewsource.style.visibility = 'hidden';
  }
}

// Change the display state (off, locked, default)
function changeDisplayState(state) {
  displayState = state;

  // update clock and battery status (if needed)
  updateClock();
  updateBattery();

  // Make sure the source viewer is not visible.
  if (state == 'locked')
    hideSourceViewer();
}

function createPhysicsFor(iconGrid) {
  return new DefaultPhysics(iconGrid);
}

function DefaultPhysics(iconGrid) {
  this.iconGrid = iconGrid;
  this.moved = false;
  this.touchState = { active: false, startX: 0, startY: 0 };
}

DefaultPhysics.prototype = {
  onTouchStart: function(e) {
    hideSourceViewer();

    var touchState = this.touchState;
    this.moved = false;
    touchState.active = true;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;
    touchState.startTime = e.timeStamp;
  },
  onTouchMove: function(e) {
    var iconGrid = this.iconGrid;
    var touchState = this.touchState;
    if (touchState.active) {
      var dx = touchState.startX - e.pageX;
      if (dx !== 0) {
        iconGrid.pan(-dx);
        this.moved = true;
      }
      e.stopPropagation();
    }
  },
  onTouchEnd: function(e) {
    var touchState = this.touchState;
    if (!touchState.active)
      return;
    touchState.active = false;

    var startX = touchState.startX;
    var endX = e.pageX;
    var diffX = endX - startX;
    var dir = (diffX > 0) ? -1 : 1;

    var quick = (e.timeStamp - touchState.startTime < 200);
    var long = (e.timeStamp - touchState.startTime > 2000);
    var small = Math.abs(diffX) < 20;

    var flick = quick && !small;
    var tap = small;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage;
    if (tap) {
      iconGrid.tap();
      return;
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 0.2);
    } else {
      if (Math.abs(diffX) < this.containerWidth / 2)
        iconGrid.setPage(currentPage, 0.2);
      else
        iconGrid.setPage(currentPage + dir, 0.2);
    }
    e.stopPropagation();
  }
};

var Mouse2Touch = {
  'mousedown': 'touchstart',
  'mousemove': 'touchmove',
  'mouseup': 'touchend'
};

var Touch2Mouse = {
  'touchstart': 'mousedown',
  'touchmove': 'mousemove',
  'touchend': 'mouseup'
};

var ForceOnWindow = {
  'touchmove': true,
  'touchend': true,
  'sleep': true
}

function AddEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.addEventListener(name, {
      handleEvent: function(e) {
        if (Mouse2Touch[e.type]) {
          var original = e;
          e = {
            type: Mouse2Touch[original.type],
            target: original.target,
            touches: [original],
            preventDefault: function() {
              original.preventDefault();
            }
          };
          e.changedTouches = e.touches;
        }
        return listener.handleEvent(e);
      }
    }, true);
  }
}

function RemoveEventHandlers(target, listener, eventNames) {
  for (var n = 0; n < eventNames.length; ++n) {
    var name = eventNames[n];
    target = ForceOnWindow[name] ? window : target;
    name = Touch2Mouse[name] || name;
    target.removeEventListener(name, listener);
  }
}

function IconGrid(containerId, columns, rows, minPages, showLabels) {
  this.containerId = containerId;
  this.container = document.getElementById(containerId);
  this.columns = columns || 4;
  this.rows = rows || 3;
  this.minPages = minPages;
  this.showLabels = showLabels;
  this.icons = [];
  this.currentPage = 0;
  this.physics = createPhysicsFor(this);

  // install event handlers
  AddEventHandlers(this.container, this, ['touchstart', 'touchmove', 'touchend']);
  AddEventHandlers(window, this, ['resize']);
}

IconGrid.prototype = {
  add: function(slot, iconUrl, label, action) {
    var icons = this.icons;
    var icon = { slot: slot, iconUrl: iconUrl, label: label, action: action };
    icon.index = icons.length;
    icons.push(icon);
  },
  remove: function(icon) {
    this.icons.splice(icon.index);
  },

  // reflow the icon grid
  update: function() {
    var instance = this;
    var containerId = this.containerId;
    var container = this.container;
    var icons = this.icons;
    var columns = this.columns;
    var rows = this.rows;
    var currentPage = this.currentPage;
    var itemsPerPage = rows * columns;
    var iconWidth = Math.floor(100/columns);
    var iconHeight = Math.floor(100/rows);

    // get the page of an icon
    function getIconPage(icon) {
      return Math.floor(icon.slot / itemsPerPage);
    }

    // get the column of an icon
    function getIconColumn(icon) {
      return (icon.slot % itemsPerPage) % columns;
    }

    // get the row of an icon
    function getIconRow(icon) {
      return Math.floor((icon.slot % itemsPerPage) / columns);
    }

    // position a div using transform
    function setPosition(div, x, y) {
      div.style.MozTransform = 'translate(' + x + ',' + y + ')';
    }

    // touch handler for icons
    var TouchHandler = {
      handleEvent: function(e) {
        instance.lastAction = (e.type === 'touchstart') ? e.target.action : null;
      }
    };

    // get page divs
    var elementList = container.childNodes;
    var pageDivs = [];
    for (var n = 0; n < elementList.length; ++n) {
      var element = elementList[n];
      pageDivs[element.id] = element;
    }

    // get icon divs
    var elementList = document.querySelectorAll('#' + containerId + '> .page > .icon');
    var iconDivs = [];
    for (var n = 0; n < elementList.length; ++n) {
      var element = elementList[n];
      iconDivs[element.id] = element;
    }

    // calculate the new number of pages we need
    var pageCount = 0;
    for (var n = 0; n < icons.length; ++n) {
      var icon = icons[n];
      pageCount = Math.max(getIconPage(icon), pageCount);
    }
    pageCount = Math.max(this.minPages, pageCount);

    // adjust existing pages and create new ones as needed
    for (var n = 0; n < pageCount; ++n) {
      var pageDiv = pageDivs[n];
      if (!pageDiv) { // missing page
        pageDiv = document.createElement('div');
        pageDiv.id = n;
        pageDiv.className = 'page';
        container.appendChild(pageDiv);
        pageDivs[n] = pageDiv;
      }
      setPosition(pageDiv, (n - currentPage) + '00%', 0);
    }

    // remove pages we don't need
    for (var key in pageDivs) {
      if (key >= pageCount) {
        container.removeChild(pageDivs[key]);
        pageDivs[key] = null;
      }
    }

    // adjust existing icons and create new ones as needed
    for (var n = 0; n < icons.length; ++n) {
      var icon = icons[n];
      var pageOfIcon = getIconPage(icon);
      var iconDiv = iconDivs[n];
      if (!iconDiv) { // missing icon
        iconDiv = document.createElement('div');
        iconDiv.id = n;
        iconDiv.className = 'icon';

        var style = iconDiv.style;
        style.width = iconWidth + '%';
        style.height = iconHeight + '%';

        var img = new Image();
        AddEventHandlers(img, TouchHandler, ['touchstart', 'touchend']);

        var centerDiv = document.createElement('div');
        centerDiv.className = 'img';
        centerDiv.appendChild(img);
        iconDiv.appendChild(centerDiv);

        if (this.showLabels) {
          var labelDiv = document.createElement('div');
          labelDiv.className = 'label';
          iconDiv.appendChild(labelDiv);
        }

        pageDivs[pageOfIcon].appendChild(iconDiv);
        iconDivs[n] = iconDiv;
      } else {
        // if icon is on the wrong page, move it
        if (iconDiv.parentNode != pageDivs[pageOfIcon]) {
          iconDiv.parentNode.removeChild(iconDiv);
          pageDivs[pageOfIcon].appendChild(iconDiv);
        }
      }

      // make sure icon has right image and label
      var img = iconDiv.childNodes[0].childNodes[0];
      img.action = icon.action;

      var iconUrl = icon.iconUrl;
      if (img.src != iconUrl)
        img.src = iconUrl;

      if (this.showLabels) {
        var label = iconDiv.childNodes[1];
        if (label.textContent != icon.label)
          label.textContent = icon.label;
      }

      // update position
      setPosition(iconDiv, getIconColumn(icon) + '00%', getIconRow(icon) + '00%');
    }

    // remove icons we don't need
    for (var key in iconDivs) {
      if (key > icons.length) {
        iconDivs[key].parentNode.removeChild(iconDivs[key]);
        iconDivs[key] = null;
      }
    }

    // update paginator, if we have one
    var dots = this.dots;
    if (dots)
      dots.update(currentPage);
  },
  pan: function(x, duration) {
    var pages = this.container.childNodes;
    var currentPage = this.currentPage;
    for (var n = 0; n < pages.length; ++n) {
      var page = pages[n];
      var style = page.style;
      style.MozTransform = 'translateX(-moz-calc(' + (n - currentPage) + '00% + ' + x + 'px))';
      style.MozTransition = duration ? ('all ' + duration + 's ease;') : "";
    }
  },
  setPage: function(number, duration) {
    var pages = this.container.childNodes;
    if (number < 0)
      number = 0;
    if (number >= pages.length)
      number = pages.length - 1;
    this.currentPage = number;
    for (var n = 0; n < pages.length; ++n) {
      var page = pages[n];
      var style = page.style;
      style.MozTransform = 'translateX(' + (n - number) + '00%)';
      style.MozTransition = duration ? ('all ' + duration + 's ease') : "";
    }
    var dots = this.dots;
    if (dots)
      dots.update(number);
  },
  tap: function() {
    if (this.lastAction)
      eval(this.lastAction);
  },
  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'touchstart':
      physics.onTouchStart(e.touches[0]);
      break;
    case 'touchmove':
      physics.onTouchMove(e.touches[0]);
      break;
    case 'touchend':
      document.releaseCapture();
      physics.onTouchEnd(e.changedTouches[0]);
      break;
    case 'resize':
      this.update();
      break;
    default:
      return;
    }
    e.preventDefault();
  }
};

function Dots(containerId, gridId) {
  this.containerId = containerId;
  this.gridId = gridId;
  this.container = document.getElementById(containerId);
  this.grid = document.getElementById(gridId);
}

Dots.prototype = {
  update: function(current) {
    var container = this.container;
    var grid = this.grid;

    var numPages = grid.childNodes.length;

    // Add additional dots if needed.
    while (container.childNodes.length < numPages) {
      var dot = document.createElement('div');
      dot.className = "dot";
      container.appendChild(dot);
    }

    // Remove excess dots.
    while (container.childNodes.length > numPages)
      container.removeChild(container.childNodes[0]);

    // Set active/inactive state.
    var childNodes = container.childNodes;
    for (var n = 0; n < numPages; ++n) {
      var dot = childNodes[n];
      if (n == current) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    }
  }
}

function NotificationScreen(touchables) {
  this.touchables = touchables;
  this.attachEvents(this.touchable);
}

NotificationScreen.prototype = {
  get touchable() {
    return this.touchables[this.locked ? 0 : 1];
  },
  get screenHeight() {
    var screenHeight = this._screenHeight;
    if (!screenHeight) {
      screenHeight = this.touchables[0].getBoundingClientRect().height;
      this._screenHeight = screenHeight;
    }
    return screenHeight;
  },
  onTouchStart: function(e) {
    this.startX = e.pageX;
    this.startY = e.pageY;
    this.onTouchMove({ pageY: e.pageY + 32 });
  },
  onTouchMove: function(e) {
    var dy = -(this.startY - e.pageY);
    if (this.locked)
      dy += this.screenHeight;
    dy = Math.min(this.screenHeight, dy);

    var style = this.touchables[0].style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + dy + 'px)';
  },
  onTouchEnd: function(e) {
    var dy = -(this.startY - e.pageY);
    var offset = Math.abs(dy);
    if ((!this.locked && offset > this.screenHeight / 4) ||
        (this.locked && offset < 10))
      this.lock();
    else
      this.unlock();
  },
  unlock: function() {
    var style = this.touchables[0].style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(0)';
    this.locked = false;
  },
  lock: function(dy) {
    var style = this.touchables[0].style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(100%)';
    this.locked = true;
  },
  attachEvents: function ns_attachEvents(view) {
    AddEventHandlers(window, this, ['touchstart', 'touchmove', 'touchend']);
  },
  detachEvents: function ns_detachEvents() {
    RemoveEventHandlers(window, this, ['touchstart', 'touchmove', 'touchend']);
  },
  handleEvent: function(evt) {
    var target = evt.target;
    switch (evt.type) {
    case 'touchstart':
      if (target != this.touchable)
        return;
      hideSourceViewer();
      this.active = true;

      target.setCapture(this);
      this.onTouchStart(evt.touches[0]);
      break;
    case 'touchmove':
      if (!this.active)
        return;

      this.onTouchMove(evt.touches[0]);
      break;
    case 'touchend':
      if (!this.active)
        return;
      this.active = false;

      document.releaseCapture();
      this.onTouchEnd(evt.changedTouches[0]);
      break;
    default:
      return;
    }

    evt.preventDefault();
  }
};

function LockScreen(overlay) {
  this.overlay = overlay;

  AddEventHandlers(overlay, this, ['touchstart', 'touchmove', 'touchend', 'sleep']);

  this.update(function fireHomescreenReady() {
    window.parent.postMessage('homescreenready', '*');
  });
}

LockScreen.prototype = {
  update: function lockscreen_update(callback) {
    var settings = window.navigator.mozSettings;
    if (!settings)
      return;
    var request = settings.get('lockscreen.disabled');
    request.addEventListener('success', (function onsuccess(evt) {
      request.result.value !== 'true' ? this.lock(true) : this.unlock(-1, true);

      if (callback)
        setTimeout(callback, 0);
    }).bind(this));

    request.addEventListener('error', (function onerror(evt) {
      this.lock(true);
      if (callback)
        setTimeout(callback, 0);
    }).bind(this));
  },
  onTouchStart: function(e) {
    this.startX = e.pageX;
    this.startY = e.pageY;
    this.moving = true;
  },
  onTouchMove: function(e) {
    if (this.moving) {
      var dy = -(this.startY - e.pageY);
      var style = this.overlay.style;
      style.MozTransition = '';
      style.MozTransform = 'translateY(' + dy + 'px)';
    }
  },
  onTouchEnd: function(e) {
    if (this.moving) {
      this.moving = false;
      var dy = -(this.startY - e.pageY);
      if (Math.abs(dy) < window.innerHeight / 4)
        this.lock();
      else
        this.unlock(dy);
    }
  },
  unlock: function(direction, instant) {
    var offset = '100%';
    if (direction < 0)
      offset = '-' + offset;

    var style = this.overlay.style;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(' + offset + ')';
    changeDisplayState('unlocked');

    var unlockEvent = document.createEvent('CustomEvent');
    unlockEvent.initCustomEvent('unlocked', true, true, null);
    window.dispatchEvent(unlockEvent);
  },
  lock: function(instant) {
    var style = this.overlay.style;
    if (instant) {
      style.MozTransition = style.MozTransform = '';
    } else {
      style.MozTransition = '-moz-transform 0.2s linear';
      style.MozTransform = 'translateY(0)';
    }
    changeDisplayState('locked');

    var lockEvent = document.createEvent('CustomEvent');
    lockEvent.initCustomEvent('locked', true, true, null);
    window.dispatchEvent(lockEvent);
  },
  handleEvent: function(e) {
    hideSourceViewer();

    switch (e.type) {
    case 'touchstart':
      this.onTouchStart(e.touches[0]);
      this.overlay.setCapture(false);
      break;
    case 'touchmove':
      this.onTouchMove(e.touches[0]);
      break;
    case 'touchend':
      this.onTouchEnd(e.changedTouches[0]);
      document.releaseCapture();
      break;
    case 'sleep':
      // Lock the screen when screen is turn off can stop
      // homescreen from showing up briefly when it's turn back on
      // But we still do update() when it's turned back on
      // coz the screen could be turned off by the timer
      // instead of sleep button

      // XXX: the above statement does not really works all the time
      // gaia issue #513

      //if (!e.detail.enabled)
      //  return;
      this.update();
      break;
    default:
      return;
    }
    e.preventDefault();
  }
};

function OnLoad() {
  Gaia.lockScreen = new LockScreen(document.getElementById('lockscreen'));

  var touchables = [
    document.getElementById('notificationsScreen'),
    document.getElementById('statusbar')
  ];
  new NotificationScreen(touchables);
  
  var numCol = (window.innerWidth / 250) > 4 ? Math.floor(window.innerWidth /250) : 3;

  var apps = Gaia.AppManager.loadInstalledApps(function(apps) {
    var appsGrid = new IconGrid('apps', numCol, 3, 2, true);
    for (var n = 0; n < apps.length; ++n) {
      var app = apps[n];
      appsGrid.add(n, app.icon, app.name, 'WindowManager.launch("' + app.url + '")');
    }
    appsGrid.dots = new Dots('dots', 'apps');
    appsGrid.update();

    var favsGrid = new IconGrid('favs', 3, 1, 1, false);
    var slot = 0;
    for (var n = 0; n < apps.length; ++n) {
      if (apps[n].name == 'Dialer' ||
          apps[n].name == 'Messages' ||
          apps[n].name == 'Market') {
        var app = apps[n];
        favsGrid.add(slot++, app.icon, app.name, 'WindowManager.launch("' + app.url + '")');
      }
    }
    favsGrid.update();
  });

  var titlebar = document.getElementById('titlebar');
  window.addEventListener('appopen', function(evt) {
    titlebar.innerHTML = evt.detail;
  });

  window.addEventListener('appclose', function(evt) {
    titlebar.innerHTML = '';
  });

  window.addEventListener('keypress', function(evt) {
    if (evt.keyCode == evt.DOM_VK_F5)
      document.location.reload();
  });

  window.addEventListener('menu', function(evt) {
    toggleSourceViewer(foregroundAppURL());
  });

  changeDisplayState();
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
    var level = battery.level * 100;

    var charging = element.children[1];
    if (battery.charging) {
      charging.hidden = false;
      fuel.className = 'charging';
      fuel.style.minWidth = (level / 5.25) + 'px';
    } else {
      charging.hidden = true;

      fuel.style.minWidth = fuel.style.width = (level / 5.25) + 'px';
      if (level <= 10)
        fuel.className = 'critical';
      else if (level <= 30)
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
