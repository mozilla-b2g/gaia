/* global MocksHelper, AppWindow, ContextMenuView */

'use strict';
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/context_menu_view.js');

var mocksForAppModalDialog = new MocksHelper([
  'AppWindow'
]).init();

suite('ContextMenuView', function() {

  mocksForAppModalDialog.attachTestHelpers();

  var contextMenu, fakeApp;

  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  var fakeMenuItem1 = {
    id: 'fake-menu-1',
    label: 'fake-menu-1',
    icon: 'fake-icon-1',
    callback: function() {}
  };
  var fakeMenuItem2 = {
    id: 'fake-menu-2',
    label: 'fake-menu-2',
    icon: 'fake-icon-2',
    callback: function() {}
  };

  setup(function() {
    fakeApp = new AppWindow(fakeAppConfig);
    contextMenu = new ContextMenuView({
      'app': fakeApp,
      'containerElement': fakeApp.element
    });
  });

  test('show(fakeMenus)', function() {
    this.sinon.stub(fakeApp, 'blur');

    contextMenu.show([fakeMenuItem1, fakeMenuItem2]);

    assert.isTrue(fakeApp.blur.called);
    assert.isTrue(contextMenu.isShown());
    assert.isTrue(contextMenu.element.classList.contains('visible'));
    // validate first menu item
    var menu1 = contextMenu.elements.list.querySelector('button:first-child');
    assert.equal(menu1.textContent, fakeMenuItem1.label);
    assert.equal(menu1.style.backgroundImage,
                 'url("' + fakeMenuItem1.icon + '")');
    // validate second menu item
    var menu2 = contextMenu.elements.list.querySelector('button:nth-child(2)');
    assert.equal(menu2.textContent, fakeMenuItem2.label);
    assert.equal(menu2.style.backgroundImage,
                 'url("' + fakeMenuItem2.icon + '")');
  });

  test('click menu', function() {
    contextMenu.show([fakeMenuItem1, fakeMenuItem2]);
    assert.isTrue(contextMenu.element.classList.contains('visible'));

    var callbackStub = this.sinon.stub(fakeMenuItem1, 'callback');

    contextMenu.elements.list.querySelector('button:first-child').click();
    assert.isTrue(callbackStub.called);
    assert.isFalse(contextMenu.isShown());

    callbackStub.restore();
  });

  test('click cancel', function() {
    contextMenu.show([fakeMenuItem1, fakeMenuItem2]);
    contextMenu.element.querySelector('#ctx-cancel-button').click();
    assert.isFalse(contextMenu.isShown());
  });

});
