'use strict';

/* exported ConfigSubView */

(function(exports) {

  var ConfigSubView = function(id, crsAid, uiccAid, pinP2, defaultPin) {
    this._id = id;
    this._el = document.querySelector('#'+id);

    this.crsInput = this._el.querySelector('#crs-aid');
    this.crsInput.value = crsAid;

    this.uiccInput = this._el.querySelector('#uicc-aid');
    this.uiccInput.value = uiccAid;

    this.pinP2Input = this._el.querySelector('#pinP2');
    this.pinP2Input.value = pinP2;

    this.defaultPinInput = this._el.querySelector('#default-pin');
    this.defaultPinInput.value = defaultPin;

    this._el.querySelector('header button.icon-back')
            .addEventListener('click', () => this._handleConfigFinished());
    this._el.querySelector('#settings-configuration-done')
            .addEventListener('click', () => this._handleConfigFinished());
  };

  ConfigSubView.prototype = {
    _el: null,
    _id: null,
    _visible: false,

    crsInput: null,
    uiccInput: null,
    pinP2Input: null,
    defaultPinInput: null,

    get visible() {
      return this._visible;
    },

    set visible(value) {
      if(value) {
        this._visible = true;
        this._el.classList.add('slide-in');
      } else {
        this._visible = false;
        this._el.classList.remove('slide-in');
      }
    },

    _handleConfigFinished: function() {
      if(!this.crsInput.validity.valid || !this.uiccInput.validity.valid ||
         !this.pinP2Input.validity.valid ||
         !this.defaultPinInput.validity.valid) {
        this.debug('Inputs not valid, not closing settings');
        return;
      }

      this.visible = false;
    },
  };

  exports.ConfigSubView = ConfigSubView;
}(window));