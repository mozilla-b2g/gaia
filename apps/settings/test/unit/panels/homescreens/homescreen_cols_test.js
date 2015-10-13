'use strict';

suite('homescreens > homescreen_cols', () => {
  var modules = [
    'modules/mvvm/observable',
    'unit/mock_homescreen_settings',
    'panels/homescreens/homescreen_cols'
  ];

  var maps = {
    '*': {
      'shared/homescreens/homescreen_settings': 'unit/mock_homescreen_settings'
    }
  };

  const DEFAULT_SELECTED_OPTION = '3';

  var homescreenCols;
  var mockHomescreenSettings;

  setup(done => {
    define('MockHomescreenSettings', () => {
      return {
        addEventListener: function(key, callback) {
          if (!this._eventHandlers) {
            this._eventHandlers = {};
          }
          this._eventHandlers[key] = callback;
        },
        put: () => {
        },
        get: () => {
          return Promise.resolve(DEFAULT_SELECTED_OPTION);
        },
        setStoreName: () => {}
      };
    });

    testRequire(modules, maps, (Observable,
                                MockHomescreenSettings,
                                HomescreenCols) => {
      mockHomescreenSettings = MockHomescreenSettings;
      homescreenCols = HomescreenCols();
      done();
    });
  });

  test('We will update cols to default value after init', done => {
    setTimeout(() => {
      assert.equal(homescreenCols.cols, DEFAULT_SELECTED_OPTION);
      done();
    });
  });

  test('When HomescreenSettings is updated, cols is updated too', () => {
    var fakeGridCols = 4;
    mockHomescreenSettings._eventHandlers.updated({
      target: {
        name: 'grid.cols',
        value: fakeGridCols
      }
    });
    assert.equal(homescreenCols.cols, fakeGridCols);
  });

  test('The last value will eventually be set', done => {
    var lastValue = 9;
    var resolveFunc;
    var promise = new Promise(resolve => {
      resolveFunc = resolve;
    });
    this.sinon.stub(mockHomescreenSettings, 'put', () => {
      return promise;
    });

    homescreenCols.observe('cols', newValue => {
      if (newValue === lastValue) {
        done();
      }
    });

    homescreenCols.setCols(3);
    homescreenCols.setCols(4);
    homescreenCols.setCols(5);
    homescreenCols.setCols(6);
    homescreenCols.setCols(7);
    homescreenCols.setCols(8);
    homescreenCols.setCols(lastValue);
    resolveFunc();
  });
});
