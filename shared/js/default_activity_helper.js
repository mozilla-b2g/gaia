/* global SettingsHelper */
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
     * Returns the current choice as default for a given activity name and type
     * @param {String} name Activity name
     * @param {String} type Activity type
     * @param {Function} cb callback executed when search finished
     */
    getDefaultAction: function(name, type) {
      var config = this.getDefaultConfig(name, type);
      return new Promise((resolve, reject) => {
        if (!config) {
          resolve(null);
        }

        SettingsHelper(config.settingsId, null).get((value) => {
          resolve(value);
        });
      });
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

      SettingsHelper(config.settingsId, null).set(choice);
    }
  };

  exports.DefaultActivityHelper = DefaultActivityHelper;

})(window);
