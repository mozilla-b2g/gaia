require('/tests/js/app_integration.js');

function CalculatorIntegration() {
  AppIntegration.apply(this, arguments);

  for (var key in this.inputMap) {
    // map the input values to elements
    this.selectors[key] =
      '[value="' + this.inputMap[key] + '"]';
  }

  this._cachedElements = Object.create(null);
}

CalculatorIntegration.prototype = {
  __proto__: AppIntegration.prototype,

  appName: 'Calculator',

  inputMap: {
    /* input values */
    '0': '0',
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',

    /* input operators */
    '+': '+',
    '-': '-',
    // value is unicode
    '*': '×',
    // value is unicode
    '/': '÷',
    '.': '.'
  },

  selectors: {
    /** main display */
    display: '#display',

    /** buttons */

    'enter': '[data-type="command"][value="="]',
    'clear': '[data-type="command"][value="C"]'
  },

  launch: function(callback) {
    var self = this;
    AppIntegration.prototype.launch.call(this, function() {
      self.task(function(app, next, done) {
        yield IntegrationHelper.importScript(
          app.device,
          //TODO: this should likely be in atoms
          '/test_apps/test-agent/common/test/synthetic_gestures.js'
        );
        done();
      });
    });
  },

  /**
   * Clears calculator input.
   */
  clear: function(callback) {
    var self = this;

    this.task(function(app, next, done) {
      var device = app.device;

      if (!self._clearButton) {
        self._clearButton = yield app.element('clear');
      }

      // TODO: per app SyntheticGestures instances?
      // touchSupported is flagged to false so gestures
      // uses mouseup/down. This is a hack but works well for now.
      yield device.executeAsyncScript(function(clear) {
        SyntheticGestures.touchSupported = false;
        SyntheticGestures.hold(clear, 800, 0, 0, 0, 0, 0, function() {
          marionetteScriptFinished(true);
        });
      }, [self._clearButton]);

      done();

    }, callback);
  },

  /**
   * Takes a space separated list of values
   * and returns their display value.
   *
   * This method is sync and should _not_ be used with yield.
   *
   * @param {String} values list of math values (1 * 1, etc..).
   * @return {Array} array of values.
   */
  mathToDisplay: function(values) {
    return values.split(' ').map(function(value) {
      return this.inputMap[value];
    }, this);
  },

  /**
   * Takes a list of math values an clicks
   * the corresponding buttons in the calendar app.
   * Does not press the enter button.
   *
   * Example:
   *
   *    // enter these values into the calculator
   *    yield app.enterMath('2 * 2 - 2');
   *
   *
   * @param {String} math values separated by single whitespace.
   * @param {Function} [callback] optional callback.
   */
  enterMath: function(math, callback) {
    var values = math.split(' ');

    var self = this;
    var elements = this._cachedElements;

    this.task(function(app, next, done) {
      for (var i = 0; i < values.length; i++) {
        var btn = values[i];

        if (!(btn in elements)) {
          elements[btn] = yield app.element(btn);
        }

        // we need to use next in the case where
        // the elements are cached.
        yield elements[btn].click(next);
      }
      done();
    }, callback);
  },

  /**
   * Returns the currently displayed value in the calculator.
   * Caches the display element for speed.
   */
  displayText: function(callback) {
    var self = this;
    this.task(function(app, next, done) {
      if (!self._displayElement) {
        self._displayElement = yield app.element('display');
      }
      var value = yield self._displayElement.text(next);
      done(null, value);
    }, callback);
  }


};
