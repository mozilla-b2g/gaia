/**
 * Handle Default Launch Details panel's functionality
 *
 */
define(function (require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');

  var DefaultLaunchDetails = function () {
    this._list = [];
  };

  function getAllAppsOpeningActivity(ourActivity) {
    return AppsCache.apps().then((apps) => {
      var tempList = [];
      // find the apps
      apps.forEach((app) => {
        var manifest = app.manifest;
        for (var activity in manifest.activities) {
          var filters = manifest.activities[activity].filters;
          // Type can be single value, array, or a definition object (value)
          var type = filters && filters.type && filters.type.value ||
                     filters && filters.type;
          if (!activity || !type) {
            // if there's no name or type there's no point on keep comparing
            // so we skip to the next one
            continue;
          }

          if (typeof type === 'string') {
            // single value, change to Array
            type = type.split(',');
          }

          // checks that ALL types from defaultActivity are covered by the app
          if (activity === ourActivity.name &&
              ourActivity.type.every((el) => {
                return type.includes(el);
              })) {
            tempList.push({name: manifest.name, manifestURL: app.manifestURL});
          }
        }
      });
      return Promise.resolve(tempList);
    });
  }

  DefaultLaunchDetails.prototype = {
    loadApps: function(activity) {
      return new Promise((resolve, reject) => {
        getAllAppsOpeningActivity(activity).then((list) => {
          this._list = list;
          resolve(this._list);
        });
      });
    },

    setNewDefaultApp: function (settingId, value) {
      var obj = {};
      obj[settingId] = value;
      navigator.mozSettings.createLock().set(obj);
    }
  };

  return function ctor_default_launch_details() {
    return new DefaultLaunchDetails();
  };
});
