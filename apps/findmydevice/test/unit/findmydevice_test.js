/* global MocksHelper, MockGeolocation, MockNavigatormozSetMessageHandler,
   MockNavigatorSettings, FindMyDevice,
   IAC_API_WAKEUP_REASON_LOGIN, IAC_API_WAKEUP_REASON_LOGOUT,
   IAC_API_WAKEUP_REASON_TRY_DISABLE
*/

'use strict';

require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/js/findmydevice_iac_api.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForFindMyDevice = new MocksHelper([
  'Geolocation', 'Dump', 'SettingsHelper'
]).init();

suite('FindMyDevice >', function() {
  var realL10n;
  var realMozId;
  var realMozSettings;
  var realMozSetMessageHandler;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;
    sinon.stub(navigator.mozL10n, 'once', function(callback) {
      // we don't need to actually initialize FMD
      // for these unit tests, and it saves us from
      // mocking many objects
    });

    realMozId = navigator.mozId;
    // attempting to stub only the request method of mozId,
    // as in |sinon.stub(navigator.mozId, 'request', ...)|,
    // causes an exception to be raised, so we replace the
    // entire mozId object.
    navigator.mozId = {
      request: sinon.stub()
    };

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSetup();

    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    // We require findmydevice.js here and not above because
    // we want to make sure all of our dependencies have already
    // been loaded.
    require('/js/findmydevice.js', function() {
      FindMyDevice._observeSettings();
      FindMyDevice._initMessageHandlers();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n.once.restore();
    navigator.mozL10n = realL10n;

    navigator.mozId = realMozId;

    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();

    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mTeardown();
  });

  setup(function(done) {
    this.sinon.stub(FindMyDevice, '_contactServerIfEnabled');
    // XXX(ggp) force re-creation of the SettingsHelper objects
    // used by FMD, since MockSettingsHelper invalidates all objects
    // in its mTeardown.
    FindMyDevice._initSettings(done);
  });

  teardown(function() {
    FindMyDevice._enabled = false;
    FindMyDevice._registered = false;
    FindMyDevice._loggedIn = false;
    FindMyDevice._state = null;
  });

  function sendWakeUpMessage(reason) {
    var port = {};
    MockNavigatormozSetMessageHandler.mTrigger('connection',
      {port: port, keyword: 'findmydevice-wakeup'});
    port.onmessage({data: reason});
  }

  test('fields from coordinates are included in server response', function() {
    FindMyDevice._replyCallback('t', true, MockGeolocation.fakePosition);
    assert.isTrue(FindMyDevice._contactServerIfEnabled.called);
    assert.deepEqual(FindMyDevice._reply.t, {
      ok: true,
      la: MockGeolocation.fakePosition.coords.latitude,
      lo: MockGeolocation.fakePosition.coords.longitude,
      acc: MockGeolocation.fakePosition.coords.accuracy,
      ti: MockGeolocation.fakePosition.timestamp
    });
  });

  test('error message is included in the server response', function() {
    var message = 'error message';
    FindMyDevice._replyCallback('t', false, message);
    assert.isTrue(FindMyDevice._contactServerIfEnabled.called);
    assert.equal(FindMyDevice._reply.t.error, message);
  });

  suite('findmydevice.current-clientid behavior', function() {
    setup(function() {
      this.sinon.spy(FindMyDevice._currentClientIDHelper, 'set');
    });

    test('invalidate client id when logged in', function() {
      sendWakeUpMessage(IAC_API_WAKEUP_REASON_LOGIN);
      assert.isTrue(FindMyDevice._loggedIn, 'not logged in after login event');
      sinon.assert.calledWith(FindMyDevice._currentClientIDHelper.set, '');
    });

    test('invalidate client id when logged out', function() {
      sendWakeUpMessage(IAC_API_WAKEUP_REASON_LOGOUT);
      assert.isFalse(FindMyDevice._loggedIn, 'logged in after logout event');
      sinon.assert.calledWith(FindMyDevice._currentClientIDHelper.set, '');
    });
  });

  suite('findmydevice.can-disable behavior', function() {
    setup(function() {
      this.sinon.spy(FindMyDevice._canDisableHelper, 'set');
    });

    test('set findmydevice.can-disable to false when logged out', function() {
      FindMyDevice._loggedIn = false;
      MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: ''});
      sinon.assert.calledWith(FindMyDevice._canDisableHelper.set, false);
    });

    test('allow disabling when clientid matches the state', function() {
      FindMyDevice._loggedIn = true;
      FindMyDevice._state = {clientid: 'clientid'};

      MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: 'clientid'});
      sinon.assert.calledWith(FindMyDevice._canDisableHelper.set, true);
    });

    test('disallow disabling when clientid doesn\'t match the state',
    function() {
      FindMyDevice._loggedIn = true;
      FindMyDevice._state = {clientid: 'wrong clientid'};

      MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: 'clientid'});
      sinon.assert.calledWith(FindMyDevice._canDisableHelper.set, false);
    });
  });

  test('request client id when invalidated', function() {
    FindMyDevice._loggedIn = true;
    FindMyDevice._registered = true;
    FindMyDevice._state = {clientid: 'clientid'};

    this.sinon.stub(FindMyDevice, '_refreshClientIDIfRegistered');
    MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
      {settingValue: ''});
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, false);
  });

  test('refresh authentication when attempting to disable', function() {
    FindMyDevice._loggedIn = true;
    FindMyDevice._registered = true;

    this.sinon.spy(FindMyDevice, '_refreshClientIDIfRegistered');
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_TRY_DISABLE);
    assert.isTrue(FindMyDevice._disableAttempt);
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, true);
    assert.isTrue(
      navigator.mozId.request.calledWithMatch(
        {refreshAuthentication: 0}));
  });

  test('contact the server on alarm', function() {
    this.sinon.stub(FindMyDevice, '_refreshClientIDIfRegistered');
    MockNavigatormozSetMessageHandler.mTrigger('alarm');
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, false);
    sinon.assert.called(FindMyDevice._contactServerIfEnabled);
  });
});
