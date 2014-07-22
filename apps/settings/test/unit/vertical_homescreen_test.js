'use strict';

/* global verticalPreferences, verticalHomescreen, requireElements,
          suiteTemplate, MockNavigatorSettings, MockL10n */

requireApp('settings/test/unit/mock_l10n.js');
require('/shared/js/homescreens/vertical_preferences.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/settings_listener.js');
requireElements('settings/elements/homescreen.html');

suite('vertical_homescreen.js >', function() {

  var realL10n;
  var numCols = 4;
  var updateStub = null;
  var updateHandler = null;
  var colsPrefEnabled = 'cols.preference.enabled';
  var colsPref = 'grid.cols';
  var realMozSettings = null;

  var defaultValues = {};
  defaultValues[colsPref] = numCols;
  defaultValues[colsPrefEnabled] = true;

  suiteTemplate('homescreen', {
    id: 'homescreen'
  });

  suiteSetup(function() {
    updateStub = sinon.stub(verticalPreferences, 'addEventListener',
                                function(type, handler) {
      updateHandler = handler;
    });

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
    updateStub.restore();
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  setup(function(done) {
    var getStub = sinon.stub(verticalPreferences, 'get', function(key) {
      return {
        then: function(resolve, refect) {
          resolve(defaultValues[key]);
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
      assert.equal(verticalHomescreen.section.hidden, false);
    });
  });

  suite('Updating grid layout select > ', function() {

    function dispatchChangeEvent() {
      verticalHomescreen.gridSelect.dispatchEvent(new CustomEvent('change'));
    }

    function assertPreferenceUpdated(id, value, expectedValue) {
      assert.equal(id, colsPref);
      assert.equal(value, expectedValue);
    }

    test('Datastore was updated properly ', function(done) {
      var expectedNumCols = 3;

      var putStub = sinon.stub(verticalPreferences, 'put',
        function(id, value) {
        assertPreferenceUpdated(id, value, expectedNumCols);
        putStub.restore();
        done();
      });

      verticalHomescreen.gridSelect.options[0].selected = true; // 3 cols
      dispatchChangeEvent();
    });
  });

  suite('Updating Datastore > ', function() {

    function dispatchUpdatedEvent(prefName, prefValue) {
      updateHandler.handleEvent({
        type: 'updated',
        target: {
          name: prefName,
          value: prefValue
        }
      });
    }

    test('The grid layout select was updated properly ', function() {
      var expectedNumCols = 4;
      dispatchUpdatedEvent(colsPref, expectedNumCols);
      assertNumberOfColumns(expectedNumCols);

      expectedNumCols = 3;
      dispatchUpdatedEvent(colsPref, expectedNumCols);
      assertNumberOfColumns(expectedNumCols);
    });
  });

  suite('Initialise search engines', function() {
    var xhr;
    var requests = [];

    setup(function() {
      navigator.mozSettings.mSetup();
      navigator.mozSettings.mSyncRepliesOnly = true;
       xhr = sinon.useFakeXMLHttpRequest();
       xhr.onCreate = function (xhr) {
         requests.push(xhr);
       };
    });

    teardown(function() {
      navigator.mozSettings.mTeardown();
      xhr.restore();
    });

    test('getCurrentSearchEngine()', function() {
      navigator.mozSettings.mSettings['search.urlTemplate'] = 'foo.com';
      verticalHomescreen.getCurrentSearchEngine();
      navigator.mozSettings.mReplyToRequests();
      assert.equal(verticalHomescreen.searchUrlTemplate, 'foo.com');
    });

    test('initSearchEngineSelect()', function() {
      var populateSearchEnginesStub = this.sinon.stub(verticalHomescreen,
      'populateSearchEngines');
      var generateSearchEngineOptionsStub = this.sinon.stub(
        verticalHomescreen, 'generateSearchEngineOptions');
      verticalHomescreen.initSearchEngineSelect();
      navigator.mozSettings.mReplyToRequests();
      assert.ok(populateSearchEnginesStub.calledOnce);

      navigator.mozSettings.mSettings['search.providers'] = [{'foo': 'bar'}];
      verticalHomescreen.initSearchEngineSelect();
      navigator.mozSettings.mReplyToRequests();
      assert.ok(generateSearchEngineOptionsStub.called);

      populateSearchEnginesStub.restore();
      generateSearchEngineOptionsStub.restore();
    });

    test('populateSearchEngines()', function() {
      var callback = sinon.spy();
      verticalHomescreen.populateSearchEngines(callback);
      assert.equal(1, requests.length);

      requests[0].respond(200, { 'Content-Type': 'application/json' },
        '[{ "foo": "bar"}]');
      assert.ok(callback.called);

      assert.equal((navigator.mozSettings.mSettings['search.providers']).
        toString(), ([{ 'foo': 'bar'}]).toString());
    });

    test('generateSearchEngineOptions()', function() {
      var realSearchEngineSelect = verticalHomescreen.searchEngineSelect;
      verticalHomescreen.searchEngineSelect = document.createElement('select');
      var option = document.createElement('option');
      option.value = 'dummy';
      option.text = 'dummy';
      verticalHomescreen.searchEngineSelect.add(option);

      var data = [
        {
          'title': 'Foo Search',
          'urlTemplate': 'http://foo.com/?q={searchTerms}'
        },
        {
          'bar': 'Bar Search',
          'urlTemplate': 'http://bar.com/?q={searchTerms}'
        }
      ];
      verticalHomescreen.generateSearchEngineOptions(data);
      assert.equal(verticalHomescreen.searchEngineSelect.length, 2);
      assert.equal(verticalHomescreen.searchEngineSelect[0].value,
        'http://foo.com/?q={searchTerms}');
      assert.equal(verticalHomescreen.searchEngineSelect[0].text,
        'Foo Search');

      verticalHomescreen.searchEngineSelect = realSearchEngineSelect;
    });

  });

});
