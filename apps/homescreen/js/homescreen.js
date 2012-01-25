/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const SHORTCUTS_HEIGHT = 144;

var displayState;

function showSourceViewer(url) {
  var document = content.document;
  var viewsource = document.getElementById('appViewsource');
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
  var viewsource = content.document.getElementById('appViewsource');
  if (!viewsource)
    return;
  viewsource.style.visibility = 'hidden';
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
        iconGrid.sceneGraph.setViewportTopLeft(
          iconGrid.currentPage * iconGrid.containerWidth + dx, 0, 0);
        this.moved = true;
      }
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
    var small = Math.abs(diffX) < 10;

    var flick = quick && !small;
    var tap = !this.moved && small;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage;
    if (tap) {
      iconGrid.tap(currentPage * iconGrid.containerWidth + startX,
                   touchState.startY);
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 200);
    } else {
      if (Math.abs(diffX) < this.containerWidth / 2)
        iconGrid.setPage(currentPage, 200);
      else
        iconGrid.setPage(currentPage + dir, 200);
    }
  }
};

function Icon(iconGrid, index) {
  this.iconGrid = iconGrid;
  this.index = index;
  this.label = '';
  this.url = '';
}

Icon.prototype = {
  update: function(img, label, url) {
    this.label = label;
    this.url = url;
    var iconGrid = this.iconGrid;
    var iconWidth = iconGrid.iconWidth;
    var iconHeight = iconGrid.iconHeight;
    var border = iconGrid.border;
    var sprite = this.sprite;
    var createSprite = !sprite;
    if (createSprite) {
      var sceneGraph = iconGrid.sceneGraph;
      sprite = new Sprite(iconWidth, iconHeight);
      sprite.icon = this;
      this.sprite = sprite;
    }
    var ctx = sprite.getContext2D();
    ctx.drawImage(img, iconWidth * border, iconHeight * border,
                  iconWidth * (1 - border * 2),
                  iconHeight * (1 - border * 2));
    ctx.font = Math.floor(iconHeight * border * 0.6) + 'pt Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'top';
    ctx.fillText(label, iconWidth / 2, iconHeight - iconHeight * border,
                 iconWidth * 0.9);
    if (createSprite)
      sceneGraph.add(sprite);
    this.reflow();
  },
  // return the X coordinate of the top left corner of a slot
  slotLeft: function() {
    var iconGrid = this.iconGrid;
    return iconGrid.itemBoxWidth * (this.index % iconGrid.columns);
  },
  // return the Y coordinate of the top left corner of a slot
  slotTop: function() {
    var iconGrid = this.iconGrid;
    var slot = this.index % iconGrid.itemsPerPage;
    return Math.floor(slot / iconGrid.columns) * iconGrid.itemBoxHeight;
  },
  reflow: function(duration) {
    var sprite = this.sprite;
    if (!sprite)
      return;
    var iconGrid = this.iconGrid;
    var index = this.index;
    var itemsPerPage = iconGrid.itemsPerPage;
    var page = Math.floor(index / iconGrid.itemsPerPage);
    sprite.setPosition(page * iconGrid.containerWidth + this.slotLeft(),
                       this.slotTop(),
                       duration);
    sprite.setScale(1, duration);

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('pagereflow', true, false, iconGrid.getLastPage() + 1);
    document.dispatchEvent(evt);
  }
};

function IconGrid(canvas, iconWidth, iconHeight, border) {
  this.canvas = canvas;

  this.iconWidth = iconWidth;
  this.iconHeight = iconHeight;
  this.sceneGraph = new SceneGraph(canvas);
  this.border = border || 0.1;
  this.icons = [];
  this.currentPage = 0;
  this.physics = createPhysicsFor(this);

  // update the layout state
  this.reflow(canvas.width, canvas.height, 0);

  // install event handlers
  var events = [
    'touchstart', 'touchmove', 'touchend',
    'contextmenu'
  ];
  events.forEach((function(evt) {
    canvas.addEventListener(evt, this, true);
  }).bind(this));
  window.addEventListener('resize', this, true);
}

