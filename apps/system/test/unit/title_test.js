'use strict';
/* global AppWindow, AppWindowManager,
MocksHelper, MockL10n, Rocketbar, Title */

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/js/title.js');

mocha.globals(['Title']);

var mocksHelperForTitle = new MocksHelper([
  'AppWindow',
  'AppWindowManager',
  'Rocketbar'
]);
mocksHelperForTitle.init();

suite('system/Title', function() {
  var fakeElement;
  var activeAppStub;
  var realL10n;
  var subject;

  mocksHelperForTitle.attachTestHelpers();

  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    name: 'default'
  };

  function check(content) {
    assert.equal(subject.element.innerHTML, content);
  }

  setup(function() {
    Rocketbar.enabled = true;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';

    activeAppStub = this.sinon.stub(AppWindowManager, 'getActiveApp')
      .returns({
        isHomescreen: false
      });

    subject = new Title();
    subject.element = fakeElement;
  });

  teardown(function() {
    Rocketbar.enabled = false;
    navigator.mozL10n = realL10n;
    activeAppStub.restore();
  });

  suite('handleEvent', function() {
    test('default state', function() {
      check('');
    });

    test('shown should be true', function() {
      subject.content = 'Foo';
      check('Foo');
      subject.content = '';
    });

    test('rocketbarhidden event', function() {
      window.dispatchEvent(new CustomEvent('rocketbarhidden'));
      assert.isTrue(!subject.element.classList.contains('hidden'));
    });

    test('rocketbarshown event', function() {
      assert.equal(subject.element.textContent, '');
      subject.element.textContent = 'foo';
      window.dispatchEvent(new CustomEvent('rocketbarshown'));
      assert.isTrue(subject.element.classList.contains('hidden'));
      assert.equal(subject.element.textContent, '');
    });

    test('app events', function() {

      var events = [
        'appforeground',
        'apploading',
        'apptitlechange'
      ];

      events.forEach(function(event, idx) {
        check('');
        fakeAppConfig.name = 'Test-' + idx;
        var detail = new AppWindow(fakeAppConfig);
        this.sinon.stub(detail, 'isActive').returns(true);

        window.dispatchEvent(new CustomEvent(event, {
          detail: detail}));
        check('Test-' + idx);

        // Reset the title
        subject.content = '';
      }, this);
    });

    test('title does not update if appwindow not active', function() {
      // Set the title to something initially
      fakeAppConfig.name = 'default';
      var detail = new AppWindow(fakeAppConfig);
      this.sinon.stub(detail, 'isActive').returns(true);

      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: detail}));
      check('default');

      fakeAppConfig.title = 'not updated';
      detail = new AppWindow(fakeAppConfig);
      this.sinon.stub(detail, 'isActive').returns(false);
      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: detail}));
      check('default');
    });
  });

  suite('reset', function() {
    test('input will update', function() {
      subject.content = '';
      check('');

      activeAppStub.restore();
      Rocketbar.shown = false;
      this.sinon.stub(AppWindowManager, 'getActiveApp')
        .returns({
          isHomescreen: true
        });

      subject.reset();

      // Mock l10n test result
      check('search');
    });

    test('if expanded, title does not update', function() {
      subject.content = '';
      check('');

      activeAppStub.restore();
      this.sinon.stub(AppWindowManager, 'getActiveApp')
        .returns({
          isHomescreen: false
        });

      subject.reset();
      check('');
    });
  });
});
