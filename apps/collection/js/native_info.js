'use strict';
/* global eme */
/* global CollectionsDatabase */
/* global BaseCollection */
/* global HomeIcons */
/* global Promise */

(function(exports) {

  const SETUP_KEY = 'NativeInfo-setup';

  var homeIcons;

  function onerror(e) {
    eme.error('NativeInfo error', e.name || e.message || e);
  }

  // Provides information about native apps in order to match them against
  // Smart Collections
  function NativeInfo() {

  }

  NativeInfo.prototype = {

    // returns a promise resolved with a {cName: [guids]} object
    getInfo: function getInfo(guids) {
      if (!navigator.onLine) {
        return Promise.reject();
      }

      return eme.api.Apps.nativeInfo({
          guids: guids
        }).then(function success(response) {
          /*
           * information about the apps by e.me
           * {
           *   key: {
           *     guid: manifestURL (sent in request)
           *     experiences: ['music', 'news'] (list of canonical names)
           *   }
           * }
           */
          var emeInfo = response.response || {};

          // prepare data for processing
          // create an object mapping canonical names to guids
          // { 'music': ["app://music.gaiamobile", "http://youtube.com"] }
          var guidsByCname = {};

          function each(guid, cName) {
            guidsByCname[cName] =
              guidsByCname[cName] || [];

            guidsByCname[cName].push(guid);
          }

          for (var key in emeInfo) {
            var info = emeInfo[key];
            var cNames = info.experiences || [];
            cNames.forEach(each.bind(null, info.guid));
          }

          return guidsByCname;

        });
    },

    // adds the apps in guidsByCname[cName] to the collection with matching
    // canonical name
    addToCollections: function addToCollections(guidsByCname) {
      return CollectionsDatabase.getAll().then(function(collections) {

        // we are going to traverse all the collections on device
        for (var id in collections) {
          var collection = BaseCollection.create(collections[id]);

          if (collection.cName) {
            var guids = guidsByCname[collection.cName] || [];

            if (guids.length) {
              var identifiers =
               guids.map(homeIcons.getIdentifier.bind(homeIcons));

              eme.log('NativeInfo', identifiers.length, 'matches for',
               collection.cName, JSON.stringify(identifiers));

              collection.pinHomeIcons(identifiers);
            }
          }
        }
      });
    },

    // on app install/uninstall
    processApp: function processApp() {
      // TODO
    },

    // on collection install
    processCollection: function processCollection() {
      // TODO
    },

    doSetup: function doSetup() {
      homeIcons = new HomeIcons();
      return homeIcons.init().then(function success() {
        var manifestURLs = homeIcons.manifestURLs;
        var bookmarkURLs = homeIcons.bookmarkURLs;
        eme.log('NativeInfo found', manifestURLs.length, 'apps');
        eme.log('NativeInfo found', bookmarkURLs.length, 'bookmarks');

        // return guid array
        return manifestURLs.concat(bookmarkURLs);
      })
      .then(this.getInfo)
      .then(this.addToCollections)
      .then(function neverAgain() {
        eme.Cache.add(SETUP_KEY, true);
      })
      .catch(onerror);
    },

    // matches all apps and bookmarks against all existing collections
    // when match found pin app to collection
    setup: function setup() {
      return eme.Cache.get(SETUP_KEY).then(function skip() {
        eme.log('NativeInfo', 'skipping setup');
      }, this.doSetup.bind(this));
    }

  };

  exports.NativeInfo = new NativeInfo();

}(window));
