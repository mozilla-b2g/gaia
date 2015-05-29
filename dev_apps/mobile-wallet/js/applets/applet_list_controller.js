'use strict';

/* globals AppletListModel, AppletListView, Timer, SEUtils,
   addMixin, DebugMixin */
/* exported AppletListController */

(function(exports) {

  var AppletListController = function(simDataSource, id, view, filter, multipleAppletsActive){
    this._simDataSource = simDataSource;
    this._id = id;
    this._filter = filter;
    this._multipleAppletsActive = multipleAppletsActive;

    this._view = view;
    this._view.addListener(this);

    addMixin(this, DebugMixin);
  };

  AppletListController.prototype = {
    _id: null,
    _viewId: null,
    _multipleAppletsActive: false,

    _simDataSource: null,

    _model: null,
    _view: null,
    _filter: null,

    init: function alc_init() {
      return this.refreshModelView();
    },

    refreshModelView: function alc_refreshModelView() {
      return this._refreshModel()
      .then((simAccessTime) => {
        var viewUpdateTime = this._refreshView();
        this.debug('Applets read in ' + simAccessTime + ' ms. ' +
          'View refreshed in ' + viewUpdateTime + ' ms.');

        return simAccessTime;
      });
    },

    // TODO unify AID arguments
    handleHCIEvt: function alc_handleHCIEvt(hci, fastPayOn) {
      var aid = SEUtils.byteToHexString(hci.aid);
      var applet = this._model.getAppletByHexAID(aid);

      if(!applet) {
        this.debug('Got HCI from uknown aid '+ aid);
        return;
      }

      this.debug('HCI EVT_TRANSACTION from ' + aid);
      if(!fastPayOn) {
        this._toggleAppletCLF(aid, false)
        .catch((e) => console.error(e));
      }
    },

    onEvent: function alc_onEvent(source, data) {
      if(data.action === 'details-hide') {
        this._view.hideDetails();
        return;
      }

      if(data.action === 'details-show') {
        this._view.showDetails(this._model.getAppletByID(data.id));
        return;
      }

      // TODO add explicit event
      var applet = this._model.getAppletByID(data.id);
      var select = data.action === 'card-selection';

      this._toggleAppletCLF(applet.aid, select);
    },

    showView: function alc_showView() {
      this._view.visible = true;
    },

    hideView: function alc_hideView() {
      this._view.visible = false;
    },

    _toggleAppletCLF(aid, toggle) {
      this._view.disableCardSelection();

      return this._simDataSource.toggleCLF(toggle, aid)
      // TODO add comment about CREL and auto off
      //.then(() => this._refreshModel())
      .catch((e) => this.debug('Toggle fast pay failed', e))
      .then((success) => {
        if(success) {
          this._model.applets.forEach((a) => {
            if(a.aid === aid) {
              a.contactlessState = toggle ? 1 : 0;
            } else if (toggle && !this._multipleAppletsActive) {
              a.contactlessState = 0;
            }
          });
        }
        this._view.updateSelection(this._model.applets);
        this._view.enableCardSelection();
      });
    },

    _refreshModel: function alc_refreshMode() {
      var timer = new Timer();
      return this._simDataSource.getAppletsData()
      .then((applets) => {
        var simAccTime = timer.getElapsedTime();

        if(!this._model) {
          this._model = new AppletListModel();
        }

        this._model.updateList(applets, this._filter);
        return simAccTime;
      });
    },

    _refreshView: function alc_refreshView() {
      var timer = new Timer();

      this._view.refreshView(this._model.applets);
      return timer.getElapsedTime();
    }
  };

  exports.AppletListController = AppletListController;
}((typeof exports === 'undefined') ? window : exports));
