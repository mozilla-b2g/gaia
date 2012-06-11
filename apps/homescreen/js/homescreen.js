/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The appscreen is the main part of the homescreen: the part that
// displays icons that launch all of the installed apps.
var appscreen = null;
navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
  appscreen = new AppScreen(e.target.result);
  shortcuts = new Shortcuts(e.target.result);

  // Appscreen ready, now settings
  SettingsListener.observe('language.current', 'en-US', function(value) {
    document.mozL10n.language.code = value;
    document.documentElement.lang = document.mozL10n.language.code;
    document.documentElement.dir = document.mozL10n.language.direction;

    appscreen.build(true);
    shortcuts.build();
  });

  SettingsListener.observe('homescreen.wallpaper', 'default.png',
    function(value) {
      document.getElementById('home').style.backgroundImage =
        'url(style/backgrounds/' + value + ')';
    }
  );
};

function AppScreen(apps) {
  var installedApps = this.installedApps = {};

  // Create an inner built-in list of installed apps
  var lastSlash = new RegExp(/\/$/);
  var currentHost = document.location.toString().replace(lastSlash, '');
  apps.forEach(function(app) {
    // Ignore the homescreen application itself
    if (app.origin.replace(lastSlash, '') == currentHost)
      return;

    // XXX: Ignoring apps without an icon
    if (!app.manifest.icons)
      return;

    installedApps[app.origin] = app;
  });

  navigator.mozApps.mgmt.oninstall = onInstall.bind(this);
  navigator.mozApps.mgmt.onuninstall = onUninstall.bind(this);
  window.addEventListener('resize', this.build.bind(this, true));

  function onInstall(e) {
    var app = e.application;
    installedApps[app.origin] = app;

    // Caching the icon
    var appCache = window.applicationCache;
    if (appCache) {
      var icons = app.manifest.icons;
      if (icons) {
        Object.getOwnPropertyNames(icons).forEach(function iconIterator(key) {
          var url = app.origin + icons[key];
          appCache.mozAdd(url);
        });
      }
    }
    this.build(true);
  };

  function onUninstall(e) {
    // TODO: remove the icon of the app from the cache
    // but currently e.application.manifest is null :/

    delete installedApps[e.application.origin];
    this.build(true);
  };

  this.build();
}

AppScreen.prototype = {
  // Look up the app object for a specified app origin
  getAppByOrigin: function getAppByOrigin(origin) {
    return this.installedApps[origin];
  },

  build: function build(rebuild) {
    // We can't rebuild the app screen if it hasn't already been build the
    // the first time. This happens when we get an initial language setting
    // observation before we get the initial list of installed apps.
    if (rebuild && !this.grid)
      return;

    // If we're rebuilding, remember the page we're on
    var startpage = rebuild ? this.grid.currentPage : 0;

    var className = isInEditMode() ? 'class=\"edit\"' : '';
    document.getElementById('content').innerHTML =
      '<div id="home">' +
      '  <div id="apps" ' + className + '></div>' +
      '  <div id="dots"></div>' +
      '</div>';

    // domain is used to support XXX below
    var domain = '';
    if (document.location.protocol !== 'file:') {
      var host = document.location.host;
      var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
    }

    var apps = [];
    for (var origin in this.installedApps) {
      var app = this.installedApps[origin];

      // Most apps will host their own icons at their own origin.
      // If no icon is defined we'll get this undefined one.
      var icon = '';
      if ('120' in app.manifest.icons) {
        icon = app.manifest.icons['120'];
      } else {
        // Get all sizes
        var sizes = Object.keys(app.manifest.icons).map(function parse(str) {
          return parseInt(str, 10);
        });
        // Largest to smallest
        sizes.sort(function(x, y) { return y - x; });
        icon = app.manifest.icons[sizes[0]];
      }


      // If the icons is a fully-qualifed URL, leave it alone
      // (technically, manifests are not supposed to have those)
      // Otherwise, prefix with the app origin
      if (icon.indexOf(':') == -1) {
        icon = app.origin + icon;
      }

      // Translate the application name
      var name = app.manifest.name;
      var lang = document.mozL10n.language.code;
      if (app.manifest.locales && app.manifest.locales[lang])
        name = app.manifest.locales[lang].name || name;

      apps.push({ 'icon': icon, 'name': name, 'origin': origin });
    }

    // Initialize the main grid view
    var grid = this.grid = new IconGrid('apps');
    grid.dots = new Dots('dots', this.grid);

    apps.forEach(function(app) {
      grid.add(app.icon, app.name, app.origin);
    });

    grid.update();
    grid.setPage(startpage);
  }
};

