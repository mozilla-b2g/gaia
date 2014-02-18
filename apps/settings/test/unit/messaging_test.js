'use strict';

requireApp('settings/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('settings/test/unit/mock_l10n.js');

requireApp('settings/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('settings/js/messaging.js');

var mocksForMessaging = new MocksHelper([
  'SettingsListener',
  'IccHelper'
]).init();

suite('Messaging settings', function() {
  var realMozSettings;
  var realMozL10n;
  var elementIds;

  mocksForMessaging.attachTestHelpers();
  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    var messagingNodes =
      '<div>' +
        '<ul>' +
          '<li id="menuItem-cellBroadcast" aria-disabled="true">' +
            '<label class="pack-switch checkbox-label">' +
              '<input type="checkbox" data-ignore disabled />' +
              '<span></span>' +
            '</label>' +
          '</li>' +
        '</ul>' +
        '<ul id="general-message-list">' +
          '<li id="menuItem-deliveryReport"' +
              'aria-disabled="true" class="hint">' +
            '<label class="pack-switch">' +
              '<input type="checkbox" ' +
                     'name="ril.sms.requestStatusReport.enabled"/>' +
              '<span></span>' +
            '</label>' +
          '</li>' +
        '</ul>' +
        '<ul id="mmsSettings-list">' +
          '<li id="menuItem-readReport"' +
              'aria-disabled="true" class="hint">' +
            '<label class="pack-switch">' +
              '<input type="checkbox" ' +
                     'name="ril.mms.requestReadReport.enabled"/>' +
              '<span></span>' +
            '</label>' +
          '</li>' +
        '</ul>' +
        '<ul class="mmsSettings-list">' +
          '<li id="menuItem-autoRetrieve" aria-disabled="true" class="hint">' +
            '<span class="button icon icon-dialog">' +
              '<select name="ril.mms.retrieval_mode">' +
              '</select>' +
            '</span>' +
          '</li>' +
        '</ul>' +
        '<ul>' +
          '<li id="menuItem-wapPush" aria-disabled="true">' +
            '<label class="pack-switch">' +
              '<input type="checkbox" name="wap.push.enabled"/>' +
              '<span></span>' +
            '</label>' +
          '</li>' +
        '</ul>' +
      '</div>';

    // Insert the nodes just inside the body, after its last child.
    document.body.insertAdjacentHTML('beforeend', messagingNodes);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    elementIds = ['menuItem-deliveryReport',
                  'menuItem-readReport',
                  'menuItem-autoRetrieve',
                  'menuItem-wapPush',
                  'menuItem-cellBroadcast'];
  });

  suite('init function, cardState ready', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'ready';
      Messaging.init();
    });

    test('panel items are enabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isFalse(input.disabled);
      });
    });
  });

  suite('init function, cardState illegal', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'illegal';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState unknown', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'unknown';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState absent', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = null;
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState pinRequired', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'pinRequired';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState pukRequired', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'pukRequired';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState personalizationInProgress', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'personalizationInProgress';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState personalizationReady', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'personalizationReady';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState networkLocked', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'networkLocked';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState networkSubsetLocked', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'networkSubsetLocked';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState corporateLocked', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'corporateLocked';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState serviceProviderLocked', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'serviceProviderLocked';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState simPersonalizationLock', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'simPersonalizationLock';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState networkPukRequired', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'networkPukRequired';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState networkSubsetPukRequired', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'networkSubsetPukRequired';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState corporatePukRequired', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'corporatePukRequired';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState serviceProviderPukRequired', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'serviceProviderPukRequired';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });

  suite('init function, cardState simPersonalizationPukRequired', function() {
    setup(function() {
      MockIccHelper.mProps.cardState = 'simPersonalizationPukRequired';
      Messaging.init();
    });

    test('panel items are disabled', function() {
      elementIds.forEach(function(id) {
        var element = document.getElementById(id);
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        assert.isTrue(input.disabled);
      });
    });
  });
});
