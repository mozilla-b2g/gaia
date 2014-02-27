/* global MocksHelper */
/* global CustomLogoPath */
/* global MockXMLHttpRequest */

'use strict';

require('/shared/test/unit/mocks/mock_xmlhttprequest.js');
requireApp('system/test/unit/mock_logo_loader.js');

var mocksInitLogoHandler = new MocksHelper([
  'XMLHttpRequest'
]);

mocksInitLogoHandler.init();

requireApp('system/js/init_logo_handler.js');

suite('init_logo_handler_test.js >', function() {
  var mocksHelper = mocksInitLogoHandler;
  var OPER_RESOURCES_APP = 'app://operatorresources';
  var DEFAULT_VIDEO_ON = '/resources/power/carrier_power_on.mp4';
  var DEFAULT_VIDEO_OFF = '/resources/power/carrier_power_off.mp4';
  var DEFAULT_IMAGE_ON = '/resources/power/carrier_power_on.png';
  var DEFAULT_IMAGE_OFF = '/resources/power/carrier_power_off.png';

  suiteSetup(function() {
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    CustomLogoPath.init();
    mocksHelper.setup();
  });

  teardown(function() {
    mocksHelper.teardown();
  });

  function sendResponseText(text) {
    MockXMLHttpRequest.mSendOnLoad({
      responseText: text
    });
  }

  function assertCustomLogoPathValues(videoOn, imageOn, videoOff, imageOff) {
    var poweron = CustomLogoPath.poweron;
    var poweroff = CustomLogoPath.poweroff;
    assert.ok(poweron);
    assert.equal(poweron.video, videoOn || DEFAULT_VIDEO_ON);
    assert.equal(poweron.image, imageOn || DEFAULT_IMAGE_ON);
    assert.ok(poweroff);
    assert.equal(poweroff.video, videoOff || DEFAULT_VIDEO_OFF);
    assert.equal(poweroff.image, imageOff || DEFAULT_IMAGE_OFF);
  }

  test('OperatorResources App installed and has same values >', function() {
    var VIDEO_ON = '/resources/carrier_power_on.mp4';
    var IMAGE_OFF = '/resources/carrier_power_off.npg';
    sendResponseText('{"poweron": { ' +
                         '"video": "' + VIDEO_ON + '"},' +
                       '"poweroff": { ' +
                         '"image": "' + IMAGE_OFF + '"}}');
    assertCustomLogoPathValues(OPER_RESOURCES_APP + VIDEO_ON, undefined,
                               undefined, OPER_RESOURCES_APP + IMAGE_OFF);
  });

  test('OperatorResources App installed and has not data >', function() {
    sendResponseText('{}');
    assertCustomLogoPathValues();
  });

  test('OperatorResourcesApp installed, dataErrors >', function() {
    sendResponseText('{ Something that is wrong {');
    assertCustomLogoPathValues();
  });

  test('OperatorResources App not installed >', function() {
    MockXMLHttpRequest.mSendError();
    assertCustomLogoPathValues();
  });
});
