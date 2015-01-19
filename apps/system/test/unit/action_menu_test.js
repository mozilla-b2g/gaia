'use strict';
/* global ActionMenu, SystemDialog, MockL10n */

require('/shared/test/unit/load_body_html_helper.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/system_dialog.js');
requireApp('system/js/action_menu.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForActionMenu = new MocksHelper([
  'Service'
]).init();

suite('ActionMenu', function() {
  var rafStub, realL10n, stubById, actionMenu, systemHideStub,
    controller, renderStub, publishStub, systemShowStub;

  function getListItems(number) {
    var items = [];
    for (var i = 0; i < number; i++) {
      items.push({
        label: 'label' + i,
        icon: null,
        manifest: null,
        value: i
      });
    }
    return items;
  }

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    rafStub = this.sinon.stub(window, 'requestAnimationFrame',
                         function(callback) { callback(); });

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    ActionMenu.prototype.containerElement =
      document.createElement('div');

    renderStub = this.sinon.stub(ActionMenu.prototype, 'render');
    publishStub = this.sinon.stub(ActionMenu.prototype, 'publish');
    systemShowStub = this.sinon.stub(SystemDialog.prototype, 'show');
    systemHideStub = this.sinon.stub(SystemDialog.prototype, 'hide');
    controller = {
      successCb: this.sinon.stub(),
      cancelCb: this.sinon.stub()
    };
    actionMenu = new ActionMenu(controller);
    actionMenu.element = document.createElement('div');
    actionMenu._fetchElements();
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
  });

  suite('Instantation > ', function() {
    test('renders the view and publish created', function() {
      assert.isTrue(renderStub.called);
      assert.isTrue(publishStub.calledWith('created'));
    });
  });

  suite('Show > ', function() {
    setup(function() {
      actionMenu.element = document.createElement('div');
      actionMenu._fetchElements();
    });

    test('Calls to parent .show method', function() {
      actionMenu.show([]);
      assert.isTrue(systemShowStub.called);
      assert.isTrue(actionMenu.form.classList.contains('visible'));
    });

    test('Renders the list of items and the cancel button', function() {
      var numberActions = 2;
      actionMenu.show(getListItems(numberActions));
      var menu = actionMenu.menu;
      var buttons = menu.getElementsByTagName('button');
      assert.isTrue(buttons.length === (numberActions + 1));
      assert.ok(buttons[numberActions].dataset.action === 'cancel');
    });

    test('Renders the default option', function() {
      actionMenu.show(getListItems(1), 'title', true);

      var input = actionMenu.menu.getElementsByTagName('input');
      assert.ok(input);
    });

    test('Sets the title', function() {
      var title = 'title';
      actionMenu.show(getListItems(1), title);
      assert.isTrue(actionMenu.header.dataset.l10nId === title);
    });
  });

  suite('Hide > ', function() {
    test('Calls to parent .hide method after transition', function() {
      actionMenu.hide();
      var evt = new CustomEvent('transitionend');
      actionMenu.form.dispatchEvent(evt);
      assert.isTrue(systemHideStub.called);
      assert.isFalse(actionMenu.form.classList.contains('visible'));
    });
  });

  suite('Events > ', function() {
    test('calls to successCb on item click', function() {
      actionMenu.show(getListItems(2));
      var selected = 1;
      var items = actionMenu.menu.getElementsByTagName('button');
      items[selected].click();
      assert.isTrue(controller.successCb.calledWith(selected, false));
    });

    test('calls to cancelCb on cancel click', function() {
      actionMenu.show(getListItems(2));
      var selected = 2;
      var items = actionMenu.menu.getElementsByTagName('button');
      items[selected].click();
      assert.isTrue(controller.cancelCb.called);
    });

    test('sends the default checkbox value', function() {
      actionMenu.show(getListItems(2), '', true);
      var selected = 1;
      var items = actionMenu.menu.getElementsByTagName('button');
      var selector = '[data-action="set-default-action"]';
      var defaultInput = actionMenu.menu.querySelector(selector);
      defaultInput.click();
      items[selected].click();
      assert.isTrue(controller.successCb.calledWith(selected, true));
    });
  });
});
