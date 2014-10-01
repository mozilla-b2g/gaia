'use strict';

suite('Search >', function() {
  var realL10n = null;
  var realMozSettings = null;

  var mockSettingsCache;
  var mockLazyLoader;

  var searchModule;
  var searchEngineSelect = document.createElement('select');

  suiteSetup(function(done) {
    var modules = [
      'unit/mock_l10n',
      'shared_mocks/mock_navigator_moz_settings',
      'unit/mock_settings_cache',
      'shared_mocks/mock_lazy_loader',
      'panels/search/search'
    ];

    var map = {
      '*': {
        'modules/settings_cache': 'unit/mock_settings_cache',
        'shared/lazy_loader': 'shared_mocks/mock_lazy_loader'
      }
    };

    testRequire(modules, map, function(MockL10n, MockNavigatorSettings,
                                       MockSettingsCache, MockLazyLoader,
                                       Search) {
      realL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      realMozSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;

      mockSettingsCache = MockSettingsCache;
      mockLazyLoader = MockLazyLoader;

      searchModule = Search();
      searchModule.init(searchEngineSelect);

      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    realMozSettings = null;

    navigator.mozL10n = realL10n;
    realL10n = null;
  });

  suite('Initialise search engines', function() {

    setup(function() {
      navigator.mozSettings.mSetup();
    });

    teardown(function() {
      navigator.mozSettings.mTeardown();
      mockSettingsCache.mTeardown();
      mockLazyLoader.mTeardown();
    });

    test('getCurrentSearchEngine()', function() {
      mockSettingsCache.mockSettings({'search.urlTemplate': 'foo.com'});
      searchModule.getCurrentSearchEngine();
      assert.equal(searchModule._searchUrlTemplate, 'foo.com');
    });

    test('initSearchEngineSelect()', function() {
      var populateSearchEnginesStub = this.sinon.stub(searchModule,
                                                      'populateSearchEngines');
      var generateSearchEngineOptionsStub = this.sinon.stub(searchModule,
                                                'generateSearchEngineOptions');
      searchModule.initSearchEngineSelect();
      assert.ok(populateSearchEnginesStub.calledOnce,
                'populateSearchEngines should be called once');

      mockSettingsCache.mockSettings({'search.providers': [{'foo': 'bar'}]});

      searchModule.initSearchEngineSelect();
      assert.ok(generateSearchEngineOptionsStub.called,
                'generateSearchEngineOptions should be called');

      populateSearchEnginesStub.restore();
      generateSearchEngineOptionsStub.restore();
    });

    test('populateSearchEngines()', function(done) {
      var callback = sinon.spy();
      sinon.spy(mockLazyLoader, 'getJSON');
      mockLazyLoader.mockResponse([{ 'foo': 'bar' }]);

      searchModule.populateSearchEngines(callback);
      assert.ok(mockLazyLoader.getJSON.called, 'getJSON should be called');

      // Can't run other checks till promise is done
      mockLazyLoader.getJSON.returnValues[0].then(function() {
        assert.ok(callback.called,
                  'populateSearchEngines should invoke callback');

        assert.equal(
          (navigator.mozSettings.mSettings['search.providers']).toString(),
          ([{ 'foo': 'bar' }]).toString(),
          'should update search.providers in settings'
        );

        done();
      });
    });

    test('generateSearchEngineOptions()', function() {
      var realSearchEngineSelect = searchModule._searchEngineSelect;
      searchModule._searchEngineSelect = document.createElement('select');
      var option = document.createElement('option');
      option.value = 'dummy';
      option.text = 'dummy';
      searchModule._searchEngineSelect.add(option);

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
      searchModule.generateSearchEngineOptions(data);
      assert.equal(searchModule._searchEngineSelect.length, 2);
      assert.equal(searchModule._searchEngineSelect[0].value,
        'http://foo.com/?q={searchTerms}');
      assert.equal(searchModule._searchEngineSelect[0].text,
        'Foo Search');

      searchModule._searchEngineSelect = realSearchEngineSelect;
    });
  });
});
