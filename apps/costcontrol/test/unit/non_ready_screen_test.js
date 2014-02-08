'use strict';

requireApp('costcontrol/test/unit/mock_common.js');
requireApp('costcontrol/test/unit/mock_moz_l10n.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('costcontrol/js/views/NonReadyScreen.js');

/* global NonReadyScreen */

var realCommon, realMozL10n;

if (!window.Common) {
  window.Common = null;
}

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

suite('SIM non-ready waiting screen >', function() {

  var CARD_STATES = [null, 'pinRequired', 'pukRequired', 'other'];
  var EXPECTED_IDS = ['no-sim2', 'sim-locked', 'sim-locked', undefined];
  var EXPECTED_MODES = [
    assertMessageMode,
    assertMessageMode,
    assertMessageMode,
    assertWaitingMode
  ];

  var screen;
  var container, progress, buttonContainer, button, header, message;

  suiteSetup(function() {
    realCommon = window.Common;
    window.Common = new window.MockCommon();

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;
  });

  suiteTeardown(function() {
    window.Common = realCommon;
    window.navigator.mozL10n = realMozL10n;
  });

  setup(function() {

    buttonContainer = document.createElement('div');
    button = document.createElement('button');
    header = document.createElement('h3');
    message = document.createElement('p');
    progress = document.createElement('progress');

    buttonContainer.appendChild(button);

    container = document.createElement('div');
    container.appendChild(progress);
    container.appendChild(header);
    container.appendChild(message);
    container.appendChild(buttonContainer);
    container.id = 'test';

    screen = new NonReadyScreen(container);
  });

  function assertMessageMode(cardstate) {
    assert.equal(progress.getAttribute('aria-hidden'), 'true');
    assert.equal(header.getAttribute('aria-hidden'), 'false');
    assert.equal(message.getAttribute('aria-hidden'), 'false');
  }

  function assertWaitingMode() {
    assert.equal(progress.getAttribute('aria-hidden'), 'false');
    assert.equal(header.getAttribute('aria-hidden'), 'true');
    assert.equal(message.getAttribute('aria-hidden'), 'true');
  }

  test(
    'Gets the correct message id for the card states.',
    function() {
      var message;
      CARD_STATES.forEach(function(state, i) {
        message = screen.getMessageIdFor(state);
        assert.strictEqual(message, EXPECTED_IDS[i]);
      });
    }
  );

  test(
    'setWaitingMode() hides the message and shows the progress.',
    function() {
      screen.setWaitingMode();
      assertWaitingMode();
    }
  );

  test(
    'setMessageMode() shows the message and hides the progress.',
    function() {
      var cardstate = 'pinRequired';
      screen.setMessageMode(cardstate);
      assertMessageMode();
    }
  );

  test(
    'updateForState() sets the non ready screen in proper mode according to ' +
    'the card state.',
    function() {
      CARD_STATES.forEach(function(state, i) {
        screen.updateForState(state);
        EXPECTED_MODES[i](state);
      });
    }
  );

});
