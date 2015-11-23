/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict'; 

/* global
  placesModel
*/

require('/shared/js/sync/errors.js');
require('/apps/music/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
require('/shared/js/places_model.js');
suite('placesModel', function() {
  test('merge two remote records', function(done) {
    var place1 = {
      url: 'http://www.mozilla.org/en-US/',
      title: '',
      fxsyncId: '',
      createdLocally: false,
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    var result = placesModel.mergeRecordsToDataStore(place1, place2);
    var expectedPlace = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      createdLocally: false,
      visits: [1503000000000, 1502000000000, 1501000000000]
    };

    assert.equal(result.title, expectedPlace.title);
    assert.equal(result.url, expectedPlace.url);
    assert.equal(result.visits.length, expectedPlace.visits.length);
    for(var i = 0; i < result.visits.length; i++){
      assert.equal(result.visits[i], expectedPlace.visits[i]);
    }
    done();
  });

  test('merge remote record into local record', function(done) {
    var place1 = {
      url: 'http://www.mozilla.org/en-US/',
      title: '',
      fxsyncId: '',
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    var result = placesModel.mergeRecordsToDataStore(place1, place2);
    var expectedPlace = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      createdLocally: true,
      visits: [1503000000000, 1502000000000, 1501000000000]
    };

    assert.equal(result.title, expectedPlace.title);
    assert.equal(result.url, expectedPlace.url);
    assert.equal(result.visits.length, expectedPlace.visits.length);
    for(var i = 0; i < result.visits.length; i++){
      assert.equal(result.visits[i], expectedPlace.visits[i]);
    }
    done();
  });

  test('merge two records with incorrect URL', function(done) {
    var place1 = {
      url: 'dummy',
      title: '',
      fxsyncId: '',
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    assert.throws(() => {
      placesModel.mergeRecordsToDataStore(place1, place2);
    });
    done();
  });

  test('merge two records with incorrect fxsyncId',
      function(done) {
    var place1 = {
      url: 'http://www.mozilla.org/en-US/',
      title: '',
      fxsyncId: 'dummy',
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    assert.throws(() => {
      placesModel.mergeRecordsToDataStore(place1, place2);
    });
    done();
  });
});
