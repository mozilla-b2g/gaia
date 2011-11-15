/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const kAutoUnlock = false;

var displayState;

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

    if (!this.moved && long) {
      var doc = e.target.ownerDocument || window.document;
      var url = doc.URL;

      var viewsource = document.getElementById('viewsource');
      viewsource.style.visibility = 'visible';
      viewsource.src = 'view-source: ' + url;
      return;
    }

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage
    if (tap) {
      iconGrid.tap(currentPage * iconGrid.containerWidth + startX,
                   touchState.startY);
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 200);
    } else {
      if (Math.abs(diffX) < this.containerWidth/2)
        iconGrid.setPage(currentPage, 200);
      else
        iconGrid.setPage(currentPage + dir, 200);
    }
  }
};

function hideSourceViewer() {
  document.getElementById('viewsource').style.visibility = 'hidden';
}

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
    ctx.fillText(label, iconWidth/2, iconHeight - iconHeight*border, iconWidth*0.9);
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
  }
}

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
    'mousedown', 'mousemove', 'mouseup'
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
    var img = new Image();
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
    this.pageIndicatorHeight = Math.min(Math.max(this.containerHeight * 0.7, 14), 20);
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
    var lastPage = Math.floor((this.icons.length + (itemsPerPage - 1)) / itemsPerPage);
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
  },
  // process a computed tap at the given scene-graph coordinates
  tap: function(x, y) {
    this.sceneGraph.forHit(
      x, y,
      function(sprite) {
        WindowManager.open(sprite.icon.url);
      });
  },
  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'touchstart':
    case 'mousedown':
      this.canvas.setCapture(false);
      physics.onTouchStart(e.touches ? e.touches[0] : e);
      break;
    case 'touchmove':
    case 'mousemove':
      physics.onTouchMove(e.touches ? e.touches[0] : e);
      break;
    case 'touchend':
    case 'mouseup':
      document.releaseCapture();
      physics.onTouchEnd(e.touches ? e.touches[0] : e);
      break;
    case 'resize':
      var canvas = this.canvas;
      var width = canvas.width = window.innerWidth;
      // TODO Substract the height of the statusbar
      var height = canvas.height = window.innerHeight - 24;
      this.sceneGraph.blitter.viewportWidth = width;
      this.sceneGraph.blitter.viewportHeight = height;
      this.reflow(width, height, 0);
      break;
    default:
      return;
    }
    e.preventDefault();
  }
}

function NotificationScreen(touchables) {
  this.touchables = touchables;
  this.attachEvents(this.touchable);
};

NotificationScreen.prototype = {
  get touchable() {
    return this.touchables[this.locked ? 0 : 1];
  },
  get screenHeight() {
    return this._screenHeight ||
           (this._screenHeight = this.touchables[0].getBoundingClientRect().height);
  },
  onTouchStart: function(e) {
    this.startX = e.pageX;
    this.startY = e.pageY;
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
    var offset = this.locked ? this.screenHeight + dy
                             : dy;
    if (Math.abs(offset) > this.screenHeight/4)
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
    'touchstart', 'touchmove', 'touchend',
    'mousedown', 'mousemove', 'mouseup'
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
    case 'mousedown':
      if (target != this.touchable)
        return;
      this.active = true;
      
      target.setCapture(this);
      this.onTouchStart(evt.touches ? evt.touches[0] : evt);
      break;
    case 'touchmove':
    case 'mousemove':
      if (!this.active)
        return;

      this.onTouchMove(evt.touches ? evt.touches[0] : evt);
      break;
    case 'touchend':
    case 'mouseup':
      if (!this.active)
        return;
      this.active = false;

      document.releaseCapture();
      this.onTouchEnd(evt.touches ? evt.touches[0] : evt);
      break;
    default:
      return;
    }

    evt.preventDefault();
    hideSourceViewer();
  }
};

