'use strict';

var CarrierInfoNotifier = {

  _sound: 'style/notifications/ringtones/notifier_exclamation.ogg',
  // A random starting point that is unlikely to be used by other notifications
  _notificationId: 6000 + Math.floor(Math.random() * 999),
  init: function cin_init() {

    // CDMA record information
    navigator.mozSetMessageHandler('cdma-info-rec-received',
      this.showCDMA.bind(this));
  },

  showCDMA: function cin_showCDMA(message) {
    var _ = navigator.mozL10n.get;
    if (message.display) {
      this.show(message.display, _('cdma-record-info'));
    }
    if (message.extendedDisplay) {
      var text = message.extendedDisplay.records.map(function(elem) {
        return elem.content;
      }).join(' ');
      this.show(text, _('cdma-record-info'));
    }
  },

  show: function cin_show(message, title) {
    var showDialog = function cin_showDialog() {
      ModalDialog.showWithPseudoEvent({
        title: title,
        text: message,
        type: 'alert'
      });
    };

    // If we are not inside the lockscreen, show the dialog
    // immediately, dispatch an event to hide
    if (!LockScreen.locked) {
      this.dispatchEvent('emergencyalert');
      this.playNotification();
      showDialog();
      return;
    }

    // If we are on the lock screen then create a notification
    // that invokes the dialog
    var notification = NotificationScreen.addNotification({
      id: ++this._notificationId,
      title: title,
      text: message
    });
    notification.addEventListener('tap', showDialog);
  },

  playNotification: function cin_playNotification() {
    var ringtonePlayer = new Audio();
    ringtonePlayer.src = this._sound;
    ringtonePlayer.mozAudioChannelType = 'notification';
    ringtonePlayer.play();
    window.setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.src = '';
    }, 2000);
  },

  dispatchEvent: function cin_dispatchEvent(name, detail) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, detail);
    window.dispatchEvent(evt);
  }
};

CarrierInfoNotifier.init();
