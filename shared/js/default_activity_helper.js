/* exported DefaultActivityHelper */

(function(exports) {
  'use strict';

    // To add an element on the list, follow the example:
    // {
    //   name: 'pick',
    //   type: ['image/jpeg',
    //          'image/png',
    //          'image/gif',
    //          'image/bmp'],
    //   l10nId: 'default-activity-pickimage',
    //   settingsId: 'activity.default.pickimage'
    // },
    // Note: list of supported activities on bug1039386
    var supportedActivities = [
      {
        name: 'dial',
        type: ['webtelephony/number'],
        l10nId: 'default-activity-makecall',
        settingsId: 'activity.default.makecall'
      },
      {
        name: 'new',
        type: ['webcontacts/contact'],
        l10nId: 'default-activity-opencontact',
        settingsId: 'activity.default.opencontact'
      },
      {
        name: 'new',
        type: ['mail'],
        l10nId: 'default-activity-sendmail',
        settingsId: 'activity.default.sendmail'
      },
      {
        name: 'new',
        type: ['websms/sms'],
        l10nId: 'default-activity-sendmessage',
        settingsId: 'activity.default.sendmessage'
      },
      {
        name: 'open',
        type: ['webcontacts/contact'],
        l10nId: 'default-activity-opencontact',
        settingsId: 'activity.default.opencontact'
      },
      {
        name: 'open',
        type: ['image/jpeg',
               'image/png',
               'image/gif',
               'image/bmp'],
        l10nId: 'default-activity-openimage',
        settingsId: 'activity.default.openimage'
      },
      {
        name: 'open',
        type: ['audio/mpeg',
               'audio/ogg',
               'audio/mp4'],
        l10nId: 'default-activity-openaudio',
        settingsId: 'activity.default.openaudio'
      },
      {
        name: 'open',
        type: ['video/webm',
               'video/mp4',
               'video/3gpp',
               'video/youtube'],
        l10nId: 'default-activity-openvideo',
        settingsId: 'activity.default.openvideo'
      },
      {
        name: 'record',
        type: ['photos'],
        l10nId: 'default-activity-takephoto',
        settingsId: 'activity.default.takephoto'
      },
      {
        name: 'record',
        type: ['videos'],
        l10nId: 'default-activity-takevideo',
        settingsId: 'activity.default.takevideo'
      },
      {
        name: 'view',
        type: ['url'],
        l10nId: 'default-activity-openurl',
        settingsId: 'activity.default.openurl'
      },
      {
        name: 'view',
        type: ['application/pdf'],
        l10nId: 'default-activity-openpdf',
        settingsId: 'activity.default.openpdf'
      },
      {
        name: 'view',
        type: ['video/webm',
               'video/mp4',
               'video/3gpp',
               'video/youtube'],
        l10nId: 'default-activity-openvideo',
        settingsId: 'activity.default.openvideo'
      },
      {
        name: 'update',
        type: ['webcontacts/contact'],
        l10nId: 'default-activity-opencontact',
        settingsId: 'activity.default.opencontact'
      }
    ];

  var DefaultActivityHelper = {
    /**
     * Checks settings for the app set as default launch
     * Created to avoid the double check for Config and Action when iterating
     * along the list (as we already know the config) on .getAllDefaulted
     * @parameter settingId the id to look for in mozSettings
     */
    _getDefaultSetting: function(settingId) {
      return new Promise((resolve, reject) => {
        var req = navigator.mozSettings.createLock().get(settingId);
        req.onsuccess = function () {
          resolve(req.result[settingId]);
        };
        req.onerror = function () {
          resolve();
        };
      });
    },

    /**
     * Looks for an activity on the list given the name and the type
     * @parameter {String} name Activity name
     * @parameter {String} type Activity type
     * @returns {Object} Config object for the activity
     */
    getDefaultConfig: function(name, type) {
      var config = supportedActivities.find(function(a) {
        return a.name === name && a.type.indexOf(type) >= 0;
      });

      return config;
    },

    /**
     * Returns a Promise that resolves into the current choice as default app
     * for a given activity name and type
     * @param {String} name Activity name
     * @param {String} type Activity type
     */
    getDefaultAction: function(name, type) {
      var config = this.getDefaultConfig(name, type);
      if (!config) {
        return Promise.resolve(null);
      }

      return this._getDefaultSetting(config.settingsId);
    },

    /**
     * Sets a preference with the default choice for a given activity and type
     * @param {String} name Activity name
     * @param {String} type Activity type
     * @param {String} choice App manifest of the chosen app
     */
    setDefaultAction: function(name, type, choice) {
      var config = this.getDefaultConfig(name, type);
      if (!config) {
        return;
      }

      var obj = {};
      obj[config.settingsId] = choice;
      navigator.mozSettings.createLock().set(obj);
    },

    /**
     * Returns all the actions that have a default app associated for launch
     * Iterate over the list of supported activities and checks if there's a
     * manifest set on settings for each one.
     */
    getAllDefaulted: function() {
      var list = [];

      return Promise.all(supportedActivities.map((activity) => {
        return this._getDefaultSetting(activity.settingsId).then((manifest) => {
          // add to the final list if there's a default app set (manifestURL)
          if (manifest && typeof manifest !== 'undefined') {
            list.push({
              'activity': activity,
              'manifestURL': manifest
            });
          }
          return Promise.resolve();
        });
      })).then(function() { // when all done, return list with result
        return Promise.resolve(list);
      });
    },

    /**
     *  Returns the name and type of the activity given a l10n tag
     *  @parameter tag {String} L10n ID identifying an activity
     *  @returns {Object} with the name and type of the activity or null value
     */
    getActivity: function(tag) {
      var config = supportedActivities.find(function(a) {
        return a.l10nId === tag;
      });

      return config ? {'name': config.name, 'type': config.type} : null;
    }
  };

  exports.DefaultActivityHelper = DefaultActivityHelper;

})(window);
