'use strict';

suite('homescreen > ', function() {
  const DEFAULT_SELECTED_OPTION = '3';

  var homescreen;
  var mockVerticalPreferences;
  var modules = [
    'panels/homescreen/homescreen',
    'MockVerticalPreferences'
  ];

  var map = {
    '*': {
      'shared/homescreens/vertical_preferences': 'MockVerticalPreferences'
    }
  };

  setup(function(done) {
    define('MockVerticalPreferences', function() {
      return {
        addEventListener: function(key, callback) {
          if (!this._eventHandlers) {
            this._eventHandlers = {};
          }
          this._eventHandlers[key] = callback;
        },
        put: function() {},
        get: function() {
          return Promise.resolve(DEFAULT_SELECTED_OPTION);
        }
      };
    });

    var requireCtx = testRequire([], map, function() {});
    requireCtx(modules, function(Homescreen, MockVerticalPreferences) {
        homescreen = Homescreen;
        mockVerticalPreferences = MockVerticalPreferences;
        done();
    });
  });

  test('we will update cols to default value after init', function() {
    assert.equal(homescreen.cols, DEFAULT_SELECTED_OPTION);
  });

  test('When VerticalPreferences is updated, we will update Homescreen.cols',
    function() {
      var fakeGridCols = 4;
      mockVerticalPreferences._eventHandlers.updated({
        target: {
          name: 'grid.cols',
          value: fakeGridCols
        }
      });
      assert.equal(homescreen.cols, fakeGridCols);
  });

  test('The last value will eventually be set', function(done) {
    var lastValue = 9;
    var resolveFunc;
    var promise = new Promise(function(resolve) { 
      resolveFunc = resolve;
    });
    this.sinon.stub(mockVerticalPreferences, 'put', function() {
      return promise;
    });

    homescreen.observe('cols', function(newValue) {
      if (newValue === lastValue) {
        done();
      }
    });

    homescreen.setCols(3);
    homescreen.setCols(4);
    homescreen.setCols(5);
    homescreen.setCols(6);
    homescreen.setCols(7);
    homescreen.setCols(8);
    homescreen.setCols(lastValue);
    resolveFunc();
  });
});
