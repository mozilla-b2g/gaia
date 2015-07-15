(function(exports) {

  'use strict';

  /* global LazyLoader */
  /* exported Loader */

  // Loader allow to load "views" and "utilities" in a easy form.
  // We load with this class the DOM dependencies and the libraries
  // needed to use the view/utility.

  var SHARED = 'shared';
  var SHARED_PATH = '/' + SHARED + '/' + 'js';

  var SHARED_UTILS = 'sharedUtilities';
  var SHARED_UTILS_PATH = SHARED_PATH + '/contacts/import/utilities';

  var SHARED_CONTACTS = 'sharedContacts';
  var SHARED_CONTACTS_PATH = SHARED_PATH + '/' + 'contacts';

  /**
   * Specifies dependencies for resources
   * E.g., mapping Facebook as a dependency of views
   */
  var dependencies = {
    views: {
      Search: function(callback) {
        LazyLoader.load(SHARED_PATH + '/utilities.js', callback);
      }
    },
    utilities: {},
    sharedUtilities: {}
  };

  // Mapping of view names to element IDs
  // TODO: Having a more standardized way of specifying this would be nice.
  // Then we could get rid of this mapping entirely
  // E.g., #details-view, #list-view, #form-view
  var elementMapping = {
    details: ['view-contact-details'],
    form: ['view-contact-form'],
    settings: ['settings-wrapper'],
    search: ['search-view', SHARED_CONTACTS],
    multiple_select: ['multiple-select-view'],
    overlay: ['loading-overlay', SHARED_UTILS],
    ice: ['ice-view'],
    import_sim_contacts: [null, SHARED_UTILS]
  };

  function load(type, file, callback) {
    /**
     * Performs the actual lazy loading
     * Called once all dependencies are met
     */
    function doLoad() {
      var name = file.toLowerCase();
      var path = null;
      if (elementMapping[name] && elementMapping[name][1]) {
        path = elementMapping[name][1];
      }
      var finalPath = 'js' + '/' + type;

      switch (path) {
        case SHARED:
          finalPath = SHARED_PATH;
          break;
        case SHARED_UTILS:
          finalPath = SHARED_UTILS_PATH;
          break;
        case SHARED_CONTACTS:
          finalPath = SHARED_CONTACTS_PATH;
          break;
        default:
          finalPath = 'js' + '/' + type;
      }

      var toLoad = [finalPath + '/' + name + '.js'];
      if (elementMapping[name] && elementMapping[name][0]) {
        var node = document.getElementById(elementMapping[name][0]);
        if (node) {
          toLoad.unshift(node);
        }
      }

      LazyLoader.load(toLoad, function() {
          if (callback) {
            callback();
          }
        });
    }

    if (dependencies[type][file]) {
      return dependencies[type][file](doLoad);
    }

    doLoad();
  }

  var Loader = {

    /**
     * Loads a view from the views/ folder
     * @param {String} view name.
     * @param {Function} callback.
     */
  	view: function loadView(view, callback) {
      load('views', view, callback);
    },

    /**
     * Loads a utility from the utilities/ folder
     * @param {String} utility name.
     * @param {Function} callback.
     */
    utility: function loadUtility(utility, callback) {
      load('utilities', utility, callback);
    }

  };

  exports.Loader = Loader;
}(window));
