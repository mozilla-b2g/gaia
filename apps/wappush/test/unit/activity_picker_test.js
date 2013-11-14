/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global ActivityPicker, MockL10n, MocksHelper, MozActivity */

'use strict';

requireApp('wappush/js/activity_picker.js');

requireApp('wappush/test/unit/mock_l10n.js');
requireApp('wappush/test/unit/mock_moz_activity.js');

var mocksHelperAP = new MocksHelper([
  'MozActivity'
]).init();

suite('ActivityPicker', function() {
  var realMozL10n, onsuccess, onerror;

  mocksHelperAP.attachTestHelpers();

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    onsuccess = function() {};
    onerror = function() {};
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    mocksHelperAP.setup();
  });

  teardown(function() {
    mocksHelperAP.teardown();
  });

  suite('url', function() {

    test('url(url) ', function() {
      ActivityPicker.url('http://mozilla.com');

      assert.deepEqual(MozActivity.calls[0], {
        name: 'view',
        data: {
          type: 'url',
          url: 'http://mozilla.com'
        }
      });
    });

    test('url(url, success) ', function() {
      ActivityPicker.url('http://mozilla.com', onsuccess);

      assert.equal(
        MozActivity.instances[0].onsuccess, onsuccess
      );

      assert.deepEqual(MozActivity.calls[0], {
        name: 'view',
        data: {
          type: 'url',
          url: 'http://mozilla.com'
        }
      });
    });

    test('url(url, success, error) ', function() {
      ActivityPicker.url('http://mozilla.com', onsuccess, onerror);

      assert.equal(
        MozActivity.instances[0].onsuccess, onsuccess
      );

      assert.equal(
        MozActivity.instances[0].onerror, onerror
      );

      assert.deepEqual(MozActivity.calls[0], {
        name: 'view',
        data: {
          type: 'url',
          url: 'http://mozilla.com'
        }
      });
    });
  });
});
