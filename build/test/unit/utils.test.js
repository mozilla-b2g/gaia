'use strict';

var assert = require('chai').assert;
var utils = require('../../utils');

suite('utils.js', function() {
  test('isSubjectToBranding', function () {
    var path = 'shared/resources/branding';
    assert.isTrue(utils.isSubjectToBranding(path));
  });

  test('isSubjectToDeviceType', function () {
    var path = 'apps/settings/locales/device_type/phone/device.properties';
    assert.isTrue(utils.isSubjectToDeviceType(path));
  });

  test('isSubjectToDeviceType', function () {
    var path = 'gaia-l10n/fr/apps/settings/device_type/phone/device.properties';
    assert.isTrue(utils.isSubjectToDeviceType(path));
  });
});
