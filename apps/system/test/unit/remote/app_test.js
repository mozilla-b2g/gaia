/* global MocksHelper, BaseModule */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/remote/app.js');

var mocksForMultiScreenController = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/remote/App', function() {
  mocksForMultiScreenController.attachTestHelpers();

  var subject;

  setup(function() {
    window.location.hash = '#123';
    subject = BaseModule.instantiate('App');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('displayId', function() {
    test('should get the displayId from location.hash', function() {
      assert.equal(subject._displayId, 123);
    });

    test('should return displayId', function() {
      assert.equal(subject.displayId(), subject._displayId);
    });

    test('displayId should be -1 if location.hash is omitted', function() {
      window.location.hash = '';
      subject.stop();
      subject.start();
      assert.equal(subject._displayId, -1);
    });
  });
});
