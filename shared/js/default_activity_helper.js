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
    //
    // NOTE: due to specs (bug1039386), some actions are grouped so when an app
    // is set as default for any of the actions, the rest (from the same group)
    // will be assigned the same app as default launch too.
    // Grouped actions:
    //
    // new "webcontacts/contact"
    // open "webcontacts/contact"
    // update "webcontacts/contact"
    //
    // new "mail"
    // view “url” (email)
    //
    // open "video"
    // view “video”
    //
    var supportedActivities = [
      {
        name: 'dial',
        type: ['webtelephony/number'],
        l10nId: 'default-activity-dialnumber',
        settingsId: 'activity.default.dialnumber'
      },
      {
        name: 'new',
        type: ['webcontacts/contact'],
        l10nId: 'default-activity-opencontact',
        settingsId: 'activity.default.opencontact'
        // same as open contact, see previous note
      },
      {
        name: 'new',
        type: ['mail'],
        l10nId: 'default-activity-newmail',
        settingsId: 'activity.default.newmail'
      },
      {
        name: 'new',
        type: ['websms/sms'],
        l10nId: 'default-activity-newsms',
        settingsId: 'activity.default.newsms'
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
        l10nId: 'default-activity-recordphoto',
        settingsId: 'activity.default.recordphoto'
      },
      {
        name: 'record',
        type: ['videos'],
        l10nId: 'default-activity-recordvideo',
        settingsId: 'activity.default.recordvideo'
      },
      {
        name: 'view',
        type: ['url'],
        l10nId: 'default-activity-viewurl',
        settingsId: 'activity.default.viewurl'
      },
      {
        name: 'view',
        type: ['application/pdf'],
        l10nId: 'default-activity-viewpdf',
        settingsId: 'activity.default.viewpdf'
      },
      {
        name: 'view',
        type: ['video/webm',
               'video/mp4',
               'video/3gpp',
               'video/youtube'],
        l10nId: 'default-activity-openvideo',
        settingsId: 'activity.default.openvideo'
        // same as open video, see previous note
      },
      {
        name: 'update',
        type: ['webcontacts/contact'],
        l10nId: 'default-activity-opencontact',
        settingsId: 'activity.default.opencontact'
        // same as open contact, see previous note
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
