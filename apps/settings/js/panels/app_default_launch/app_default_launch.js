/**
 * Handle Default App Launch panel's functionality
 *
 * @module DefaultApp
 */
define(function (require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');
  var SettingsService = require('modules/settings_service');
  var ManifestHelper = require('shared/manifest_helper');
  var DefaultActivityHelper = require('shared/default_activity_helper');

 /**
   * Array with the different actions that have default launch app set
   * Each object is on the form:
   * {
   *    'manifestURL': app://<name>.gaiamobile.org/manifest.webapp,
   *    'name': <name>,
   *    'activity': {
   *      name: 'pick',
   *      type: ['image/jpeg',
   *             'image/png',
   *             'image/gif',
   *             'image/bmp'],
   *      l10nId: 'default-activity-pickimage',
   *      settingsId: 'default.activity.pickimage'
   *    }
   * }
   */
  var _defaultAppList;

  function _elementClick(evt) {
    var clicked = evt.target;
    if (clicked.dataset.manifest) {

      var details = _defaultAppList.find((element) => {
        return element.manifestURL === clicked.dataset.manifest;
      });

      SettingsService.navigate('defaultLaunch-details', details);
    }
  }

  var DefaultAppList = function () {};

  DefaultAppList.prototype = {
    init: function (rootElement) {
      _defaultAppList = [];
      this._root = rootElement;
      this._root.addEventListener('click', _elementClick);
    },

    /**
     * Retrieve the list of actions with default action associated and
     * returns it to the Panel
     */
    getAll: function () {
      return DefaultActivityHelper.getAllDefaulted().then((list) => {
        _defaultAppList = list;
        return Promise.all(_defaultAppList.map((app) => {
          return this.getAppName(app.manifestURL).then((name) => {
            app.name = name;
          });
        }));
      }).then(() => {
        return Promise.resolve(_defaultAppList);
      });
    },

    /**
     *  Gets the real name of the application from the manifestURL
     *  @parameter {String} manifestURL
     */
    getAppName: function (manifestURL) {
      return AppsCache.apps().then((apps) => {
        apps = apps.filter((app) => manifestURL === app.manifestURL);
        var manifest = new ManifestHelper(apps[0].manifest);
        return Promise.resolve(manifest.name);
      });
    }
  };

  return function ctor_default_launch() {
    return new DefaultAppList();
  };
});
