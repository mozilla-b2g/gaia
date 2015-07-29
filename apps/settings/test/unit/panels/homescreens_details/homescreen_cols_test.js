'use strict';

suite('Homescreens_details > Homescreen_cols', () => {
  var modules = [
    'modules/mvvm/observable',
    'MockVerticalPreferences',
    'panels/homescreen_details/homescreen_cols'
  ];

  var maps = {
    '*': {
      'shared/homescreens/vertical_preferences': 'MockVerticalPreferences'
    }
  };

  const DEFAULT_SELECTED_OPTION = '3';

  var homescreenCols;
  var mockVerticalPreferences;

  setup(done => {
    define('MockVerticalPreferences', () => {
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
        }
      };
    });

    testRequire(modules, maps, (Observable, MockVerticalPreferences,
                                HomescreenCols) => {
      homescreenCols = HomescreenCols();
      mockVerticalPreferences = MockVerticalPreferences;
      done();
    });
  });

  test('We will update cols to default value after init', done => {
    setTimeout(() => {
      assert.equal(homescreenCols.cols, DEFAULT_SELECTED_OPTION);
      done();
    });
  });

  test('When VerticalPreferences is updated, cols is updated too', () => {
    var fakeGridCols = 4;
    mockVerticalPreferences._eventHandlers.updated({
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
    this.sinon.stub(mockVerticalPreferences, 'put', () => {
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
