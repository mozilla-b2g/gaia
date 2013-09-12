'use strict';

requireApp('communications/ftu/test/unit/mock_icc_helper.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');
requireApp('communications/ftu/test/unit/mock_xml_http_request.js');
requireApp('communications/ftu/js/variant.js');

var mocksHelperForVariant = new MocksHelper(['IccHelper', 'XMLHttpRequest']);
mocksHelperForVariant.init();

suite('variant >', function() {
  var realSettings;
  var mocksHelper = mocksHelperForVariant;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    mocksHelper.suiteSetup();
    VariantManager._variantCustomization = null;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
    mocksHelper.suiteTeardown();
  });

   test('getVariantSettings no json', function() {
    VariantManager.mcc_mnc = '220-033';
    VariantManager.getVariantSettings();
    assert.isNull(VariantManager._variantCustomization);
  });

  test('loads variant customizations (no Data)', function(done) {
    var data = {};
    VariantManager.mcc_mnc = '214-007';
    VariantManager.getVariantSettings(function() {
      assert.isNotNull(VariantManager._variantCustomization);
      assert.isUndefined(VariantManager._variantCustomization['wallpaper']);
      done();
    });
    MockXMLHttpRequest.mSendOnLoad({ response: data });
  });

  test('loads variant customizations from file OK', function(done) {
    var data = {'wallpaper' : 'data:image/jpeg;base64,/9j/4AAQSkZJ'};
    VariantManager.mcc_mnc = '214-007';
    VariantManager.getVariantSettings(function() {
      assert.isNotNull(VariantManager._variantCustomization);
      assert.equal(VariantManager._variantCustomization['wallpaper'],
        'data:image/jpeg;base64,/9j/4AAQSkZJ');
      done();
    });
    MockXMLHttpRequest.mSendOnLoad({ response: data });
  });
});
