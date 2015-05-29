'use strict';

/* globals addMixin, ObserverSubjectMixin, CardSwipeMixin, getSamplePaymentImg,
   ListViewMixin, AppletDetailsView, DebugMixin */
/* exported AppletListView */

(function(exports) {
  var AppletListView = function(id, imgSrc, data) {
    this._id = id;

    addMixin(this, ObserverSubjectMixin);
    addMixin(this, ListViewMixin);
    addMixin(this, CardSwipeMixin);
    addMixin(this, DebugMixin);

    this.initListView(id, imgSrc, data);
    this._detailsView = new AppletDetailsView(id + '-details');
  };

  AppletListView.prototype = {
    _detailsVisible: false,
    _detailsView: null,

    refreshView: function(data) {
      this.updateList(data);

      if(!Array.isArray(data) || !data.length) {
        return;
      }

      var tapCallback = (id) => {
        var action = 'details-' + ((this._detailsVisible) ? 'hide' : 'show');
        this._notify({ id: id, action: action});
      };

      var swipeCallback = (activeId) => {
        if(this._detailsVisible) {
          this.hideDetails();
        }
      };

      this.initCardSwipe('li', tapCallback, swipeCallback);
      this.updateSelection(data);
    },

    showDetails: function alv_showDetails(applet) {
      this._el.querySelector('.slider').scrollTop = 0;
      this._detailsView.refreshView(applet);
      this._el.classList.add('details-visible');
      this._detailsVisible = true;
    },

    hideDetails: function alv_hideDetails() {
      this._el.classList.remove('details-visible');
      this._detailsVisible = false;
    },
  };

  exports.AppletListView = AppletListView;
}((typeof exports === 'undefined') ? window : exports));
