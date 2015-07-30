define(function(require) {
  'use strict';

  var ListView = require('modules/mvvm/list_view');
  var OperatorManager =
    require('panels/operator_settings/models/operator_manager');
  var OperatorItemTemplate =
    require('panels/operator_settings/views/operator_item_template');

  function AvailableOperatorList(root) {
    this._operatorManager = null;
    this._root = root;

    this._elements = {
      operatorListRoot: root.querySelector('.available-operators-list'),
      searchBtnListItem: root.querySelector('.search-btn-li'),
      searchBtn: root.querySelector('.search-btn'),
      operatorListInfo: root.querySelector('.search-info')
    };

    this._operatorListView =
      ListView(this._elements.operatorListRoot, null,
        OperatorItemTemplate((operatorItem) => {
          this._operatorManager.connect(operatorItem);
      }));

    this._elements.searchBtn.addEventListener('click', () => {
      this._operatorManager.search();
    });

    this._boundUpdateVisibility = this._updateVisibility.bind(this);
    this._boundUpdateInfo = this._updateInfo.bind(this);
  }

  AvailableOperatorList.prototype.init = function(operatorManager) {
    this._operatorManager = operatorManager;
    if (!this._operatorManager) {
      return;
    }

    // When auto selection state changes, we need to update the visibility of
    // the items.
    this._operatorManager.observe('autoSelectionState',
      this._boundUpdateVisibility);
    this._boundUpdateVisibility(this._operatorManager.autoSelectionState);

    // Update the information.
    this._operatorManager.observe('autoSelectionState',
      this._boundUpdateInfo);
    this._operatorManager.observe('searching', this._boundUpdateInfo);
    this._boundUpdateInfo();
    
    this._operatorListView.set(this._operatorManager.operators);
    this._operatorListView.enabled = true;
  };

  AvailableOperatorList.prototype.uninit = function() {
    if (!this._operatorManager) {
      return;
    }

    this._operatorManager.unobserve('autoSelectionState',
      this._boundUpdateVisibility);
    this._operatorManager.unobserve('autoSelectionState',
      this._boundUpdateInfo);
    this._operatorManager.unobserve('searching', this._boundUpdateInfo);

    this._operatorListView.set(null);
    this._operatorListView.enabled = false;

    this._operatorManager = null;
  };

  AvailableOperatorList.prototype._updateVisibility =
    function(autoSelectionState) {
      switch (autoSelectionState) {
        case OperatorManager.AUTO_SELECTION_STATE.ENABLED:
          this._elements.operatorListRoot.hidden = true;
          this._elements.searchBtnListItem.hidden = true;
          break;
        case OperatorManager.AUTO_SELECTION_STATE.DISABLED:
          this._elements.operatorListRoot.hidden = false;
          this._elements.searchBtnListItem.hidden = false;
          break;
      }
  };

  AvailableOperatorList.prototype._updateInfo = function() {
    switch (this._operatorManager.autoSelectionState) {
      case OperatorManager.AUTO_SELECTION_STATE.ENABLED:
        this._elements.operatorListInfo.hidden = false;
        this._elements.operatorListInfo
          .setAttribute('data-l10n-id', 'operator-turnAutoSelectOff');
        break;
      case OperatorManager.AUTO_SELECTION_STATE.DISABLED:
        if (this._operatorManager.searching) {
          this._elements.operatorListInfo.hidden = false;
          this._elements.operatorListInfo
            .setAttribute('data-l10n-id', 'scanning');
        } else {
          this._elements.operatorListInfo.hidden = true;
        }
        break;
    }
  };

  return function(root) {
    return new AvailableOperatorList(root);
  };
});
