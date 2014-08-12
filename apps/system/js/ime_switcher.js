'use strict';

(function(exports) {

  /**
   * ImeSwitcher is responsible for showing a fake notification
   * in utility tray, which indicates the activate keyboard
   * and may be interacted upon for showing IME selection menu.
   */
  var ImeSwitcher = function(keyboardManager) {
    this.keyboardManager = keyboardManager;
    this._utilityTrayContainer = null;
    this._notificationContainer = null;
    this._notificationTitle = null;
    this._notificationTip = null;
    this.ontap = undefined;
  };

  ImeSwitcher.prototype.start = function is_start() {
    this._utilityTrayContainer =
      document.getElementById('keyboard-show-ime-list');

    this._notificationContainer =
      this._utilityTrayContainer.querySelector('.fake-notification');
    this._notificationTitle =
      this._notificationContainer.querySelector('.message');
    this._notificationTip = this._notificationContainer.querySelector('.tip');

    this._notificationContainer.addEventListener('mousedown', this);
    this.ontap = function() {
      this.keyboardManager.showAll();
    }.bind(this);
  };

  ImeSwitcher.prototype.stop = function is_stop() {
    this._notificationContainer.removeEventListener('mousedown', this);
    this._utilityTrayContainer = null;
    this._notificationContainer = null;
    this._notificationTitle = null;
    this._notificationTip = null;
    this.ontap = undefined;
  };

  ImeSwitcher.prototype.show = function is_show(appName, imeName) {
    window.dispatchEvent(new CustomEvent('keyboardimeswitchershow'));

    navigator.mozL10n.localize(this._notificationTitle, 'ime-switching-title', {
      appName: appName,
      name: imeName
    });
    navigator.mozL10n.localize(this._notificationTip, 'ime-switching-tip');

    // Instead of create DOM element dynamically, we can just turn the message
    // on/off and add message as we need. This save the time to create and
    // append element.
    this._notificationContainer.classList.add('activated');
  };

  ImeSwitcher.prototype.hide = function is_hide() {
    this._notificationContainer.classList.remove('activated');
    window.dispatchEvent(new CustomEvent('keyboardimeswitcherhide'));
  };

  ImeSwitcher.prototype.handleEvent = function is_handleEvent(evt) {
    evt.preventDefault();
    if (typeof this.ontap === 'function') {
     this.ontap();
    }
  };

  exports.ImeSwitcher = ImeSwitcher;

})(window);
