/* global Attention,
  MockL10n,
  MockNavigatormozApps,
  MockNotification,
  MockNotifications,
  MocksHelper,
  Utils
*/

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_utils.js');

require('/js/attention/attention.js');

var mocksHelperForAttention = new MocksHelper([
  'Notification',
  'NotificationHelper',
  'Utils'
]);

suite('Network Alerts - Attention Screen', function() {
  var title,
      localizedTitle,
      body;

  var realL10n = navigator.mozL10n;
  var realMozApps = navigator.mozApps;
  var realOpener;

  mocksHelperForAttention.attachTestHelpers();

  suiteSetup(function() {
    realOpener = Object.getOwnPropertyDescriptor(window, 'opener');

    Object.defineProperty(window, 'opener', {
       writable: true,
       enumerable: true,
       configurable: true,
       value: {
         close: function() {}
       }
    });
  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'opener', realOpener);
  });

  setup(function() {
    loadBodyHTML('/attention.html');

    title = 'title-id';
    localizedTitle = 'some title';
    body = 'some body';

    this.sinon.stub(Utils, 'parseParams').returns({
      title: title,
      body: body
    });
    this.sinon.stub(window.opener, 'close');

    navigator.mozL10n = MockL10n;
    this.sinon.stub(navigator.mozL10n, 'once').yields();
    this.sinon.stub(navigator.mozL10n, 'get').withArgs(title)
                                             .returns(localizedTitle);

    navigator.mozApps = MockNavigatormozApps;

    Attention.init();
    Attention.render();
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    MockNavigatormozApps.mTeardown();
    navigator.mozApps = realMozApps;
  });

  test('form is properly displayed', function() {
    assert.equal(
      document.querySelector('h1').getAttribute('data-l10n-id'),
      title,
      'The title is properly displayed'
    );
    assert.equal(
      document.querySelector('p').textContent, body,
      'The body is properly displayed'
    );
  });

  test('Notification should be displayed', function() {
    MockNavigatormozApps.mTriggerLastRequestSuccess();

    assert.equal(MockNotifications[0].title, localizedTitle);
    assert.equal(MockNotifications[0].body, body);
    assert.ok(MockNotifications[0].icon.endsWith('titleID=' + title));
  });

  test('Notification should not be displayed if mozApp got error', function() {
    MockNavigatormozApps.mLastRequest.onerror();

    assert.equal(MockNotifications.length, 0);
  });

  test('click button: closes window', function() {
    document.querySelector('button').click();

    sinon.assert.called(window.opener.close);
  });

  test('display from notification, Notification should not be displayed',
  function() {
    Utils.parseParams.returns({
      title: title,
      body: body,
      notification: 1
    });

    MockNotification.mTeardown();
    Attention.init();

    assert.isUndefined(
      MockNotifications[0],
      'should not send a new notification'
    );
  });

  suite('on visibility change', function() {
    var realVisibility,
        isDocumentHidden;

    suiteSetup(function() {
      realVisibility = Object.getOwnPropertyDescriptor(document, 'hidden');

      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return isDocumentHidden;
        }
      });
    });

    suiteTeardown(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return realVisibility;
        }
      });
    });

    setup(function() {
      document.querySelector('h1').style.height = '10px';
    });

    test('do nothing while app visible',function() {
      isDocumentHidden = false;
      document.dispatchEvent(new CustomEvent('visibilitychange'));

      sinon.assert.notCalled(window.opener.close);
    });

    test('do nothing while app hidden but not resized',function() {
      isDocumentHidden = true;
      document.dispatchEvent(new CustomEvent('visibilitychange'));

      sinon.assert.notCalled(window.opener.close);
    });

    test('close window while app hidden and resized',function() {
      isDocumentHidden = true;
      document.querySelector('h1').style.height = '';
      document.dispatchEvent(new CustomEvent('visibilitychange'));

      sinon.assert.called(window.opener.close);
    });
  });
});
