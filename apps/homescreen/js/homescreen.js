/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The appscreen is the main part of the homescreen: the part that
// displays icons that launch all of the installed apps.
var appscreen = new AppScreen();

/* === AppScreen === */
function AppScreen() {
  this.installedApps = {};

  var self = this;
  navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
    var apps = e.target.result;

    var lastSlash = new RegExp(/\/$/);
    var currentHost = document.location.toString().replace(lastSlash, '');
    apps.forEach(function(app) {
      if (app.origin.replace(lastSlash, '') == currentHost)
        return;
      self.installedApps[app.origin] = app;
    });

    self.build();
  };

  window.addEventListener('resize', function resize() {
    self.grid.update();
  });

  // Listen for app installations and rebuild the appscreen when we get one
  navigator.mozApps.mgmt.oninstall = function install(event) {
    var newapp = event.application;
    self.installedApps[newapp.origin] = newapp;
    self.build(true);
  };

  // Do the same for uninstalls
  navigator.mozApps.mgmt.onuninstall = function uninstall(event) {
    var newapp = event.application;
    delete self.installedApps[newapp.origin];
    self.build(true);
  };
}

// Look up the app object for a specified app origin
AppScreen.prototype.getAppByOrigin = function getAppByOrigin(origin) {
  return this.installedApps[origin];
};

// Populate the appscreen with icons. The constructor automatically calls this.
// But we also call it when new apps are installed or when the locale changes.
AppScreen.prototype.build = function(rebuild) {
  var startpage = 0;

  if (rebuild && 'grid' in this) {
    // Remember the page we're on so that after rebuild we can stay there.
    startpage = this.grid.currentPage;

    document.body.innerHTML = '<div id="home">' +
                              '  <div id="apps"></div>' +
                              '  <div id="dots"></div>' +
                              '</div>';
  }
  else if (this.grid) {
    // XXX: FIXME: I don't know why this is necessary but without it
    // we're getting two copies of the listeners
    this.grid.container.removeEventListener('mousedown', this.grid);
    this.grid.container.removeEventListener('mousemove', this.grid);
    this.grid.container.removeEventListener('mouseup', this.grid);
  }

  // Create the widgets
  this.grid = new IconGrid('apps');
  this.grid.dots = new Dots('dots', 'apps');

  // The current language for localizing app names
  for (var origin in this.installedApps) {
    var app = this.installedApps[origin];

    // Most apps will host their own icons at their own origin.
    // If no icon is defined we'll get this undefined one.
    var icon = 'http://' + document.location.host + '/style/icons/Unknown.png';
    if (app.manifest.icons) {
      if ('120' in app.manifest.icons) {
        icon = app.manifest.icons['120'];
      } else {
        // Get all sizes
        var sizes = Object.keys(app.manifest.icons).map(parseInt);
        // Largest to smallest
        sizes.sort(function(x, y) { return y - x; });
        icon = app.manifest.icons[sizes[0]];
      }
    }

    // If the icons is a fully-qualifed URL, leave it alone
    // (technically, manifests are not supposed to have those)
    // Otherwise, prefix with the app origin
    if (icon.indexOf(':') == -1) {
      // XXX it looks like the homescreen can't load images from other origins
      // so use the ones from the url host for now
      // icon = app.origin + icon;
      icon = 'http://' + document.location.host + icon;
    }

    // Localize the app name
    var name = app.manifest.name;
    var lang = document.mozL10n.language.code;
    if (app.manifest.locales &&
        app.manifest.locales[lang] &&
        app.manifest.locales[lang].name)
      name = app.manifest.locales[lang].name;

    this.grid.add(icon, name, origin);
  }

  this.grid.update();
  this.grid.setPage(startpage);
};

function DefaultPhysics(iconGrid) {
  this.iconGrid = iconGrid;
  this.moved = false;
  this.touchState = {
    active: false,
    startX: 0,
    startY: 0,
    timer: null,
    initialTarget: null
  };
}

// How long do you have to hold your finger still over an icon
// before triggering an uninstall rather than a launch.
DefaultPhysics.HOLD_INTERVAL = 1000;
// How many pixels can you move your finger before a tap becomes
// a flick or a pan?
DefaultPhysics.SMALL_MOVE = 20;
// How long can your finger be on the screen before a flick becomes a pan?
DefaultPhysics.FLICK_TIME = 200;

