'use strict';

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_rocketbar.js');

mocha.globals(['Title']);

var mocksHelperForTitle = new MocksHelper([
  'AppWindow',
  'Rocketbar'
]);
mocksHelperForTitle.init();

suite('system/Title', function() {
  var stubById;
  var fakeEvt;
  var fakeElement;
  mocksHelperForTitle.attachTestHelpers();

  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    chrome: true,
    title: 'default'
  };

  function check(content) {
    assert.equal(Title.element.innerHTML, content);
  }

  setup(function(done) {
    Rocketbar.enabled = true;
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('system/js/title.js', done);
  });

  teardown(function() {
    Rocketbar.enabled = false;
    stubById.restore();
  });

  suite('handleEvent', function() {
    test('default state', function() {
      check('');
    });

    test('shown should be true', function() {
      Title.content = 'Foo';
      check('Foo');
    });

    test('home event', function() {
      Title.content = 'Bar';
      window.dispatchEvent(new CustomEvent('home'));
      check('');
    });

    test('rocketbarhidden event', function() {
      window.dispatchEvent(new CustomEvent('rocketbarhidden'));
      assert.isTrue(!Title.element.classList.contains('hidden'));
    });

    test('rocketbarshown event', function() {
      window.dispatchEvent(new CustomEvent('rocketbarshown'));
      assert.isTrue(Title.element.classList.contains('hidden'));
    });

    test('app events', function() {

      var events = [
        'appforeground',
        'apploading',
        'apptitlechange'
      ];

      events.forEach(function(event, idx) {
        check('');
        fakeAppConfig.title = 'Test-' + idx;
        var detail = new AppWindow(fakeAppConfig);
        this.sinon.stub(detail, 'isActive').returns(true);

        window.dispatchEvent(new CustomEvent(event, {
          detail: detail}));
        check('Test-' + idx);

        // Reset the title
        Title.content = '';
      }, this);
    });

    test('title does not update if appwindow not active', function() {
      // Set the title to something initially
      fakeAppConfig.title = 'default';
      var detail = new AppWindow(fakeAppConfig);
      this.sinon.stub(detail, 'isActive').returns(true);

      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: detail}));
      check('default');

      fakeAppConfig.title = 'not updated';
      var detail = new AppWindow(fakeAppConfig);
      this.sinon.stub(detail, 'isActive').returns(false);
      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: detail}));
      check('default');
    });
  });
});
