/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global ActivityPicker, LinkActionHandler, MockL10n, MocksHelper */

'use strict';

requireApp('wappush/js/link_action_handler.js');

requireApp('wappush/test/unit/mock_activity_picker.js');
requireApp('wappush/test/unit/mock_l10n.js');
requireApp('wappush/test/unit/mock_moz_activity.js');

var mocksHelperLAH = new MocksHelper([
  'ActivityPicker',
  'MozActivity'
]).init();

suite('LinkActionHandler', function() {
  var realMozL10n, events;

  mocksHelperLAH.attachTestHelpers();

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    events = {
      url: {
        target: {
          dataset: {
            action: 'url-link',
            url: 'http://mozilla.com'
          }
        }
      }
    };
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {

    Object.keys(events).forEach(function(type) {
      events[type].preventDefault = this.sinon.spy();
      events[type].stopPropagation = this.sinon.spy();
    }, this);

    mocksHelperLAH.setup();
  });

  teardown(function() {
    mocksHelperLAH.teardown();
  });

  suite('onClick', function() {

    setup(function() {
      mocksHelperLAH.setup();
    });

    teardown(function() {
      LinkActionHandler.reset();
      mocksHelperLAH.teardown();
    });

    test('url-link ', function() {
      LinkActionHandler.onClick(events.url);

      assert.ok(ActivityPicker.url.called);
      assert.equal(ActivityPicker.url.calledWith[0], 'http://mozilla.com');
    });
  });
});
