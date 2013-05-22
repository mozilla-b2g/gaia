'use strict';

function HandledCall(aCall, aNode) {
  this._ticker = null;
  this.photo = null;

  this.call = aCall;

  aCall.addEventListener('statechange', this);

  this.recentsEntry = {
    date: Date.now(),
    type: this.call.state,
    number: this.call.number
  };

  this._initialState = this.call.state;

  if (!aNode)
    return;

  this.node = aNode;
  this.durationNode = aNode.querySelector('.duration');
  this.durationChildNode = aNode.querySelector('.duration span');
  this.directionNode = aNode.querySelector('.duration .direction');
  this.numberNode = aNode.querySelector('.numberWrapper .number');
  this.additionalInfoNode = aNode.querySelector('.additionalContactInfo');

  this.node.dataset.occupied = 'true';

  this.updateCallNumber();

  LazyL10n.get((function localized(_) {
    var durationMessage = (this.call.state == 'incoming') ?
                           _('incoming') : _('connecting');
    this.durationChildNode.textContent = durationMessage;
  }).bind(this));

  this.updateDirection();

  // Some calls might be already connected
  if (this._initialState === 'connected') {
    this.connected();
  }
}

HandledCall.prototype.handleEvent = function hc_handle(evt) {
  switch (evt.call.state) {
    case 'connected':
      CallScreen.render('connected');
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
        CallScreen.setCallerContactImage(this.photo, true, false);
      }
      CallScreen.syncSpeakerEnabled();
      break;
    case 'held':
      this.node.classList.add('held');
      break;
    case 'busy':
      this.busy();
      break;
  }
};

HandledCall.prototype.startTimer = function hc_startTimer() {
  if (this._ticker)
    return;

  function padNumber(n) {
    return n > 9 ? n : '0' + n;
  }

  this.durationChildNode.textContent = '00:00';
  this.durationNode.classList.add('isTimer');
  LazyL10n.get((function localized(_) {
    this._ticker = setInterval(function hc_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      var duration = {
        h: padNumber(elapsed.getUTCHours()),
        m: padNumber(elapsed.getUTCMinutes()),
        s: padNumber(elapsed.getUTCSeconds())
      };
      self.durationChildNode.textContent = _(elapsed.getUTCHours() > 0 ?
        'callDurationHours' : 'callDurationMinutes', duration);
    }, 1000, this, Date.now());
  }).bind(this));
};

HandledCall.prototype.updateCallNumber = function hc_updateCallNumber() {
  var number = this.call.number;
  var node = this.numberNode;
  var additionalInfoNode = this.additionalInfoNode;

  if (!number) {
    LazyL10n.get(function localized(_) {
      node.textContent = _('withheld-number');
    });
    return;
  }

  var voicemail = navigator.mozVoicemail;
  if (voicemail) {
    if (voicemail.number == number) {
      node.textContent = voicemail.displayName ?
        voicemail.displayName : number;
      return;
    }
  }

  var self = this;
  Contacts.findByNumber(number,
    function lookupContact(contact, matchingTel, contactsWithSameNumber) {
      if (contact) {
        var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel, contact);
        var contactCopy = {
          name: contact.name,
          org: contact.org,
          tel: contact.tel
        };
        if (primaryInfo) {
          node.textContent = primaryInfo;
        } else {
          LazyL10n.get(function gotL10n(_) {
            node.textContent = _('withheld-number');
          });
        }
        KeypadManager.formatPhoneNumber('end', true);
        var additionalInfo =
          Utils.getPhoneNumberAdditionalInfo(matchingTel, contact, number);
        KeypadManager.updateAdditionalContactInfo(additionalInfo);
        if (contact.photo && contact.photo.length > 0) {
          self.photo = contact.photo[0];
          CallScreen.setCallerContactImage(self.photo, true, false);
          if (typeof self.photo === 'string') {
            contactCopy.photo = self.photo;
          } else {
            contactCopy.photo = [URL.createObjectURL(self.photo)];
          }
        }

        self.recentsEntry.contactInfo = {
          matchingTel: JSON.stringify(matchingTel),
          contact: JSON.stringify(contactCopy),
          contactsWithSameNumber: contactsWithSameNumber || 0
        };
        return;
      }

      node.textContent = number;
      KeypadManager.formatPhoneNumber('end', true);
    }
  );
};

HandledCall.prototype.updateDirection = function hc_updateDirection() {
  var className;
  if (this._initialState == 'incoming') {
    className = (this.call.state == 'connected') ? 'ongoing-in' : 'incoming';
  } else {
    className = (this.call.state == 'connected') ? 'ongoing-out' : 'outgoing';
  }

  this.directionNode.classList.add(className);
};

HandledCall.prototype.remove = function hc_remove() {
  this.call.removeEventListener('statechange', this);

  if (!this.node)
    return;

  this.node.dataset.occupied = 'false';
  clearInterval(this._ticker);
  this._ticker = null;
};

HandledCall.prototype.connected = function hc_connected() {
  if (this.recentsEntry.type === 'incoming') {
    this.recentsEntry.status = 'connected';
  }

  if (!this.node)
    return;

  this.node.hidden = false;
  this.node.classList.remove('held');

  this.startTimer();
  this.updateDirection();
  CallScreen.enableKeypad();
  CallScreen.syncSpeakerEnabled();
};

HandledCall.prototype.busy = function hc_busy() {
  OnCallHandler.notifyBusyLine();
};

HandledCall.prototype.disconnected = function hc_disconnected() {
  var entry = this.recentsEntry;
  if (entry) {
    if (entry.contactInfo) {
      if (typeof entry.contactInfo.contact === 'string') {
        entry.contactInfo.contact = JSON.parse(entry.contactInfo.contact);
      }
      if (typeof entry.contactInfo.matchingTel === 'string') {
        var tel = entry.contactInfo.matchingTel;
        entry.contactInfo.matchingTel = JSON.parse(tel);
      }
    }
    OnCallHandler.addRecentEntry(entry);
  }

  if (!this.node)
    return;

  CallScreen.unmute();
  CallScreen.turnSpeakerOff();
  this.remove();
};

HandledCall.prototype.show = function hc_show() {
  if (!this.node)
    return;

  this.node.hidden = false;
};

HandledCall.prototype.hide = function hc_hide() {
  if (!this.node)
    return;

  this.node.hidden = true;
};