IconGrid.prototype = {
  add: function(src, label, url) {
    // Create the icon in the icon grid
    var icons = this.icons;
    var icon = new Icon(this, this.icons.length);
    icon.index = icons.length;
    icons.push(icon);
    // Load the image, sprite will be created when image load is complete
    var img = document.createElement('img');
    img.setAttribute('crossorigin', 'anonymous');
    img.src = src;
    img.label = label;
    img.url = url;
    img.icon = icon;
    img.onload = function() {
      // Update the icon (this will trigger a reflow and a repaint)
      var icon = this.icon;
      icon.update(this, this.label, this.url);
    }
    return icon;
  },
  remove: function(icon) {
    this.icons.splice(icon.index);
    if (icon.sprite)
      sceneGraph.remove(icon.sprite);
  },
  // reflow the icon grid
  reflow: function(width, height, duration) {
    // first recalculate all the layout information
    this.containerWidth = width;
    this.containerHeight = height;
    this.panelWidth = this.containerWidth;
    this.pageIndicatorWidth = this.containerWidth;
    this.pageIndicatorHeight =
      Math.min(Math.max(this.containerHeight * 0.7, 14), 20);
    this.panelHeight = this.containerHeight - this.pageIndicatorHeight;
    this.columns = Math.floor(this.panelWidth / this.iconWidth);
    this.rows = Math.floor(this.panelHeight / this.iconHeight);
    this.itemsPerPage = this.rows * this.columns;
    this.itemBoxWidth = Math.floor(this.panelWidth / this.columns);
    this.itemBoxHeight = Math.floor(this.panelHeight / this.rows);

    // switch to the right page
    this.setPage(this.currentPage, duration);

    // now reflow all the icons
    var icons = this.icons;
    for (var n = 0; n < icons.length; ++n)
      icons[n].reflow(duration);
  },
  // get last page with an icon
  getLastPage: function() {
    var itemsPerPage = this.itemsPerPage;
    var lastPage =
      Math.floor((this.icons.length + (itemsPerPage - 1)) / itemsPerPage);
    if (lastPage > 0)
      --lastPage;
    return lastPage;
  },
  // switch to a different page
  setPage: function(page, duration) {
    page = Math.max(0, page);
    page = Math.min(page, this.getLastPage());
    this.sceneGraph.setViewportTopLeft(this.containerWidth * page, 0, duration);
    this.currentPage = page;

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('pagechange', true, false, page + 1);
    document.dispatchEvent(event);
  },
  // process a computed tap at the given scene-graph coordinates
  tap: function(x, y) {
    this.sceneGraph.forHit(
      x, y,
      function(sprite) {
        Gaia.AppManager.launch(sprite.icon.url);
      });
  },
  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'touchstart':
      this.canvas.setCapture(false);
      physics.onTouchStart(e.touches ? e.touches[0] : e);
      break;
    case 'touchmove':
      physics.onTouchMove(e.touches ? e.touches[0] : e);
      break;
    case 'contextmenu':
      var sourceURL = window.document.URL;
      showSourceViewer(sourceURL);
      document.releaseCapture();
      physics.touchState.active = false;
      break;
    case 'touchend':
      document.releaseCapture();
      physics.onTouchEnd(e.changedTouches ? e.changedTouches[0] : e);
      break;
    case 'resize':
      var canvas = this.canvas;
      var width = canvas.width = window.innerWidth;
      // TODO Substract the height of the statusbar
      var height = canvas.height = window.innerHeight - 37 - SHORTCUTS_HEIGHT;
      this.sceneGraph.blitter.viewportWidth = width;
      this.sceneGraph.blitter.viewportHeight = height;
      this.reflow(width, height, 0);
      break;
    default:
      return;
    }
    e.preventDefault();
  }
};

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
    this.onTouchMove({ pageY: e.pageY + 20 });
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
  events: [
    'touchstart', 'touchmove', 'touchend'
  ],
  attachEvents: function ns_attachEvents(view) {
    this.events.forEach((function(evt) {
      window.addEventListener(evt, this, true);
    }).bind(this));
  },
  detachEvents: function ns_detachEvents() {
    this.events.forEach((function(evt) {
      window.removeEventListener(evt, this, true);
    }).bind(this));
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
      this.onTouchStart(evt.touches ? evt.touches[0] : evt);
      break;
    case 'touchmove':
      if (!this.active)
        return;

      this.onTouchMove(evt.touches ? evt.touches[0] : evt);
      break;
    case 'touchend':
      if (!this.active)
        return;
      this.active = false;

      document.releaseCapture();
      this.onTouchEnd(evt.changedTouches ? evt.changedTouches[0] : evt);
      break;
    default:
      return;
    }

    evt.preventDefault();
  }
};

