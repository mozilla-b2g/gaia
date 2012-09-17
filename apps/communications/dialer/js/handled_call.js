'use strict';

function HandledCall(aCall, aNode) {
  this._ticker = null;
  this.photo = null;

  this.call = aCall;

  this.node = aNode;
  this.durationNode = aNode.querySelector('.duration span');
  this.directionNode = aNode.querySelector('.duration .direction');
  this.numberNode = aNode.querySelector('.number');
  this.additionalInfoNode = aNode.querySelector('.additionalContactInfo');

  aCall.addEventListener('statechange', this);

  this.recentsEntry = {
    date: Date.now(),
    type: this.call.state,
    number: this.call.number
  };

  this.updateCallNumber();

  var _ = navigator.mozL10n.get;

  var durationMessage = (this.call.state == 'incoming') ?
                         _('incoming') : _('calling');
  this.durationNode.textContent = durationMessage + '…';

  this._initialState = this.call.state;
  this.updateDirection();
}

HandledCall.prototype.handleEvent = function hc_handle(evt) {
  switch (evt.call.state) {
    case 'connected':
      this.connected();
      break;
    case 'disconnected':
      this.disconnected();
      break;
    case 'resuming':
      this.node.classList.remove('held');
      break;
    case 'resumed':
      if (this.photo) {
        CallScreen.setCallerContactImage(this.photo);
      }
      CallScreen.syncSpeakerEnabled();
      break;
    case 'held':
      this.node.classList.add('held');
      break;
  }
};

HandledCall.prototype.startTimer = function hc_startTimer() {
  if (this._ticker)
    return;

  this._ticker = setInterval(function hc_updateTimer(self, startTime) {
    var elapsed = new Date(Date.now() - startTime);
    self.durationNode.textContent = elapsed.toLocaleFormat('%M:%S');
  }, 1000, this, Date.now());
};

HandledCall.prototype.updateCallNumber = function hc_updateCallNumber() {
  var number = this.call.number;
  var node = this.numberNode;
  var additionalInfoNode = this.additionalInfoNode;

  if (!number.length) {
    var _ = navigator.mozL10n.get;
    node.textContent = _('unknown');
    return;
  }

  var voicemail = navigator.mozVoicemail;
  if (voicemail) {
    if (voicemail.number == number) {
      node.textContent = voicemail.displayName;
      return;
    }
  }

  var self = this;
  Contacts.findByNumber(number, function lookupContact(contact) {
    if (contact && contact.name) {
      node.textContent = contact.name;
      KeypadManager.formatPhoneNumber('on-call', 'right');
      var additionalInfo = Utils.getPhoneNumberAdditionalInfo(
        number, contact);
      additionalInfoNode.textContent = additionalInfo ?
        additionalInfo : '';
      if (contact.photo && contact.photo.length > 0) {
        self.photo = contact.photo[0];
        CallScreen.setCallerContactImage(self.photo);
      }
      return;
    }

    node.textContent = number;
  });
};

HandledCall.prototype.updateDirection = function hc_updateDirection() {
  var className;
  if (this._initialState == 'dialing') {
    className = (this.call.state == 'connected') ? 'ongoing-out' : 'outgoing';
  } else {
    className = (this.call.state == 'connected') ? 'ongoing-in' : 'incoming';
  }

  this.directionNode.classList.add(className);
};

HandledCall.prototype.remove = function hc_remove() {
  clearInterval(this._ticker);
  this._ticker = null;

  this.call.removeEventListener('statechange', this);

  this.node.hidden = true;
};

HandledCall.prototype.connected = function hc_connected() {
  this.node.hidden = false;
  this.recentsEntry.type += '-connected';
  this.node.classList.remove('held');

  this.startTimer();
  this.updateDirection();
  CallScreen.enableKeypad();
  CallScreen.syncSpeakerEnabled();
};

HandledCall.prototype.disconnected = function hc_disconnected() {
  if (this.recentsEntry &&
     (this.recentsEntry.type.indexOf('-connected') == -1)) {
    this.recentsEntry.type += '-refused';
  }

  if (this.recentsEntry) {
    var recentToAdd = this.recentsEntry;
    RecentsDBManager.init(function() {
      RecentsDBManager.add(recentToAdd, function() {
        RecentsDBManager.close();
      });
    });
  }
  CallScreen.unmute();
  CallScreen.turnSpeakerOff();
  this.remove();
};
