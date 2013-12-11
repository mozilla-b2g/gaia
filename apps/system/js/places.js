/**
 * Places.
 *
 * Places is the browser history, bookmark and icon management system for
 * B2G.
 */
var Places = {

  /**
   * Places DataStore object.
   */
  dataStore: null,

  /**
   * Map of URLs to DataStore IDs.
   *
   * Won't be necessary once bug 946316 is implemented.
   */
  placeIds: {},

  /**
   * Initialise Places.
   */
  init: function places_init() {
    var self = this;
    console.log('Initialising Places DataStore.');
    navigator.getDataStores('places').then(function(stores) {
      self.dataStore = stores[0];
      if (stores.length > 1)
        console.log('Multiple places DataStores available, using the first.');
      return self.dataStore.get(1);
    }, function(error) {
      console.error('Error getting a list of stores.');
    }).then(function(map) {
      if (map == undefined) {
        return self.dataStore.add({}, 1);
      }
      self.placeIds = map;
      return null;
    }, (function(error) {
      console.error('Error getting places map');
    })).then(function(id) {
      //self.testPlaces(); // TODO: Remove when bug 949491 & 948014 fixed.
    }, function(error) {
      console.error('Failed to create places map ' + error);
    });
  },

  /**
   * Add place.
   *
   * @param {String} url URL of place to add.
   * @param {Function} callback Function to call on success.
   */
  addPlace: function places_addPlace(url, callback) {
    var self = this;

    // Don't try to overwrite a place if it already exists.
    if (this.placeExists(url)) {
      console.error('Place with the url ' + url + ' already exists.');
      return;
    }

    var place = {
      url: url,
      title: url,
      frecency: 1
    };

    this.dataStore.add(place).then(function(id) {
      self.placeIds[url] = id;
      self.savePlaceIds();
      if (callback)
        callback();
    }, function(error) {
      console.error('Error saving place with URL ' + url);
    });

  },

  /**
   * Get place.
   *
   * @param {String} url URL of place to get.
   * @param {Function} callback Function to call with result.
   */
  getPlace: function places_getPlace(url, callback) {
    var id = this.placeIds[url];

    if (!id) {
      console.error('Place with URL ' + url + ' does not exist');
      return;
    }

    this.dataStore.get(id).then(function(place) {
      callback(place);
    }, function(error) {
      console.error('Error getting place with URL ' + url);
    });
  },

  /**
   *  Update place.
   *
   *  @param {String} url URL of place to update.
   *  @param {Object} place New place data.
   *  @param {Function} callback Function to call on success.
   */
  updatePlace: function places_updatePlace(url, place, callback) {
    var id = this.placeIds[url];

      if (!id) {
        console.error('Cannot update place with URL ' + url +
          'because it doesnt exist');
        return;
      }

      this.dataStore.put(place, id).then(function(id) {
        if (callback)
          callback();
      }, function(error) {
        console.error('Error getting place with URL ' + url);
      });
  },

  /**
   * Add visit.
   *
   * Record visit to place. Currently this just increments frecency, but
   * eventually there should be a separate 'visits' DataStore to store a
   * record for every visit in order to render a history view.
   *
   * @param {String} url URL of visit to record.
   */
  addVisit: function places_addVisit(url, callback) {
    var self = this;
    if (self.placeExists(url)) {
      self.incrementPlaceFrecency(url, callback);
    } else {
      self.addPlace(url, callback);
    }
  },

  /**
   * Increment place frecency.
   *
   * Increment the frecency of a score by 1. Currently this is just frequency
   * but eventually should use a frecency algorithm to set a score.
   */
  incrementPlaceFrecency: function places_incrementPlaceFrecency(url,
    callback) {
    var self = this;
    self.getPlace(url, function(place) {
      place.frecency++;
      self.updatePlace(url, place, callback);
    });
  },

  /**
   * Set place title.
   *
   * @param {String} url URL of place to update.
   * @param {String} title Title of place to set.
   * @param {Function} callback Function to call on success.
   */
  setPlaceTitle: function places_setPlaceTitle(url, title, callback) {
    var self = this;
    // Don't try to set the title of a non-existent place.
    if (!self.placeExists(url))
      return;
    self.getPlace(url, function(place) {
      place.title = title;
      self.updatePlace(url, place, callback);
    });
  },

  /**
   * Place Exists.
   *
   * Does a place with the given URL exist?
   *
   * @param {String} url URL to look for.
   * @return {Boolean} true for yes, false for no.
   */
  placeExists: function places_placeExists(url) {
    if (this.placeIds[url]) {
      return true;
    } else {
      return false;
    }
  },

  /**
   * Save the index of URLs to Place IDs to the DataStore.
   */
  savePlaceIds: function places_savePlaceIds() {
    this.dataStore.put(this.placeIds, 1);
  }

  //TODO: Replace this commented out function with unit tests once bug 949491
  // and bug 948014 are fixed.
  /*,testPlaces: function places_testPlaces() {
    var self = this;
    console.log('MSG testing places');
    self.addPlace('http://google.com', function() {
      self.getPlace('http://google.com', function(place) {
        console.log('MSG Successfully added place with URL ' + place.url);
        var newPlace = {
          url: 'http://google.com',
          title: 'http://google.com',
          frecency: 2
        }
        self.updatePlace('http://google.com', newPlace, function() {
          self.getPlace('http://google.com', function(theNewPlace) {
              if (theNewPlace.frecency == 2) {
                console.log('MSG Successfully updated place');
              } else {
                console.error('MSG Failed to updated place');
              }
              self.incrementPlaceFrecency('http://google.com', function() {
                self.getPlace('http://google.com', function(theNewPlace2) {
                  if (theNewPlace2.frecency == 3) {
                    console.log('MSG Successfully incremented frecency');
                  } else {
                    console.error('MSG Failed to increment frecency');
                  }
                });
              });
          });
        });
      });
      self.addPlace('http://google.com', function() {
         console.error('MSG Was able to add two places for same URL');
      });
    });
    self.addVisit('http://yahoo.com', function() {
      self.addVisit('http://yahoo.com', function() {
        self.getPlace('http://yahoo.com', function(place) {
          if (place.frecency == 2) {
            console.log('MSG Successfully added visit for undefined place');
            self.setPlaceTitle('http://yahoo.com', 'Yahoo', function() {
              self.getPlace('http://yahoo.com', function(namedPlace) {
                if (namedPlace.title == 'Yahoo') {
                  console.log('MSG Successfully set title of place.');
                } else {
                  console.error('MSG Failed to set title of place');
                }
              });
            });
          } else {
            console.error('MSG Failed to add visit for undefined place');
          }
        });
      });
    });
  }*/
};

window.addEventListener('load', function placesOnLoad(evt) {
  window.removeEventListener('load', placesOnLoad);
  Places.init();
});
