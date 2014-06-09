'use strict';

/* global verticalPreferences, MockDatastore, MockNavigatorDatastore */

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/homescreens/vertical_preferences.js');

suite('vertical_preferences.js >', function() {

  var realDatastore = null,
      gridCols = 'grid.cols',
      cols = 3;

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  setup(function() {
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
  });

  teardown(function() {
    MockDatastore._inError = false;
    MockDatastore._records = Object.create(null);
  });

  test('testing not getDataStores defined >', function(done) {
    navigator.getDataStores = undefined;
    verticalPreferences.get(gridCols).then(function(value) {
      // Do noting
    }, function(e) {
      assert.equal(e.name, 'NO_DATASTORE');
      done();
    });
  });

  test('testing no access to datastore >', function(done) {
    navigator.getDataStores = function() {
      return {
        then: function(resolve, reject) {
          resolve({
            length: 0
          });
        }
      };
    };
    
    verticalPreferences.get(gridCols).then(function(value) {
      // Do noting
    }, function(e) {
      assert.equal(e.name, 'NO_ACCESS_TO_DATASTORE');
      done();
    });
  });

  test('calling to put method - added >', function(done) {
    verticalPreferences.put(gridCols, cols).then(done);
  });

  test('calling to put method - failed >', function(done) {
    MockDatastore._inError = true;
    verticalPreferences.put(gridCols, cols).then(function() {
      // Do nothing here
    }, function() {
      done();
    });
  });

  test('calling to get method - OK >', function(done) {
    verticalPreferences.put(gridCols, cols).then(function() {
      verticalPreferences.get(gridCols).then(function(value) {
        assert.equal(value, cols);
        done();
      });
    });
  });

  test('calling to get method - failed >', function(done) {
    MockDatastore._inError = true;
    verticalPreferences.get(gridCols).then(function() {
      // Do nothing here
    }, function() {
      done();
    });
  });

  test('testing addEventListener for "updated" event >', function(done) {
    verticalPreferences.addEventListener('updated', function onUpdated(event) {
      assert.equal(event.type, 'updated');
      assert.equal(event.target.name, gridCols);
      assert.equal(event.target.value, cols);
      done();
    });

    verticalPreferences.put(gridCols, cols);
  });
});