// XXX: Hard-coded selection of apps for shortcuts
function Shortcuts(apps) {
  var shortcuts = ['Dialer', 'Messages', 'Market', 'Browser'];

  var shortcutApps = this.shortcutApps = [];

  apps.forEach(function(app) {
    if (shortcuts.indexOf(app.manifest.name) == -1)
      return;

    shortcutApps[shortcuts.indexOf(app.manifest.name)] = app;
  });

  this.build();
}

Shortcuts.prototype = {
  build: function() {
    var shortcuts = document.getElementById('shortcuts');

    this.shortcutApps.forEach(function addShortcut(app) {
      // Most apps will host their own icons at their own origin.
      // If no icon is defined we'll get this undefined one.
      var icon = '';
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
        icon = app.origin + icon;
      }

      // Translate the application name
      var name = app.manifest.name;
      var lang = document.mozL10n.language.code;
      if (app.manifest.locales && app.manifest.locales[lang])
        name = app.manifest.locales[lang].name || name;

      var iconDiv = document.createElement('div');
      iconDiv.className = 'shortcut';
      iconDiv.onclick = function() {
        app.launch();
      };
      iconDiv.innerHTML = '<img src="' + icon + '" />' +
        '<span>' + name + '</span>';

      shortcuts.appendChild(iconDiv);
    });
  }
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

  this.container.addEventListener('mousedown', this);
  window.addEventListener('mousemove', this);
  window.addEventListener('mouseup', this);
}

IconGrid.prototype = {
  add: function add(iconUrl, label, action) {
    var icons = this.icons;
    var icon = { iconUrl: iconUrl, label: label, action: action };
    icon.index = icons.length;
    icons.push(icon);
  },

  remove: function remove(icon) {
    this.icons.splice(icon.index);
  },

  // reflow the icon grid
  update: function update() {
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

    function getIconSize(icon) {
      var rect = icon.getBoundingClientRect();
      var width = rect.width;
      var height = rect.height;

      var style = window.getComputedStyle(icon, null);
      height += parseInt(style.marginTop) + parseInt(style.marginBottom);
      width += parseInt(style.marginLeft) + parseInt(style.marginRight);
      return { 'width': width, 'height': height };
    }

    var size = null;
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
      size = getIconSize(icon);
      container.removeChild(page);
    } else {
      size = getIconSize(children[0]);
    }

    var iconHeight = size.height;
    var iconWidth = size.width;

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
        // The icon size of 79x79 px is hardcoded in homescreen.css
        // Keep both in sync !
        iconDiv.style.backgroundSize = '79px, 79px';
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

  pan: function pan(x, duration) {
    var pages = this.container.childNodes;
    var currentPage = this.currentPage;
    for (var n = 0; n < pages.length; ++n) {
      var page = pages[n];

      var translate = (document.dir == 'ltr') ?
        (n - currentPage) + '00% + ' + x + 'px' :
        (currentPage - n) + '00% + ' + x + 'px';

      var style = page.style;
      style.MozTransform = 'translateX(-moz-calc(' + translate + '))';
      style.MozTransition = duration ? ('all ' + duration + 's ease;') : '';
    }
  },

  setPage: function setPage(number, duration) {
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

  length: function length() {
    return this.container.childNodes.length;
  },

  tap: function tap(target, x, y) {
    if (!('url' in target.dataset)) {
      return;
    }

    var app = appscreen.getAppByOrigin(target.dataset.url);
    if (!isInEditMode()) {
      if (!app.launch) {
        window.open(app.origin);
        return;
      }

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
  handleEvent: function handleEvent(e) {
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
