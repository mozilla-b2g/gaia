/* global MocksHelper, MockGeolocation, FindMyDevice */

'use strict';

require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForFindMyDevice = new MocksHelper([
  'SettingsHelper', 'Geolocation', 'Dump'
]).init();

suite('FindMyDevice >', function() {
  var realL10n;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;
    sinon.stub(navigator.mozL10n, 'once', function(callback) {
      // we don't need to actually initialize FMD
      // for these unit tests, and it saves us from
      // mocking many objects
    });

    // We require findmydevice.js here and not above because
    // we want to make sure all of our dependencies have already
    // been loaded. For example, Find My Device has SettingsHelper
    // member variables, which need MockSettingsHelper to be installed
    // befor FindMyDevice is defined.
    require('/js/findmydevice.js', function() {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n.once.restore();
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.sinon.stub(FindMyDevice, '_contactServerIfEnabled');
  });

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
});
