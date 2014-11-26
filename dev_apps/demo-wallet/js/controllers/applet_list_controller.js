'use strict';

/* globals AppletListModel, AppletListView, Timer, SEUtils */
/* exported AppletListController */

(function(exports) {
  
  var AppletListController = function(simDataSource, id, viewId){
    this._simDataSource = simDataSource;
    this._id = id;
    this._viewId = viewId;
  };

  AppletListController.prototype = {
    _initialised: false,

    _id: null,
    _viewId: null,

    _simDataSource: null,

    _model: null,
    _view: null,
    _filter: function filter(a) {
      var hexState = SEUtils.byteToHexString(a.state);
      // hex states for payment applets
      // 1F00 - personalised, not active on Contactless interface (CLF)
      // 1F01 - personalised, active on CLF
      // 0708 - not personalised, not possible to use in payment
      return hexState === '1F00' || hexState === '1F01' || hexState === '0780' ;
    },

    timer: null,

    init: function alc_init() {
      this.timer = new Timer();
      return this.refreshModelView();
    },

    refreshModelView: function alc_refreshModelView() {
      this.timer.reset();
      return this._simDataSource.getAppletsData()
      .then((applets) => {
        var delta = this.timer.getElapsedTime();
        if(!this._initialised) {
          this._model = new AppletListModel(applets, this._filter);
          this._view = new AppletListView(this._viewId, {
            rtt: delta,
            items: this._model.applets
          });
          this._view.addListener(this);
          this._initialised = true;
        } else {
          this._model.updateList(applets, this._filter);
          this._view.updateList({ rtt: delta, items: this._model.applets});
        }
        return delta;
      });
    },

    onEvent: function alc_onEvent(source, data) {
      var applet = this._model.getAppletByID(data.id);
      var toggleOn = applet.contactlessState === '00';
      this._simDataSource.toggleFastPay(toggleOn, applet.aid)
      .then((success) => {
        if(success) {
          this.refreshModelView();
        }
      });
    },

    showView: function alc_showView() {
      this._view.visible = true;
    },

    hideView: function alc_hideView() {
      this._view.visible = false;
    }
  };

  exports.AppletListController = AppletListController;
}(window));