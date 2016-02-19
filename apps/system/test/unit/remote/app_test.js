/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global MocksHelper, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
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
    window.location.hash = '#test';
    subject = BaseModule.instantiate('App');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('displayId', function() {
    test('should get the displayId from location.hash', function() {
      assert.equal(subject._displayId, 'test');
    });

    test('should return displayId', function() {
      assert.equal(subject.displayId(), subject._displayId);
    });
  });
});
