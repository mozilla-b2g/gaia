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
    self.build(true);
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

  // We can't rebuild the app screen if it hasn't already been build the
  // the first time. This happens when we get an initial language setting
  // observation before we get the initial list of installed apps.
  if (rebuild && !this.grid)
    return;

  // If we're rebuilding, remember the page we're on
  var startpage = rebuild ? this.grid.currentPage : 0;

    var className = editMode ? 'class=\"edit\"' : '';
    document.getElementById('content').innerHTML =
      '<div id="home">' +
      '  <div id="apps" ' + className + '></div>' +
      '  <div id="dots"></div>' +
      '</div>';

  // Create the widgets
  this.grid = new IconGrid('apps');
  this.grid.dots = new Dots('dots', this.grid);

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

    // For tap we keep track of what icon the touch started on.
    // Even if it strays slightly into another nearby icon, the initial
    // touch is probably what the user wanted.
    touchState.initialTarget = e.target;
  },

  onTouchMove: function(e) {
    var touchState = this.touchState;
    if (!touchState.active)
      return;

    this.iconGrid.pan(-(touchState.startX - e.pageX));
    e.stopPropagation();
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
      iconGrid.tap(touchState.initialTarget, e.pageX, e.pageY);
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
  }
};

function IconGrid(containerId) {
  this.container = document.getElementById(containerId);
  this.icons = [];
  this.currentPage = 0;
  this.physics = new DefaultPhysics(this);

  // install event handlers
  this.container.addEventListener('mousedown', this);
  window.addEventListener('mousemove', this);
  window.addEventListener('mouseup', this);
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
    var rule = '#' + container.id + '> .page';
    var children = document.querySelectorAll(rule);
    for (var n = 0; n < children.length; n++) {
      var element = children[n];
      pages[element.id] = element;
    }

    // get icon divs
    var iconDivs = [];

    rule = '#' + container.id + '> .page > .icon';
    children = document.querySelectorAll(rule);
    for (var n = 0; n < children.length; n++) {
      var element = children[n];
      iconDivs[element.id] = element;
    }

    container.style.minHeight = container.style.maxHeight = '';

    var iconHeight = 0;
    var iconWidth = 0;
    if (children.length === 0) {
      var page = document.createElement('div');
      page.className = 'page';

      var icon = document.createElement('div');
      icon.className = 'icon';

      var center = document.createElement('div');
      center.className = 'img';
      icon.appendChild(center);

      var label = document.createElement('div');
      label.className = 'label';
      label.textContent = 'Foo';
      icon.appendChild(label);
      page.appendChild(icon);

      container.appendChild(page);
      var rect = icon.getBoundingClientRect();
      iconWidth = rect.width;
      iconHeight = rect.height;

      var style = window.getComputedStyle(icon, null);
      iconHeight = iconHeight + parseInt(style.marginTop)
                              + parseInt(style.marginBottom);
      iconWidth = iconWidth + parseInt(style.marginLeft)
                            + parseInt(style.marginRight);
      container.removeChild(page);
    } else {
      var rect = children[0].getBoundingClientRect();
      iconWidth = rect.width;
      iconHeight = rect.height;
      var style = window.getComputedStyle(children[0], null);
      iconHeight = iconHeight + parseInt(style.marginTop)
                              + parseInt(style.marginBottom);
      iconWidth = iconWidth + parseInt(style.marginLeft)
                            + parseInt(style.marginRight);
      container.removeChild(page);
    }

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
      page.id = 'page_' + n;
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
        iconDiv.id = 'app_' + n;
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

  length: function() {
    return this.container.childNodes.length;
  },

  tap: function(target, x, y) {
    if (!('url' in target.dataset)) {
      return;
    }

    var app = appscreen.getAppByOrigin(target.dataset.url);
    if (!editMode) {
      app.launch();
      return;
    }

    // If the click happens in the top-right corner in edit-mode, this is
    // to uninstall the application.
    var rect = target.getBoundingClientRect();
    if (x > rect.left + rect.width - 20 &&
        x < rect.left + rect.width + 20 &&
        y > rect.top - 20 && y < rect.top + 20) {
      app.uninstall();
    }
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
    case 'contextmenu':
      physics.touchState.active = false;
      break;
    default:
      return;
    }
  }
};

function Dots(containerId, grid) {
  this.containerId = containerId;
  this.container = document.getElementById(containerId);
  this.grid = grid;
}

Dots.prototype = {
  update: function(current) {
    var container = this.container;
    var grid = this.grid;
    var numPages = grid.length();

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

      dot.addEventListener('click', this);
    }
  },

  click: function(e) {
    var childNodes = this.container.childNodes;
    var length = childNodes.length;

    for (var n = 0; n < length; ++n) {
      var dot = childNodes[n];
      if (dot == e.target) {
        this.grid.setPage(n, 0.2);
        break;
      }
    }
  },

  handleEvent: function(e) {
    switch (e.type) {
    case 'click':
      this.click(e);
      break;
    default:
      return;
    }
    e.preventDefault();
  }
};