function LockScreen(overlay) {
  this.overlay = overlay;
  var events = [
    'touchstart', 'touchmove', 'touchend',
    'mousedown', 'mousemove', 'mouseup'
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
      if (Math.abs(dy) < window.innerHeight/4)
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
    case 'mousedown':
      this.onTouchStart(e.touches ? e.touches[0] : e);
      this.overlay.setCapture(false);
      break;
    case 'touchmove':
    case 'mousemove':
      this.onTouchMove(e.touches ? e.touches[0] : e);
      break;
    case 'touchend':
    case 'mouseup':
      this.onTouchEnd(e.touches ? e.touches[0] : e);
      document.releaseCapture();
      break;
    default:
      return;
    }
    e.preventDefault();
  }
}

function OnLoad() {
  var lockScreen = new LockScreen(document.getElementById('lockscreen'));
  kAutoUnlock ? lockScreen.unlock(-1) : lockScreen.lock();

  var touchables = [
    document.getElementById('notificationsScreen'),
    document.getElementById('statusbar')
  ];
  new NotificationScreen(touchables);

  var apps = Gaia.AppManager.getInstalledApps();

  var icons = [];
  // XXX this add 5 times the same set of icons
  for (var i = 0; i < 5; i++)
    for (var n = 0; n < apps.length; ++n)
      icons.push(apps[n]);

  var screen = document.getElementById('screen');
  var screenRect = screen.getBoundingClientRect();
  var screenWidth = screenRect.right - screenRect.left;
  var screenHeight = screenRect.bottom - screenRect.top;
  var canvas = document.getElementById('homeCanvas');
  var width = canvas.width = screenWidth;
  var height = canvas.height = screenHeight - 24;

  var iconGrid = new IconGrid(canvas, 120, 120, 0.2);
  for (var n = 0; n < icons.length; ++n)
    iconGrid.add(icons[n].icons.size_128, icons[n].name, icons[n].url);

  WindowManager.start();
}

/*var WindowManager = {
  get currentView() {
    var currentFrame = this.windows.lastElementChild;
    return currentFrame ? currentFrame.contentWindow : window;
  },
  get windows() {
    delete this.windows;
    return this.windows = document.getElementById('windows');
  },
  start: function wm_start() {
    window.addEventListener('appclose', this, true);
  },
  stop: function wm_stop() {},
  handleEvent: function wm_handleEvent(evt) {
    switch (evt.type) {
      case 'appclose':
        var windows = this.windows;
        if (windows.childElementCount < 1)
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
            if (windows.childElementCount < 1)
              windows.setAttribute('hidden', 'true');

            setTimeout(function () {
              var previousWindow = windows.lastElementChild || window;
              previousWindow.focus();
            }, 0);
          },
          false);
        break;
      default:
        throw new Error('Unhandled event in WindowManager');
        break;
    }
  },

  // open the application referred to by |url| into a new window, or
  // bring its window to front if already open.
  open: function wm_open(url) {
    Gaia.AppManager.launch(url);
  }
};*/
var WindowManager = {
  get currentView() {
    var currentFrame = this.windows.lastElementChild;
    return currentFrame ? currentFrame.contentWindow : window;
  },
  get windows() {
    delete this.windows;
    return this.windows = document.getElementById('windows');
  },
  activeWindow: null,
  start: function wm_start() {
    window.addEventListener('appclose', this, true);
  },
  stop: function wm_stop() {},
  handleEvent: function wm_handleEvent(evt) {
    switch (evt.type) {
      case 'appclose':
        WindowManager.close();
        break;
      default:
        throw new Error('Unhandled event in WindowManager');
        break;
    }
  },

  // open the application referred to by |url| into a new window, or
  // bring its window to front if already open.
  open: function wm_open(url) {
    WindowManager.activeWindow = Gaia.AppManager.launch(url);
  },
  
  close: function wm_close() {
    var windows = this.windows;
    var activeWindow = WindowManager.activeWindow;
    
    if (!activeWindow) return;
    
    var animationCompleteHandler = function() {
      window.removeEventListener('animationend', animationCompleteHandler, false);
      activeWindow.classList.remove('animateClosing');
      activeWindow.setAttribute('hidden', true);
      windows.setAttribute('hidden', true);
      window.focus();
    };
    
    window.addEventListener('animationend', animationCompleteHandler, false);
    
    activeWindow.classList.add('animateClosing');
  }
};

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
      var level = battery.level * 100;
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
