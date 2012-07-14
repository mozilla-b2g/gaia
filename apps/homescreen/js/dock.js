
'use strict';

const DockManager = (function() {

  var container, dock;

  function initialize(elem) {
    container = elem;

    GridManager.onEditModeChange = function onEditModeChange(value) {
      container.dataset.mode = value; // Disable/enable dock
    }

    // Listening for clicks on the dock
    container.addEventListener('click', function onclick(event) {
      dock.tap(event.target);
    });
  }

  function render(apps) {
    dock = new Dock();
    dock.render(apps, container);
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
    }
  };
}());
