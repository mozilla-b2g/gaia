'use strict';

var assert = require('chai').assert;
var utils = require('../../utils');

suite('utils.js', function() {
  test('isSubjectToBranding', function () {
    var path = 'shared/resources/branding';
    assert.isTrue(utils.isSubjectToBranding(path));
  });

  test('isSubjectToDeviceType', function () {
    var path = 'locales/device_type';
    assert.isTrue(utils.isSubjectToDeviceType(path));
  });
});
