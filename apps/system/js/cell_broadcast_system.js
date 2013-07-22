'use strict';

var CellBroadcastSystem = {

  _settingsDisabled: null,
  _settingsKey: 'ril.cellbroadcast.disabled',
  _sound: 'style/notifications/ringtones/notifier_exclamation.ogg',

  init: function cbs_init() {
    var self = this;
    if (navigator && navigator.mozCellBroadcast) {
      navigator.mozCellBroadcast.onreceived = this.show.bind(this);
    }

    var settings = window.navigator.mozSettings;
    var req = settings.createLock().get(this._settingsKey);
    req.onsuccess = function() {
      self._settingsDisabled = req.result[self._settingsKey];
    };

    settings.addObserver(this._settingsKey,
                         this.settingsChangedHandler.bind(this));
  },

  settingsChangedHandler: function cbs_settingsChangedHandler(event) {
    this._settingsDisabled = event.settingValue;
  },

  show: function cbs_show(event) {
    var conn = window.navigator.mozMobileConnection;
    var msg = event.message;

    if (conn &&
        conn.voice.network.mcc === MobileOperator.BRAZIL_MCC &&
        msg.messageId === MobileOperator.BRAZIL_CELLBROADCAST_CHANNEL) {
      LockScreen.setCellbroadcastLabel(msg.body);
      return;
    }

    if (this._settingsDisabled) {
      return;
    }

    var title = navigator.mozL10n.get('cb-channel', {channel: msg.messageId});
    var showDialog = function() {
      ModalDialog.showWithPseudoEvent({
        title: title,
        text: msg.body,
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
      title: title,
      text: msg.body
    });
    notification.addEventListener('tap', showDialog);
  },

  playNotification: function cbs_playNotification() {
    var ringtonePlayer = new Audio();
    ringtonePlayer.src = this._sound;
    ringtonePlayer.mozAudioChannelType = 'notification';
    ringtonePlayer.play();
    window.setTimeout(function smsRingtoneEnder() {
      ringtonePlayer.pause();
      ringtonePlayer.src = '';
    }, 2000);
  },

  dispatchEvent: function cbs_dispatchEvent(name, detail) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(name, true, true, detail);
    window.dispatchEvent(evt);
  }
};

CellBroadcastSystem.init();
