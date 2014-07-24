'use strict';

(function(exports) {

  /**
   * IMESwitcher is responsible for showing a fake notification
   * in utility tray, which indicates the activate keyboard
   * and may be interacted upon for showing IME selection menu. 
   */
  var IMESwitcher = function() {
    this._notifIMEContainer = null;
    this._fakenoti = null;
    this._fakenotiMessage = null;
    this._fakenotiTip = null;
  };

  IMESwitcher.prototype.init = function is_init(showAllCallback) {
    this._notifIMEContainer =
      document.getElementById('keyboard-show-ime-list');

    this._fakenoti =
      this._notifIMEContainer.querySelector('.fake-notification');
    this._fakenotiMessage = this._fakenoti.querySelector('.message');
    this._fakenotiTip = this._fakenoti.querySelector('.tip');

    this._fakenoti.addEventListener('mousedown', function is_fakenotiAct(evt) {
        evt.preventDefault();
        showAllCallback();
    }.bind(this));
  };

  IMESwitcher.prototype.show = function is_show(appName_, imeName) {
    var _ = navigator.mozL10n.get;

    window.dispatchEvent(new CustomEvent('keyboardimeswitchershow'));

    this._fakenotiMessage.textContent = _('ime-switching-title', {
      appName: appName_,
      name: imeName
    });
    this._fakenotiTip.textContent = _('ime-switching-tip');

    // Instead of create DOM element dynamically, we can just turn the message
    // on/off and add message as we need. This save the time to create and
    // append element.
    this._fakenoti.classList.add('activated');
  };

  IMESwitcher.prototype.hide = function is_hide() {
    this._fakenoti.classList.remove('activated');
    window.dispatchEvent(new CustomEvent('keyboardimeswitcherhide'));
  };

  exports.IMESwitcher = IMESwitcher;

})(window);
