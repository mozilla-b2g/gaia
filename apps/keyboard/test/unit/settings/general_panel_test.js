'use strict';

/* global BaseView, GeneralSettingsGroupView, HandwritingSettingsGroupView,
          LayoutItemListView, GeneralPanel, PanelController, MockEventTarget */

require('/shared/test/unit/mocks/mock_event_target.js');

require('/js/settings/base_view.js');
require('/js/settings/general_settings_view.js');
require('/js/settings/handwriting_settings_view.js');
require('/js/settings/layout_item_list_view.js');
require('/js/settings/general_panel.js');
require('/js/settings/panel_controller.js');

suite('General Panel', function() {
  var panel;
  var app;
  var stubContainer;
  var stubHeader;
  var stubMenuUDItem;
  var stubGetElemById;
  var stubLayoutItemListView;
  var stubGeneralSettingsGroupView;
  var stubHandwritingSettingsGroupView;

  setup(function() {
    stubLayoutItemListView =
      this.sinon.stub(Object.create(LayoutItemListView.prototype));
    this.sinon.stub(window, 'LayoutItemListView')
      .returns(stubLayoutItemListView);

    stubGeneralSettingsGroupView =
      this.sinon.stub(Object.create(GeneralSettingsGroupView.prototype));
    this.sinon.stub(window, 'GeneralSettingsGroupView')
      .returns(stubGeneralSettingsGroupView);

    stubHandwritingSettingsGroupView =
      this.sinon.stub(Object.create(HandwritingSettingsGroupView.prototype));
    this.sinon.stub(window, 'HandwritingSettingsGroupView')
      .returns(stubHandwritingSettingsGroupView);

    app = {
      panelController: this.sinon.stub(new PanelController()),
      requestClose: this.sinon.stub()
    };

    panel = new GeneralPanel(app);

    stubHeader = this.sinon.stub(new MockEventTarget());

    stubContainer = {
      querySelector:
        this.sinon.stub().returns(stubHeader)
    };

    stubMenuUDItem = this.sinon.stub(new MockEventTarget());
    stubGetElemById = this.sinon.stub(document, 'getElementById');

    stubGetElemById
      .withArgs('menu-userdict').returns(stubMenuUDItem)
      .withArgs('general').returns(stubContainer);

    panel.start();

    assert.equal(panel.container, stubContainer);
    assert.equal(panel._menuUDItem, stubMenuUDItem);

    assert.isTrue(window.LayoutItemListView.calledWith(app));
    assert.isTrue(window.GeneralSettingsGroupView.calledWith(app));
    assert.isTrue(window.HandwritingSettingsGroupView.calledWith(app));

    assert.isTrue(stubLayoutItemListView.start.called);
    assert.isTrue(stubGeneralSettingsGroupView.start.called);
    assert.isTrue(stubHandwritingSettingsGroupView.start.called);
  });

  teardown(function() {
    panel.stop();
  });

  test('inheritance from BaseView', function() {
    assert.instanceOf(panel, BaseView);
  });

  suite('Transition hooks', function() {
    test('show', function() {
      var stubBaseShow =
        this.sinon.stub(BaseView.prototype, 'show').returns('ShowReturn');

      var ret = panel.show();

      assert.equal(ret, 'ShowReturn');

      assert.isTrue(stubHeader.addEventListener.calledWith('action', panel));
      assert.isTrue(stubMenuUDItem.addEventListener.calledWith('click', panel));

      assert.isTrue(stubBaseShow.calledOn(panel));
    });

    test('beforeHide', function() {
      var stubBaseBeforeHide =
        this.sinon.stub(BaseView.prototype, 'beforeHide')
          .returns('BeforeHideReturn');

      var ret = panel.beforeHide();

      assert.equal(ret, 'BeforeHideReturn');

      assert.isTrue(stubHeader.removeEventListener.calledWith('action', panel));
      assert.isTrue(
        stubMenuUDItem.removeEventListener.calledWith('click', panel));

      assert.isTrue(stubBaseBeforeHide.calledOn(panel));
    });
  });

  suite('Event handling', function() {
    test('action -> app.requstClose', function() {
      panel.handleEvent({type: 'action'});

      assert.isTrue(app.requestClose.called);
    });

    test('click -> navigate to user dictionary list panel', function() {
      var spyPreventDefault = this.sinon.spy();

      panel.handleEvent({
        type: 'click',
        preventDefault: spyPreventDefault
      });

      assert.isTrue(app.panelController.navigateToPanel.calledWith(
        app.panelController.userDictionaryListPanel));

      assert.isTrue(spyPreventDefault.called);
    });
  });
});
