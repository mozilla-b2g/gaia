'use strict';

requireApp('costcontrol/js/views/BalanceLowLimitView.js');

suite('Balance low limit view and validator >', function() {

  var ZERO = '0';
  var POSITIVE_INTEGER = '1';
  var POSITIVE_FLOAT = '1.5';
  var NEGATIVE_INTEGER = '-1';
  var NEGATIVE_FLOAT = '-1.5';
  var EMPTY_STRING = '';
  var NON_NUMERIC_VALUE = 'Cthulhu';

  var lowLimitEnabler, lowLimitInput, lowLimitView;

  setup(function() {
    lowLimitEnabler = document.createElement('INPUT');
    lowLimitEnabler.setAttribute('type', 'checkbox');
    lowLimitInput = document.createElement('INPUT');
    lowLimitView = new BalanceLowLimitView(
      lowLimitEnabler,
      lowLimitInput
    );
  });

  function assertAlwaysValidate() {
    [
      NEGATIVE_FLOAT,
      NEGATIVE_INTEGER,
      ZERO,
      POSITIVE_INTEGER,
      POSITIVE_FLOAT,
      EMPTY_STRING,
      NON_NUMERIC_VALUE
    ]
    .forEach(function(testValue) {
      lowLimitInput.value = testValue;
      lowLimitView.validate();
      assert.isTrue(lowLimitView._isValid);
    });
  };

  function assertOnlyPositiveValuesAreAccepted() {
    [
      POSITIVE_INTEGER,
      POSITIVE_FLOAT
    ]
    .forEach(function(testValue) {
      lowLimitInput.value = testValue;
      lowLimitView.validate();
      assert.isTrue(lowLimitView._isValid);
    });

    [
      NEGATIVE_FLOAT,
      NEGATIVE_INTEGER,
      ZERO,
      EMPTY_STRING,
      NON_NUMERIC_VALUE
    ]
    .forEach(function(testValue) {
      lowLimitInput.value = testValue;
      lowLimitView.validate();
      assert.isFalse(lowLimitView._isValid);
    });
  }

  test(
    'Disabling the view disables both components.',
    function() {
      lowLimitView.disabled = true;
      assert.isTrue(lowLimitEnabler.disabled);
      assert.isTrue(lowLimitInput.disabled);
    }
  );

  test(
    'Enabling the view enables both components.',
    function() {
      lowLimitView.disabled = false;
      assert.isFalse(lowLimitEnabler.disabled);
      assert.isFalse(lowLimitInput.disabled);
    }
  );

  test(
    'If the component is disabled it always validates.',
    function() {
      lowLimitView.disabled = true;
      assertAlwaysValidate();
    }
  );

  test(
    'If the low limit enabler is not checked it always validates.',
    function() {
      lowLimitEnabler.checked = false;
      assertAlwaysValidate();
    }
  );

  test(
    'Only validates with positive values.',
    function() {
      lowLimitView.disabled = false;
      lowLimitEnabler.checked = true;
      assertOnlyPositiveValuesAreAccepted();
    }
  );

  test(
    'Click on the enabler triggers a validation event.',
    function(done) {
      lowLimitView.disabled = false;
      lowLimitEnabler.checked = true;
      lowLimitView.onvalidation = function() {
        done();
      };
      lowLimitEnabler.click();
    }
  );


  test(
    'Changing the input value by user input triggers a validation event.',
    function(done) {
      lowLimitView.disabled = false;
      lowLimitEnabler.checked = true;
      lowLimitView.onvalidation = function() {
        done();
      };
      var fakeInputEvent = document.createEvent('Event');
      fakeInputEvent.initEvent('input', true, false);
      lowLimitInput.dispatchEvent(fakeInputEvent);
    }
  );


  test(
    'Enabling / disabling the view triggers a validation event.',
    function(done) {
      lowLimitView.disabled = false;
      lowLimitEnabler.checked = true;
      lowLimitView.onvalidation = function() {
        done();
      };
      lowLimitView.disabled = !lowLimitView.disabled;
    }
  );

});
