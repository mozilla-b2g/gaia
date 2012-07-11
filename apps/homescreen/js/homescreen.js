
'use strict';

const Homescreen = (function() {

  var threshold = window.innerWidth / 3;

  /*
   * This component deals with the transitions between landing and grid pages
   */
  var ViewController = {

    /*
     * Initializes the component
     *
     * @param {Object} The homescreen container
     */
    init: function vw_init(container) {
      this.currentPage = 0;
      this.pages = container.children;
      this.total = this.pages.length;
      container.addEventListener('mousedown', this);
    },

    /*
     * Navigates to a section given the number
     *
     * @param {int} number of the section
     *
     * @param {int} duration of the transition
     */
    navigate: function vw_navigate(number, duration) {
      var total = this.total;
      for (var n = 0; n < total; n++) {
        var page = this.pages[n];
        var style = page.style;
        style.MozTransform = 'translateX(' + (n - number) + '00%)';
        style.MozTransition = duration ? ('all ' + duration + 's ease') : '';
      }
      this.currentPage = number;
      PaginationBar.update(number);
    },

    /*
     * Implements the transition of sections following the finger
     *
     * @param {int} x-coordinate
     *
     * @param {int} duration of the transition
     */
    pan: function vw_pan(x, duration) {
      var currentPage = this.currentPage;
      var total = this.total;
      for (var n = 0; n < total; n++) {
        var page = this.pages[n];
        var calc = (n - currentPage) * 100 + '% + ' + x + 'px';
        var style = page.style;
        style.MozTransform = 'translateX(-moz-calc(' + calc + '))';
        style.MozTransition = duration ? ('all ' + duration + 's ease') : '';
      }
    },

    /*
     * Event handling for the homescreen
     *
     * @param {Object} The event object from browser
     */
    handleEvent: function vw_handleEvent(evt) {
      switch (evt.type) {
        case 'mousedown':
          this.onStart(evt);
          break;
        case 'mousemove':
          this.onMove(evt);
          break;
        case 'mouseup':
          this.onEnd(evt);
          break;
      }
    },

    /*
     * Listens mousedown events
     *
     * @param {Object} the event
     */
    onStart: function vw_onStart(evt) {
      evt.preventDefault();
      this.startX = evt.pageX;
      window.addEventListener('mousemove', this);
      window.addEventListener('mouseup', this);
    },

    /*
     * Listens mousemove events
     *
     * @param {Object} the event
     */
    onMove: function vw_onMove(evt) {
      this.pan(-(this.startX - evt.pageX), 0);
    },

    /*
     * Listens mouseup events
     *
     * @param {Object} the event
     */
    onEnd: function vw_onEnd(evt) {
      window.removeEventListener('mousemove', this);
      window.removeEventListener('mouseup', this);
      var diffX = evt.pageX - this.startX;
      var dir = 0; // Keep the position
      if (diffX > threshold && this.currentPage > 0) {
        dir = -1; // Previous
      } else if (diffX < -threshold && this.currentPage < this.total - 1) {
        dir = 1; // Next
      }
      this.navigate(this.currentPage + dir, 0.2);
    }
  };

  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');

  PaginationBar.init('.paginationScroller');
  Search.init(domain);

  function initUI() {
    DockManager.init(document.querySelector('#footer'));
    GridManager.init('.apps', function gm_init() {
      PaginationBar.update(0);
      PaginationBar.show();
      ViewController.init(document.querySelector('#content'));
    });
  }

  function start() {
    if (Applications.isReady()) {
      initUI();
    } else {
      Applications.addEventListener('ready', initUI);
    }
  }

  HomeState.init(function success(onUpgradeNeeded) {
    if (onUpgradeNeeded) {
      // First time the database is empty -> Dock by default
      var appsInDockByDef = ['browser', 'dialer', 'music', 'gallery'];
      appsInDockByDef = appsInDockByDef.map(function mapApp(name) {
        return 'http://' + name + '.' + domain;
      });
      HomeState.saveShortcuts(appsInDockByDef, start, start);
    } else {
      start();
    }
  }, start);

  // XXX Currently the home button communicate only with the
  // system application. It should be an activity that will
  // use the system message API.
  window.addEventListener('message', function onMessage(e) {
    switch (e.data) {
      case 'home':
        if (GridManager.isEditMode()) {
          GridManager.setMode('normal');
          Permissions.hide();
        } else if (ViewController.currentPage > 0) {
          GridManager.goTo(0, function finish() {
            ViewController.navigate(0, 0.2);
          });
        }
        break;
    }
  });

  // Listening for installed apps
  Applications.addEventListener('install', function oninstall(app) {
    GridManager.install(app, true);
  });

  // Listening for uninstalled apps
  Applications.addEventListener('uninstall', function onuninstall(app) {
    GridManager.uninstall(app);
  });

  return {
    /*
     * Displays the contextual menu given an origin
     *
     * @param {String} the app origin
     */
    showAppDialog: function showAppDialog(origin) {
      // FIXME: localize this message
      var app = Applications.getByOrigin(origin);
      var title = 'Remove ' + app.manifest.name;
      var body = 'This application will be uninstalled fully from your mobile';
      Permissions.show(title, body,
                       function onAccept() { app.uninstall() },
                       function onCancel() {});
    }
  };
})();
