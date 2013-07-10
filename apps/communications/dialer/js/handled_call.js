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
  this._cachedInfo = '';
  this._cachedAdditionalInfo = '';

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
      OnCallHandler.updateKeypadEnabled();
      this.node.classList.remove('held');
      if (this.photo) {
        CallScreen.setCallerContactImage(this.photo, true, false);
      }
      CallScreen.syncSpeakerEnabled();
      break;
    case 'held':
      OnCallHandler.updateKeypadEnabled();
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
      // Bug 834334: Ensure that 28.999 -> 29.000
      var delta = Math.round((Date.now() - startTime) / 1000) * 1000;
      var elapsed = new Date(delta);
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

  var isEmergencyNumber = this.call.emergency;
  if (isEmergencyNumber) {
    LazyL10n.get(function localized(_) {
      node.textContent = _('emergencyNumber');
    });
    return;
  }

  var self = this;
  Voicemail.check(number, function(isVoicemailNumber) {
    if (isVoicemailNumber) {
      LazyL10n.get(function localized(_) {
        node.textContent = _('voiceMail');
      });
    } else {
      Contacts.findByNumber(number, lookupContact);
    }
  });

  function lookupContact(contact, matchingTel, contactsWithSameNumber) {
    if (contact) {
      var primaryInfo = Utils.getPhoneNumberPrimaryInfo(matchingTel, contact);
      var contactCopy = {
        id: contact.id,
        name: contact.name,
        org: contact.org,
        tel: contact.tel
      };
      if (primaryInfo) {
        node.textContent = primaryInfo;
        self._cachedInfo = primaryInfo;
      } else {
        LazyL10n.get(function gotL10n(_) {
          self._cachedInfo = _('withheld-number');
          node.textContent = self._cachedInfo;
        });
      }
      self.formatPhoneNumber('end', true);
      self._cachedAdditionalInfo =
        Utils.getPhoneNumberAdditionalInfo(matchingTel);
      self.replaceAdditionalContactInfo(self._cachedAdditionalInfo);
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

    self._cachedInfo = number;
    node.textContent = self._cachedInfo;
    self.replaceAdditionalContactInfo(self._cachedAdditionalInfo);
    self.formatPhoneNumber('end', true);
  }
};

HandledCall.prototype.replaceAdditionalContactInfo =
  function hc_replaceAdditionalContactInfo(additionalContactInfo) {
  if (!additionalContactInfo ||
    additionalContactInfo.trim() === '') {
    this.additionalInfoNode.textContent = '';
    this.additionalInfoNode.classList.add('noAdditionalContactInfo');
    this.numberNode.classList.add('noAdditionalContactInfo');
  } else {
    this.numberNode.classList.remove('noAdditionalContactInfo');
    this.additionalInfoNode.classList.remove('noAdditionalContactInfo');
    this.additionalInfoNode.textContent = additionalContactInfo;
  }
};

HandledCall.prototype.restoreAdditionalContactInfo =
  function hc_restoreAdditionalContactInfo(additionalContactInfo) {
    this.replaceAdditionalContactInfo(this._cachedAdditionalInfo);
};

HandledCall.prototype.formatPhoneNumber =
  function hc_formatPhoneNumber(ellipsisSide, maxFontSize) {
    var fakeView = this.node.querySelector('.fake-number');
    var view = this.numberNode;

    var newFontSize;
    if (maxFontSize) {
      newFontSize = KeypadManager.maxFontSize;
    } else {
      newFontSize =
        Utils.getNextFontSize(view, fakeView, KeypadManager.maxFontSize,
          KeypadManager.minFontSize, kFontStep);
    }
    view.style.fontSize = newFontSize + 'px';
    Utils.addEllipsis(view, fakeView, ellipsisSide);
};

HandledCall.prototype.replacePhoneNumber =
  function hc_replacePhoneNumber(phoneNumber, ellipsisSide, maxFontSize) {
    this.numberNode.textContent = phoneNumber;
    this.formatPhoneNumber(ellipsisSide, maxFontSize);
};

HandledCall.prototype.restorePhoneNumber =
  function hc_restorePhoneNumber() {
    this.numberNode.textContent = this._cachedInfo;
    this.formatPhoneNumber('end', true);
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
