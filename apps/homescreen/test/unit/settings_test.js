/* global mockLocalStorage, MockNavigatorDatastore, MockDatastore, Settings */
/* jshint nonew: false */
'use strict';

require('mocks/mock_localStorage.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/js/settings.js');

suite('Settings', () => {
  const DEFAULT_SETTINGS = '{"version":0,"small":false}';

  var realLocalStorage;
  var realNavigatorDatastores;

  setup(() => {
    realNavigatorDatastores = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    realLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => mockLocalStorage
    });
  });

  teardown(() => {
    navigator.getDataStores = realNavigatorDatastores;
    Object.defineProperty(window, 'localStorage', realLocalStorage);
  });

  suite('Settings constructor', () => {
    test('attempts to retrieve existing settings', () => {
      var getItemStub = sinon.stub(window.localStorage, 'getItem');
      new Settings();
      assert.isTrue(getItemStub.calledWith('settings'));
      getItemStub.restore();
    });

    test('sets firstRun to true if no settings', () => {
      mockLocalStorage.removeItem('settings');
      var settings = new Settings();
      assert.isTrue(settings.firstRun);
    });

    suite('settings exist', () => {
      setup(() => {
        mockLocalStorage.setItem('settings', DEFAULT_SETTINGS);
      });

      test('firstRun is false', () => {
        var settings = new Settings();
        assert.isFalse(settings.firstRun);
      });

      test('restores settings', () => {
        var settings = new Settings();
        assert.isFalse(settings.small);

        mockLocalStorage.setItem('settings', '{"version":0,"small":true}');
        settings = new Settings();
        assert.isTrue(settings.small);
      });

      test('should not restore data if version number differs', () => {
        mockLocalStorage.setItem('settings', '{"version":500,"small":true}');
        var settings = new Settings();
        assert.isFalse(settings.small);
      });

      test('opens settings datastore', () => {
        var getDataStoresStub = sinon.stub(navigator, 'getDataStores',
                                           () => Promise.reject());
        new Settings();
        assert.isTrue(getDataStoresStub.calledWith('homescreen_settings'));
        getDataStoresStub.restore();
      });

      suite('datastore settings', () => {
        var cols;
        var afterGetCall;
        var datastoreGetStub;

        setup(() => {
          cols = 3;
          datastoreGetStub = sinon.stub(MockDatastore, 'get', id => {
            switch (id) {
            case 'grid.cols':
              return { then: callback => { callback(cols); afterGetCall(); } };
            }
          });
        });

        teardown(() => {
          datastoreGetStub.restore();
        });

        test('restores columns setting', done => {
          var settings;

          afterGetCall = () => {
            try {
              assert.isFalse(settings.small);
            } catch(e) {
              done(e);
            }

            afterGetCall = () => {
              done(() => {
                assert.isTrue(settings.small);
              });
            };

            cols = 4;
            settings = new Settings();
          };

          settings = new Settings();
        });

        test('responds to columns setting change', done => {
          var settings;

          afterGetCall = () => {
            try {
              assert.isFalse(settings.small);
            } catch(e) {
              done(e);
            }

            var dispatchEventStub = sinon.stub(window, 'dispatchEvent');

            afterGetCall = () => {
              done(() => {
                assert.isTrue(dispatchEventStub.called);
                assert.isTrue(settings.small);
                dispatchEventStub.restore();
              });
            };

            cols = 4;
            MockDatastore._cb({ id: 'grid.cols' });
          };

          settings = new Settings();
        });
      });
    });
  });

  suite('Settings#save()', () => {
    test('saves columns setting', () => {
      mockLocalStorage.setItem('settings', DEFAULT_SETTINGS);
      var settings = new Settings();
      settings.small = true;
      settings.save();

      var settingsObj = JSON.parse(mockLocalStorage.getItem('settings'));
      assert.isTrue(settingsObj.small);
    });
  });
});