DefaultPhysics.prototype = {
  onTouchStart: function(e) {
    var touchState = this.touchState;
    touchState.active = true;
    touchState.startTime = e.timeStamp;
    touchState.startX = e.pageX;
    touchState.startY = e.pageY;

    // If this timer triggers and the user hasn't moved their finger
    // then this is a hold rather than a tap.
    touchState.timer = window.setTimeout(this.onHoldTimeout.bind(this),
                                  DefaultPhysics.HOLD_INTERVAL);

    // For tap and hold gestures, we keep track of what icon
    // the touch started on. Even if it strays slightly into another
    // nearby icon, the initial touch is probably what the user wanted.
    touchState.initialTarget = e.target;
  },

  onTouchMove: function(e) {
    var touchState = this.touchState;

    // If we move more than a small amount this is not a hold, so
    // cancel the timer if it is still running
    if (touchState.timer &&
        (Math.abs(touchState.startX - e.pageX) > DefaultPhysics.SMALL_MOVE ||
         Math.abs(touchState.startX - e.pageX) > DefaultPhysics.SMALL_MOVE)) {
      clearTimeout(touchState.timer);
      touchState.timer = null;
    }

    if (!touchState.active)
      return;

    this.iconGrid.pan(-(touchState.startX - e.pageX));
    e.stopPropagation();
  },

  onTouchEnd: function(e) {
    var touchState = this.touchState;

    // If the timer hasn't triggered yet, cancel it before it does
    if (touchState.timer) {
      clearTimeout(touchState.timer);
      touchState.timer = null;
    }

    if (!touchState.active)
      return;
    touchState.active = false;

    var startX = touchState.startX;
    var endX = e.pageX;
    var diffX = endX - startX;
    var dir = (diffX > 0) ? -1 : 1;
    if (document.dir == 'rtl')
      dir = -dir;

    var quick = (e.timeStamp - touchState.startTime <
                 DefaultPhysics.FLICK_TIME);
    var small = Math.abs(diffX) <= DefaultPhysics.SMALL_MOVE;

    var flick = quick && !small;
    var tap = small;
    var drag = !quick;

    var iconGrid = this.iconGrid;
    var currentPage = iconGrid.currentPage;
    if (tap) {
      iconGrid.tap(touchState.initialTarget);
      iconGrid.setPage(currentPage, 0);
      return;
    } else if (flick) {
      iconGrid.setPage(currentPage + dir, 0.2);
    } else { // drag
      if (Math.abs(diffX) < window.innerWidth / 2)
        iconGrid.setPage(currentPage, 0.2);
      else
        iconGrid.setPage(currentPage + dir, 0.2);
    }
    e.stopPropagation();
  },

  // Triggered if the user holds their finger on the screen for
  // DefaultPhysics.HOLD_INTERVAL ms without moving more than
  // DefaultPhyiscs.SMALL_MOVE pixels horizontally or vertically
  onHoldTimeout: function() {
    var touchState = this.touchState;
    touchState.timer = null;
    touchState.active = false;
    this.iconGrid.hold(touchState.initialTarget);
  }
};

function IconGrid(containerId) {
  this.containerId = containerId;
  this.container = document.getElementById(containerId);
  this.icons = [];
  this.currentPage = 0;
  this.physics = new DefaultPhysics(this);

  // install event handlers
  this.container.addEventListener('mousedown', this);
  this.container.addEventListener('mousemove', this);
  this.container.addEventListener('mouseup', this);
}

