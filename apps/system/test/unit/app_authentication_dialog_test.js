'use strict';

mocha.globals(['AppWindow', 'System', 'BaseUI', 'AppAuthenticationDialog']);

requireApp('system/test/unit/mock_app_window.js');

new MocksHelper([
  'AppWindow'
]).init().attachTestHelpers();

suite('system/AppAuthenticationDialog', function() {
  var clock, stubById;
  setup(function(done) {
    clock = sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');
    requireApp('system/js/app_authentication_dialog.js', done);
  });

  teardown(function() {
    clock.restore();
    stubById.restore();
  });

  var toCamelCase = function toCamelCase(str) {
    return str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  };

  function renderFakeElements(ad) {
    ad.element = document.createElement('div');
    ad.elementClasses.forEach(function createElementRef(name) {
      md.elements[toCamelCase(name)] = document.createElement('div');
    });
  };

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('new', function() {
    var app1 = new AppWindow(fakeAppConfig1);
    var auth1 = new AppAuthenticationDialog(app1);
  });
});
