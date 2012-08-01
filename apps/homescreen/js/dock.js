
'use strict';

const DockManager = (function() {

  var container, dock;

  function onClick(evt) {
    dock.tap(evt.target);
  }

  function onLongPress(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (GridManager.pageHelper.getCurrentPageNumber() >= 1) {
      Homescreen.setMode('edit');

      if ('origin' in evt.target.dataset) {
        document.body.dataset.transitioning = true;
        DragDropManager.start(evt, {x: evt.pageX, y: evt.pageY});
      }
    }
  }

  /*
   * UI Localization
   *
   * Currently we only translate the app names
   */
  function localize() {
    dock.translate();
  }

  function releaseEvents() {
    container.removeEventListener('click', onClick);
    container.removeEventListener('contextmenu', onLongPress);
  }

  function attachEvents() {
    container.addEventListener('click', onClick);
    container.addEventListener('contextmenu', onLongPress);
  }

  function initialize(elem) {
    container = elem;
    attachEvents();
  }

  function render(apps) {
    dock = new Dock();
    dock.render(apps, container);
    localize();
  }

  return {
    /*
     * Initializes the dock
     *
     * @param {DOMElement} container
     */
    init: function dm_init(elem) {
      initialize(elem);
      this.getShortcuts(render);
    },

    /*
     * Returns list of shortcuts
     *
     * @param {Object} the callback
     */
    getShortcuts: function dm_getShortcuts(callback) {
      HomeState.getShortcuts(callback,
        function gs_fail() {
          callback([]);
        }
      );
    },

    onDragStop: function dm_onDragStop() {
      attachEvents();
    },

    onDragStart: function dm_onDragStart() {
      releaseEvents();
    },

    /*
     * Exports the page
     */
    get page() {
      return dock;
    },

    contains: function dm_contains(app) {
      return dock.getIcon(Applications.getOrigin(app));
    },

    /*
     * Removes an application from the dock
     *
     * {Object} moz app
     */
    uninstall: function dm_uninstall(app) {
      if (!this.contains(app)) {
        return;
      }

      dock.remove(app);
      this.saveState();
    },

    isFull: function dm_isFull() {
      return dock.getNumApps() === 4;
    },

    localize: localize,

    /*
     * Save current state
     *
     * {String} the mode ('edit' or 'mode')
     */
    saveState: function dm_saveState() {
      var nop = function f_nop() {};
      HomeState.saveShortcuts(dock.getAppsList(), nop, nop);
    }
  };
}());
