'use strict';

/* global verticalPreferences, verticalHomescreen, requireElements,
          suiteTemplate */

require('/shared/js/homescreens/vertical_preferences.js');
requireElements('settings/elements/homescreen.html');

suite('vertical_homescreen.js >', function() {

  var numCols = 4;
  var updateStub = null;
  var updateHandler = null;
  var pref = 'grid.cols';

  suiteTemplate('homescreen', {
    id: 'homescreen'
  });

  suiteSetup(function() {
    updateStub = sinon.stub(verticalPreferences, 'addEventListener',
                                function(type, handler) {
      updateHandler = handler;
    });
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
    updateStub.restore();
  });

  setup(function(done) {
    var getStub = sinon.stub(verticalPreferences, 'get', function() {
      return {
        then: function(resolve, refect) {
          resolve(numCols);
        }
      };
    });

    requireApp('/settings/js/vertical_homescreen.js', function() {
      getStub.restore();
      done();
    });
  });

  function assertNumberOfColumns(num) {
    assert.equal(verticalHomescreen.gridSelect.selectedIndex,
                 num === 3 ? 0 : 1);
  }

  suite('Initialization > ', function() {
    test('Grid layout select initialized correctly ', function() {
      // Four columns (second option -> index 1)
      assertNumberOfColumns(numCols);
    });
  });

  suite('Updating grid layout select > ', function() {
    
    function dispatchChangeEvent() {
      verticalHomescreen.gridSelect.dispatchEvent(new CustomEvent('change'));
    }

    function assertPreferenceUpdated(id, value, expectedValue) {
      assert.equal(id, pref);
      assert.equal(value, expectedValue);
    }

    test('Datastore was updated properly ', function(done) {
      var expectedNumCols = 3;

      var putStub = sinon.stub(verticalPreferences, 'put', function(id, value) {
        assertPreferenceUpdated(id, value, expectedNumCols);
        putStub.restore();
        done();
      });

      verticalHomescreen.gridSelect.options[0].selected = true; // 3 cols
      dispatchChangeEvent();
    });
  });

  suite('Updating Datastore > ', function() {

    function dispatchUpdatedEvent(cols) {
      updateHandler.handleEvent({
        type: 'updated',
        target: {
          name: pref,
          value: cols
        }
      });
    }

    test('The grid layout select was updated properly ', function() {
      var expectedNumCols = 4;
      dispatchUpdatedEvent(expectedNumCols);
      assertNumberOfColumns(expectedNumCols);

      expectedNumCols = 3;
      dispatchUpdatedEvent(expectedNumCols);
      assertNumberOfColumns(expectedNumCols);
    });
  });

});
