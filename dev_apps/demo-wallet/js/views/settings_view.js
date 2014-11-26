'use strict';

/* globals addMixin, ObserverSubjectMixin */
/* exported SettingsView */

(function(exports) {
  var SettingsView = function(id, crsAid, m4mAid) {
    this._id = id;
    this._crsAid = crsAid;

    addMixin(this, ObserverSubjectMixin);
    this._render();
  };

  SettingsView.prototype = {
    _el: null,
    _id: null,
    _visible: false,

    _crsAid: null,
    _m4mAid: null,

    _render: function sv_render() {
      this._el = document.getElementById(this._id);
      this._el.querySelector('#crs-aid').value = this._crsAid;
      this._el.querySelector('#settings-done').addEventListener('click',
        () => this._handleEditingFinished());
      this._visible.false;
    },

    get visible() {
      return this._visible;
    },

    set visible(value) {
      if(value) {
        this._visible = true;
        this._el.classList.add('edit');
      } else {
        this._visible = false;
        this._el.classList.remove('edit');
      }
    },

    _handleEditingFinished: function _handleEditingFinished() {
      // TODO add validitiy check and prevent closing if not valid AIDs
      var crsInput = this._el.querySelector('#crs-aid');

      if(!crsInput.validity.valid) {
        console.log('AIDs not valid, not closing settings');
        return;
      }

      this.visible = false;
      var crs = crsInput.value;

      var changes = null;
      if(crs !== this._crsAid) {
        this._crsAid = crs;
        changes = (!changes) ? {} : changes;
        changes.crsAid = this._crsAid;
      }

      if(changes) {
        this._notify(changes);
      }
    }
  };

  exports.SettingsView = SettingsView;
}(window));