IconGrid.prototype = {
  add: function(iconUrl, label, action) {
    var icons = this.icons;
    var icon = { iconUrl: iconUrl, label: label, action: action };
    icon.index = icons.length;
    icons.push(icon);
  },

  remove: function(icon) {
    this.icons.splice(icon.index);
  },

  // reflow the icon grid
  update: function() {
    var container = this.container;
    var icons = this.icons;

    // get pages divs
    var pages = [];
    var rule = '#' + this.containerId + '> .page';
    var children = document.querySelectorAll(rule);
    for (var n = 0; n < children.length; n++) {
      var element = children[n];
      pages[element.id] = element;
    }

    // get icon divs
    var iconDivs = [];

    rule = '#' + this.containerId + '> .page > .icon';
    children = document.querySelectorAll(rule);
    for (var n = 0; n < children.length; n++) {
      var element = children[n];
      iconDivs[element.id] = element;
    }

    // issue #723 - The calculation of the width/height of the icons
    // should be dynamic and not hardcoded like that. The reason why it
    // it is done like that at this point is because there is no icon
    // when the application starts and so there is nothing to calculate
    // against.
    container.style.minHeight = container.style.maxHeight = '';
    var iconHeight = 196;
    var iconWidth = 132;

    var rect = container.getBoundingClientRect();
    var rows = Math.max(1, Math.floor(rect.height / iconHeight));
    var columns = Math.max(1, Math.floor(rect.width / iconWidth));

    var targetHeight = iconHeight * rows + 'px';
    container.style.minHeight = container.style.maxHeight = targetHeight;

    // adjust existing pages and create new ones as needed
    var itemsPerPage = rows * columns;
    var pageCount = Math.ceil(icons.length / itemsPerPage);
    for (var n = 0; n < pageCount; n++) {
      var page = pages[n];
      if (page)
        continue;

      page = document.createElement('div');
      page.id = n;
      page.className = 'page';
      container.appendChild(page);

      pages[n] = page;
    }

    // remove pages we don't need
    for (var key in pages) {
      if (key >= pageCount) {
        container.removeChild(pages[key]);
        pages[key] = null;
      }
    }


    // adjust existing icons and create new ones as needed
    var iconsCount = icons.length;
    for (var n = 0; n < iconsCount; ++n) {
      var icon = icons[n];

      var iconDiv = iconDivs[n];
      if (!iconDiv) { // missing icon
        iconDiv = document.createElement('div');
        iconDiv.id = n;
        iconDiv.className = 'icon';
        iconDiv.style.backgroundImage = 'url("' + icon.iconUrl + '")';
        iconDiv.dataset.url = icon.action;

        var centerDiv = document.createElement('div');
        centerDiv.className = 'img';
        iconDiv.appendChild(centerDiv);

        var labelDiv = document.createElement('div');
        labelDiv.className = 'label';
        iconDiv.appendChild(labelDiv);

        if (labelDiv.textContent != icon.label)
          labelDiv.textContent = icon.label;

        iconDivs[n] = iconDiv;
      }

      var pageOfIcon = Math.floor(n / itemsPerPage);
      pages[pageOfIcon].appendChild(iconDiv);
    }

    // remove icons we don't need
    for (var key in iconDivs) {
      if (key > iconsCount) {
        iconDivs[key].parentNode.removeChild(iconDivs[key]);
        iconDivs[key] = null;
      }
    }

    // update paginator, if we have one
    var dots = this.dots;
    if (dots)
      dots.update(this.currentPage);
  },

  pan: function(x, duration) {
    var pages = this.container.childNodes;
    var currentPage = this.currentPage;
    for (var n = 0; n < pages.length; ++n) {
      var page = pages[n];

      var calc = (document.dir == 'ltr') ?
        (n - currentPage) + '00% + ' + x + 'px' :
        (currentPage - n) + '00% + ' + x + 'px';

      var style = page.style;
      style.MozTransform = 'translateX(-moz-calc(' + calc + '))';
      style.MozTransition = duration ? ('all ' + duration + 's ease;') : '';
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
      var p = (document.dir == 'ltr') ? (n - number) : (number - n);
      style.MozTransform = 'translateX(' + p + '00%)';
      style.MozTransition = duration ? ('all ' + duration + 's ease') : '';
    }
    var dots = this.dots;
    if (dots)
      dots.update(number);
  },
  tap: function(target) {
    var app = appscreen.getAppByOrigin(target.dataset.url);
    app.launch();
  },
  hold: function(target) {
    var app = appscreen.getAppByOrigin(target.dataset.url);

    // FIXME: localize this message
    // FIXME: This could be a simple confirm() (see bug 741587)
    requestPermission(
      'Do you want to uninstall ' + app.manifest.name + '?',
      function() { app.uninstall(); },
      function() { }
    );
  },
  handleEvent: function(e) {
    var physics = this.physics;
    switch (e.type) {
    case 'mousedown':
      physics.onTouchStart(e);
      break;
    case 'mousemove':
      physics.onTouchMove(e);
      break;
    case 'mouseup':
      physics.onTouchEnd(e);
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
      dot.className = 'dot';
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
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    }
  }
};

