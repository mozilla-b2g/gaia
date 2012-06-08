/*
 *  Module: Homescreen
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author Cristian Rodriguez
 *
 */
var owd = window.owd || {};

if (!owd.Homescreen) {

  (function(doc) {
    'use strict';

    const HOMESCREEN_TEF = owdConfig.homescreen === 'TEF';

    // Initializating the components: strip & grid
    if (HOMESCREEN_TEF) {
      owdStrip.ui.init();
    }

    var grid = owd.GridManager;

    owd.PaginationBar.init('.paginationScroller');
    grid.init('.apps');

    var mode = 'normal';
    var footer = doc.querySelector('#footer');
    grid.onEditModeChange = function (value) {
      footer.dataset.mode = mode = value;
    }

    // Listening for keys
    window.addEventListener('keyup', function(e) {
      // Click on the Home button to reset the mode of the grid
      if (e.keyCode === e.DOM_VK_HOME) {
        permission.destroy();
        owd.GridManager.setMode('normal');
      }
    }, true);

    // Listening for installed apps
    owdAppManager.addEventListener('oninstall', function(app) {
      owd.GridManager.install(app);
    });

    // Listening for uninstalled apps
    navigator.mozApps.mgmt.onuninstall = function uninstall(event) {
      owd.GridManager.uninstall(event.application);
    };

    // Listening for clicks on the footer
    footer.addEventListener('click', function(event) {
      if (mode === 'normal') {
        var dataset2 = event.target.dataset;
        if (dataset2 && typeof dataset2.origin !== 'undefined') {
          owdAppManager.getByOrigin(dataset2.origin).launch();
        }
      }
    });

    owd.Homescreen = {

      /*
       * Displays the contextual menu given an origin
       *
       * @param {String} the app origin
       */
      showContextualMenu: function(origin) {
        // FIXME: localize this message
        /*var options = [];
        if (HOMESCREEN_TEF) {
          options.push({
            label: 'Add to carousel',
            id: 'add'
          });
        }
        options.push({
          label: 'Delete App',
          id: 'delete'
        });

        var data = {
          origin: origin,
          options: options
        };

        contextualMenu.show(data, function(action) {
          if (action === 'delete') {
            var app = owdAppManager.getByOrigin(origin);

            // FIXME: localize this message
            // FIXME: This could be a simple confirm() (see bug 741587)
            requestPermission(
              'Do you want to uninstall ' + app.manifest.name + '?',
              function() {
                app.uninstall();
              },
              function() { }
            );
          }
        });*/
        if (!owdAppManager.isCore(origin)) {
          var app = owdAppManager.getByOrigin(origin);
          permission.request('Remove ' + app.manifest.name,
            'This application will be uninstalled fully from your mobile',
            function() {
              app.uninstall();
            },
            function() { }
          );
        }
      }
    };

    var startEvent = 'mousedown', moveEvent = 'mousemove',
        endEvent = 'mouseup', threshold = window.innerWidth / 3;

   /*
    * This component controls the transitions between carousel and grid
    */
    var viewController = {

      /*
       * Initializes the component
       *
       * @param {Object} The homescreen container
       */
      init: function(container) {
        this.pages = container.getElementsByClassName('view');
        this.total = this.pages.length;
        this.currentPage = 0;
        if (HOMESCREEN_TEF) {
          container.addEventListener(startEvent, this);
        } else {
          // Go to grid screen
          this.navigate(++this.currentPage, 0);
        }
      },

      /*
       * Navigates to a section given the number
       *
       * @param {int} number of the section
       *
       * @param {int} duration of the transition
       */
      navigate: function(number, duration) {
        var total = this.total;
        for (var n = 0; n < total; n++) {
          var page = this.pages[n];
          var style = page.style;
          style.MozTransform = 'translateX(' + (n - number) + '00%)';
          style.MozTransition = duration ? ('all ' + duration + 's ease') : '';
        }
        this.currentPage = number;
      },

      /*
       * Implements the transition of sections following the finger
       *
       * @param {int} x-coordinate
       *
       * @param {int} duration of the transition
       */
      pan: function(x, duration) {
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
      handleEvent: function(evt) {
        switch (evt.type) {
          case startEvent:
            this.onStart(evt);
            break;
          case moveEvent:
            this.onMove(evt);
            break;
          case endEvent:
            this.onEnd(evt);
            break;
        }
      },

      /*
       * Listens for touchstart events
       *
       * @param {Object} the event
       */
      onStart: function(evt) {
        this.startX = evt.pageX;
        window.addEventListener(moveEvent, this);
        window.addEventListener(endEvent, this);
      },

      /*
       * Listens for touchmove events
       *
       * @param {Object} the event
       */
      onMove: function(evt) {
        this.pan(-(this.startX - evt.pageX), 0);
      },

      /*
       * Listens for touchend events
       *
       * @param {Object} the event
       */
      onEnd: function(evt) {
        window.removeEventListener(moveEvent, this);
        window.removeEventListener(endEvent, this);
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

    // Initializating the viewController component
    viewController.init(doc.querySelector('#content'));
  })(document);
}
