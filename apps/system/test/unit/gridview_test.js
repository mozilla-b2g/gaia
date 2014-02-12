'use strict';
/* global MocksHelper, MockSettingsListener, GridView */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/gridview.js');
mocha.globals(['GridView']);

mocha.globals(['addEventListener', 'removeEventListener']);

var mocksForGridView = new MocksHelper([
  'SettingsListener'
]).init();

suite('system/GridView', function() {
  var stubById;
  var fakeElement;
  var subject;

  mocksForGridView.attachTestHelpers();
  setup(function() {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    subject = new GridView();
  });

  teardown(function() {
    stubById.restore();
  });

  suite('constructor', function() {
    test('calls hide', function() {
      var hideStub = this.sinon.stub(GridView.prototype, 'hide');
      subject = new GridView();
      MockSettingsListener.mCallbacks['debug.grid.enabled'](false);
      assert.ok(hideStub.calledOnce);
    });

    test('calls show', function() {
      var showStub = this.sinon.stub(GridView.prototype, 'show');
      subject = new GridView();
      MockSettingsListener.mCallbacks['debug.grid.enabled'](true);
      assert.ok(showStub.calledOnce);
    });
  });

  suite('hide', function() {
    test('changes visibility', function() {
      subject.show();
      assert.ok(subject.visible);
      subject.hide();
      assert.ok(!subject.visible);
    });
  });

  suite('show', function() {
    test('changes visibility', function() {
      assert.ok(!subject.visible);
      subject.show();
      assert.ok(subject.visible);
    });
  });
});