function LockScreen(overlay) {
  this.overlay = overlay;
  var events = [
    'touchstart', 'touchmove', 'touchend'
  ];
  events.forEach((function(evt) {
    overlay.addEventListener(evt, this, true);
  }).bind(this));
}

LockScreen.prototype = {
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
  },
  handleEvent: function(e) {
    hideSourceViewer();

    switch (e.type) {
    case 'touchstart':
      this.onTouchStart(e.touches ? e.touches[0] : e);
      this.overlay.setCapture(false);
      break;
    case 'touchmove':
      this.onTouchMove(e.touches ? e.touches[0] : e);
      break;
    case 'touchend':
      this.onTouchEnd(e.changedTouches ? e.changedTouches[0] : e);
      document.releaseCapture();
      break;
    default:
      return;
    }
    e.preventDefault();
  }
};

function OnLoad() {
  var lockScreen = new LockScreen(document.getElementById('lockscreen'));
  var request = window.navigator.mozSettings.get('lockscreen.enabled');
  request.addEventListener('success', function onsuccess(evt) {
    if (request.result.value === 'true')
      lockScreen.lock();
    else
      lockScreen.unlock(-1);
  });

  request.addEventListener('error', function onerror(evt) {
    lockScreen.lock();
  });

  var touchables = [
    document.getElementById('notificationsScreen'),
    document.getElementById('statusbar')
  ];
  new NotificationScreen(touchables);

  var apps = Gaia.AppManager.getInstalledApps(function(apps) {
    // XXX this add 5 times the same set of icons
    var icons = [];
    for (var i = 0; i < 5; i++)
      for (var n = 0; n < apps.length; ++n)
        icons.push(apps[n]);

    var screen = document.getElementById('screen');
    var screenRect = screen.getBoundingClientRect();
    var screenWidth = screenRect.right - screenRect.left;
    var screenHeight = screenRect.bottom - screenRect.top;
    var canvas = document.getElementById('homeCanvas');
    var width = canvas.width = screenWidth;
    var height = canvas.height = screenHeight - 37 - SHORTCUTS_HEIGHT;

    var iconGrid = new IconGrid(canvas, 120, 120, 0.2);
    for (var n = 0; n < icons.length; ++n) {
      var icon = icons[n];
      iconGrid.add(icon.icon, icon.name, icon.url);
    }

    // Create the main shortcuts
    var reload = {
      action: 'document.location.reload()',
      icon: 'style/images/reload.png'
    };
    var currentShortcuts = ['Dialer', 'Messages', 'Market', reload];
    for (var n = 0; n < icons.length; ++n) {
      var icon = icons[n];
      var index = currentShortcuts.indexOf(icon.name);
      if (index < 0)
        continue;

      icon.action = 'Gaia.AppManager.launch(\'' + icon.url + '\')';
      currentShortcuts.splice(index, 1, icon);
    }

    var shortcuts = '';
    for (var n = 0; n < currentShortcuts.length; ++n) {
      var shortcut = currentShortcuts[n];
      var src = shortcut.icon;
      var action = shortcut.action;
      shortcuts += '<span class="shortcut" onclick="' + action + '">' +
                   '  <img class="shorcut-image" src="' + src + '"></img>' +
                   '</span>';
    }
    document.getElementById('home-shortcuts').innerHTML = shortcuts;
  });
  Gaia.AppManager.init();

  var pagesContainer = document.getElementById('home-pages');
  document.addEventListener('pagechange', function(evt) {
    var pages = pagesContainer.childNodes;
    for (var n = 0; n < pages.length; n++)
      delete pages[n].dataset.active;
    pages[evt.detail - 1].dataset.active = 'true';
  });

  document.addEventListener('pagereflow', function(evt) {
    var pages = '';
    var pagesCount = evt.detail;
    for (var n = 0; n < pagesCount; n++) {
      pages += '<span class="home-page">' +
               '  <div></div>' +
               '</span>';
    }
    pagesContainer.innerHTML = pages;
    pagesContainer.firstChild.dataset.active = 'true';
  });

  var titlebar = document.getElementById('titlebar');
  window.addEventListener('appopen', function(evt) {
    titlebar.innerHTML = evt.detail;
  });

  window.addEventListener('appclose', function(evt) {
    titlebar.innerHTML = '';
  });
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

