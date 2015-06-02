'use strict';

/* globals addMixin, ObserverSubjectMixin, DebugMixin, SettingsSubView,
           ConfigSubView */
/* exported SettingsView */

(function(exports) {
  const STATUS_TIMEOUT = 4000; // ms

  var SettingsView = function(id, options) {
    this._id = id;
    this._el = document.querySelector('#' + id);

    this._initMainView(options.pin, options.fastPay);
    this._initSubViews(options);

    addMixin(this, ObserverSubjectMixin);
    addMixin(this, DebugMixin);
  };

  SettingsView.prototype = {
    _el: null,
    _id: null,
    _visible: false,
    _subviews: [],

    _pinCheckbox: null,
    _fastPayCheckbox: null,

    _pinChangeBtn: null,
    _pinEnabled: false,

    get visible() {
      return this._visible;
    },

    set visible(value) {
      if(value) {
        this._visible = true;
        this._el.classList.remove('hide');
        this._el.classList.add('edit');
      } else {
        this._subviews.forEach((v) => { v.visible = false; });
        this._visible = false;
        this._el.classList.remove('edit');
      }
    },

    set pinEnabled(value) {
      this._pinCheckbox.checked = value;
      if(value) {
        this._pinChangeBtn.classList.remove('settings-disabled');
      } else {
        this._pinChangeBtn.classList.add('settings-disabled');
      }
    },

    _initMainView: function(pin, fastPay) {
      this._pinCheckbox = this._el.querySelector('#pin-checkbox');
      this._pinCheckbox.addEventListener('click', () => {
        this._notify({
          action: 'pin-toggle',
          data: { checked: this._pinCheckbox.checked }
        });
        this.pinEnabled = !this._pinCheckbox.checked;
      });

      this._pinChangeBtn = this._el.querySelector('#pin-change-btn');
      this._pinChangeBtn.addEventListener('click', () => {
        this._notify({ action: 'pin-change' });
      });

      this.pinEnabled = pin;

      this._fastPayCheckbox = this._el.querySelector('#fast-pay');
      this._fastPayCheckbox.checked = fastPay;

      this._el.querySelector('#settings-done').addEventListener('click',
        () => this._handleEditingFinished());
    },

    _initSubViews: function(cfg){
      var config = new ConfigSubView('settings-configuration', cfg.crsAid,
                                     cfg.uiccAid, cfg.pinP2, cfg.defaultPin);
      this._el.querySelector('#adv-settings-btn')
              .addEventListener('click', () => { config.visible = true; });

      var about = new SettingsSubView('settings-about');
      this._el.querySelector('#about-btn')
              .addEventListener('click', () => { about.visible = true; });

      var pinCloseHandler = () => this._handlePinViewClosed();
      var pin = new SettingsSubView('settings-pin', pinCloseHandler);

      this._subviews.push(config);
      this._subviews.push(about);
      this._subviews.push(pin);
    },

    _getSubView: function(id) {
      return this._subviews.find(v => v._id === id);
    },

    setSubViewContent: function(id, content) {
      var subView = this._getSubView(id);
      if(subView) {
        subView.content = content;
      }
    },

    showSubview: function(id, hide) {
      var subView = this._getSubView(id);
      if(subView) {
        subView.visible = !hide;
      }
    },

    hideSubview: function(id) {
      this.showSubview(id, true);
    },

    showStatus: function(statusMsg) {
      this._el.querySelector('#settings-status p').textContent = statusMsg;
      var status = this._el.querySelector('#settings-status');
      status.classList.add('visible');
      setTimeout(() => status.classList.remove('visible'), STATUS_TIMEOUT);
    },

    _handleEditingFinished: function _handleEditingFinished() {
      var conf = this._getSubView('settings-configuration');

      this._notify({
        action: 'editing-finished',
        data: {
          pin: this._pinCheckbox.checked,
          fastPay: this._fastPayCheckbox.checked,
          crsAid: conf.crsInput.value,
          uiccAid: conf.uiccInput.value,
          pinP2: conf.pinP2Input.value,
          defaultPin: conf.defaultPinInput.value
        }
      });
      this.visible = false;
    },

    _handlePinViewClosed: function _handlePinViewClosed() {
      this._notify({ action: 'pin-cancel' });
    }
  };

  exports.SettingsView = SettingsView;
}((typeof exports === 'undefined') ? window : exports));
