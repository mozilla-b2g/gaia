'use strict';

suite('homescreen > ', function() {
  const DEFAULT_SELECTED_OPTION = '3';

  var homescreen;
  var mockVerticalPreferences;
  var mockObservable;
  var modules = [
    'panels/homescreen/homescreen',
    'MockVerticalPreferences',
    'MockObservable'
  ];

  var map = {
    '*': {
      'modules/mvvm/observable': 'MockObservable',
      'shared/homescreens/vertical_preferences': 'MockVerticalPreferences'
    }
  };

  setup(function(done) {
    define('MockObservable', function() {
      return function() {
        return {
          _isUpdating: false,
          _cachedColsValue: null,
          cols: null,
          setCols: function(value) {
            this.cols = value;
          },
          observe: function(key, callback) {
            if (!this._eventHandlers) {
              this._eventHandlers = {};
            }
            this._eventHandlers[key] = callback;
          }
        };
      };
    });

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
    requireCtx(modules, function(Homescreen, MockVerticalPreferences,
      MockObservable) {
        homescreen = Homescreen;
        mockObservable = MockObservable;
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
});
