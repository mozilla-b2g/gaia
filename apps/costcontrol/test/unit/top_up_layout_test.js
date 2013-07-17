'use strict';

requireApp('costcontrol/js/views/TopUpLayoutView.js');

suite('Top Up layout attending to configuration >', function() {

  var ENABLED = true;
  var DISABLED = false;
  var ussdTopUpButton, codeTopUpButton, layoutView;

  setup(function() {
    ussdTopUpButton = document.createElement('button');
    codeTopUpButton = document.createElement('button');
    layoutView = new TopUpLayoutView(
      ussdTopUpButton,
      codeTopUpButton
    );
  });

  function assertElementIs(element, state) {
    assert.equal(element.disabled, !state);
    assert.equal(
      element.getAttribute('aria-hidden'),
      !state ? 'true' : 'false'
    );
  }

  function assertAllTopUpMethodsDisabled() {
    assertElementIs(ussdTopUpButton, DISABLED);
    assertElementIs(codeTopUpButton, DISABLED);
  }

  function assertAllTopUpMethodsEnabled() {
    assertElementIs(ussdTopUpButton, ENABLED);
    assertElementIs(codeTopUpButton, ENABLED);
  }

  function assertOnlyUSSDTopUpMethodEnabled() {
    assertElementIs(ussdTopUpButton, ENABLED);
    assertElementIs(codeTopUpButton, DISABLED);
  }

  function assertOnlyCodeTopUpMethodEnabled() {
    assertElementIs(ussdTopUpButton, DISABLED);
    assertElementIs(codeTopUpButton, ENABLED);
  }

  test(
    'All top up methods are disabled and hidden (no top up section)',
    function() {
      layoutView.setupLayout(undefined);
      assertAllTopUpMethodsDisabled();
    }
  );

  test(
    'All top up methods are disabled and hidden (empty top up section)',
    function() {
      layoutView.setupLayout({});
      assertAllTopUpMethodsDisabled();
    }
  );

  test('All top up methods are enabled and visible', function() {
    layoutView.setupLayout({
      ussd_destination: '000',
      destination: '000'
    });
    assertAllTopUpMethodsEnabled();
  });

  test('Only USSD top up method is enabled and visible', function() {
    layoutView.setupLayout({
      ussd_destination: '000'
    });
    assertOnlyUSSDTopUpMethodEnabled();
  });

  test('Only code top up method is enabled and visible', function() {
    layoutView.setupLayout({
      destination: '000'
    });
    assertOnlyCodeTopUpMethodEnabled();
  });

});
