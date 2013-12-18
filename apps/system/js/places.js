/**
 * Places.
 *
 * Places is the browser history, bookmark and icon management system for
 * B2G.
 */

'use strict';

function Places(initCallback) {

  var STORE_NAME = 'places';
  var api = {};
  var dataStore;

  navigator.getDataStores(STORE_NAME)
    .then(initStore)
    .then(initCallback);

  function call(fun) {
    if (typeof fun === typeof Function) {
      var args = Array.prototype.slice.call(arguments, 1);
      fun.apply(this, args);
    }
  }

  function initStore(stores) {
    if (stores.length > 1) {
      console.log('Multiple places DataStores available, using the first.');
    }
    dataStore = stores[0];
    return dataStore.get(1);
  }

  function addPlace(url, callback) {
    var place = {
      url: url,
      title: url,
      frecency: 1
    };
    dataStore.add(place, url).then(function(id) {
      call(callback, null, place);
    });
  }

  function incrementPlaceFrecency(url, callback) {
    api.getPlace(url, function(err, place) {
      if (err) { return callback(err); }
      place.frecency++;
      api.updatePlace(url, place, callback);
    });
  };

  /**
   * Add visit.
   *
   * Record visit to place. Currently this just increments frecency, but
   * eventually there should be a separate 'visits' DataStore to store a
   * record for every visit in order to render a history view.
   *
   * @param {String} url URL of visit to record.
   */
  api.addVisit = function(url, callback) {
    api.getPlace(url, function(err, place) {
      if (err) {
        return addPlace(url, callback);
      }
      incrementPlaceFrecency(url, callback);
    });
  };

  /**
   * Clear all the visits in the store
   *
   * @param {Function} callback Function to call with result.
   */
  api.clear = function(callback) {
    dataStore.clear().then(function() {
      call(callback, null);
    });
  };

  /**
   * Get place.
   *
   * @param {String} url URL of place to get.
   * @param {Function} callback Function to call with result.
   */
  api.getPlace = function(url, callback) {
    dataStore.get(url).then(function(place) {
      if (place) {
        call(callback, null, place);
      } else {
        call(callback, 'not_found');
      }
    });
  };

  /**
   *  Update place.
   *
   *  @param {String} url URL of place to update.
   *  @param {Object} place New place data.
   *  @param {Function} callback Function to call on success.
   */
  api.updatePlace = function(url, place, callback) {
    dataStore.put(place, url).then(function(id) {
      call(callback, null, place);
    });
  };

  /**
   * Set place title.
   *
   * @param {String} url URL of place to update.
   * @param {String} title Title of place to set.
   * @param {Function} callback Function to call on success.
   */
  api.setPlaceTitle = function(url, title, callback) {
    api.getPlace(url, function(err, place) {
      if (err) { return call(callback, err); }
      place.title = title;
      api.updatePlace(url, place, callback);
    });
  };

  return api;
}
