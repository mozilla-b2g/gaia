'use strict';

function HandledCall(aCall) {
  this._ticker = null;
  this.photo = null;
  this._leftGroup = false;
  this.call = aCall;

  aCall.addEventListener('statechange', this);

  aCall.ongroupchange = (function onGroupChange() {
    if (this.call.group) {
      this._leftGroup = false;
      CallScreen.moveToGroup(this.node);
    } else {
      this._leftGroup = true;
      CallScreen.insertCall(this.node);
    }
  }).bind(this);

  this.recentsEntry = {
    date: Date.now(),
    type: this.call.state,
    number: this.call.number,
    emergency: this.call.emergency || false,
    voicemail: false,
    status: null
  };

  this._initialState = this.call.state;
  this._cachedInfo = '';
  this._cachedAdditionalInfo = '';

  this.node = document.getElementById('handled-call-template').cloneNode(true);
  this.node.id = '';
  this.node.classList.add('handled-call');
  this.node.hidden = false;

  this.durationNode = this.node.querySelector('.duration');
  this.durationChildNode = this.node.querySelector('.duration span');
  this.numberNode = this.node.querySelector('.numberWrapper .number');
  this.additionalInfoNode = this.node.querySelector('.additionalContactInfo');
  this.hangupButton = this.node.querySelector('.hangup-button');
  this.hangupButton.onclick = (function() {
    this.call.hangUp();
  }.bind(this));
  this.mergeButton = this.node.querySelector('.merge-button');
  this.mergeButton.onclick = (function(evt) {
    if (evt) {
      evt.stopPropagation();
    }
    CallsHandler.mergeActiveCallWith(this.call);
  }).bind(this);

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
    case 'dialing':
    case 'alerting':
      CallsHandler.updateKeypadEnabled();
      break;
    case 'connected':
      CallScreen.render('connected');
      this.connected();
      break;
    case 'disconnected':
      this.disconnected();
      break;
    case 'resuming':
      CallsHandler.updateKeypadEnabled();
      this.node.classList.remove('held');
      if (this.photo) {
        CallScreen.setCallerContactImage(this.photo,
                                         {force: true});
      }
      CallScreen.syncSpeakerEnabled();
      break;
    case 'held':
      CallsHandler.updateKeypadEnabled();
      this.node.classList.add('held');
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
  var secondNumber = this.call.secondNumber;
  var node = this.numberNode;
  var additionalInfoNode = this.additionalInfoNode;
  var self = this;

  /* If we have a second call waiting in CDMA mode then we don't know which
   * number is currently active */
  if (secondNumber) {
    LazyL10n.get(function localized(_) {
      node.textContent = _('switch-calls');
      self._cachedInfo = _('switch-calls');
      self._cachedAdditionalInfo = '';
      self.replaceAdditionalContactInfo('');
    });
    return;
  }

  if (!number) {
    LazyL10n.get(function localized(_) {
      node.textContent = _('withheld-number');
      self._cachedInfo = _('withheld-number');
    });
    return;
  }

  var isEmergencyNumber = this.call.emergency;
  if (isEmergencyNumber) {
    LazyL10n.get(function localized(_) {
      node.textContent = _('emergencyNumber');
      self._cachedInfo = _('emergencyNumber');
    });
    return;
  }

  var self = this;
  Voicemail.check(number, function(isVoicemailNumber) {
    if (isVoicemailNumber) {
      LazyL10n.get(function localized(_) {
        node.textContent = _('voiceMail');
        self._cachedInfo = _('voiceMail');
      });
      self.recentsEntry.voicemail = true;
    } else {
      Contacts.findByNumber(number, lookupContact);
      checkICCMessage();
    }
  });

  function checkICCMessage() {
    var callMessageReq = navigator.mozSettings.createLock().
      get('icc.callmessage');
    callMessageReq.onsuccess = function onCallMessageSuccess() {
      self._iccCallMessage = callMessageReq.result['icc.callmessage'];
      if (self._iccCallMessage) {
        self.replacePhoneNumber(self._iccCallMessage, 'end', true);
        self._cachedInfo = self._iccCallMessage;
        var clearReq = navigator.mozSettings.createLock().set({
          'icc.callmessage': null
        });
      }
    };
  }

  function lookupContact(contact, matchingTel, contactsWithSameNumber) {
    if (self._iccCallMessage) {
      return;
    }
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
        CallScreen.setCallerContactImage(self.photo,
                                         {force: true});
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
    this.node.classList.remove('additionalInfo');
  } else {
    this.additionalInfoNode.textContent = additionalContactInfo;
    this.node.classList.add('additionalInfo');
  }
};

HandledCall.prototype.restoreAdditionalContactInfo =
  function hc_restoreAdditionalContactInfo() {
    this.replaceAdditionalContactInfo(this._cachedAdditionalInfo);
};

HandledCall.prototype.formatPhoneNumber =
  function hc_formatPhoneNumber(ellipsisSide, maxFontSize) {
    // In status bar mode, we want a fixed font-size
    if (CallScreen.inStatusBarMode) {
      this.numberNode.style.fontSize = '';
      return;
    }

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
  var classList = this.node.classList;
  if (this._initialState == 'incoming') {
    classList.add('incoming');
  } else {
    classList.add('outgoing');
  }

  if (this.call.state == 'connected') {
    classList.add('ongoing');
  }
};

HandledCall.prototype.remove = function hc_remove() {
  this.call.removeEventListener('statechange', this);
  this.photo = null;

  clearInterval(this._ticker);
  this._ticker = null;

  if (this.node.parentNode) {
    this.node.parentNode.removeChild(this.node);
  }
  this.node = null;
};

HandledCall.prototype.connected = function hc_connected() {
  if (this.recentsEntry.type === 'incoming') {
    this.recentsEntry.status = 'connected';
  }

  this.node.hidden = false;
  this.node.classList.remove('held');

  this.startTimer();
  this.updateDirection();
  CallScreen.enableKeypad();
  CallScreen.syncSpeakerEnabled();
};

HandledCall.prototype.disconnected = function hc_disconnected() {
  var self = this;
  if (this._leftGroup) {
    LazyL10n.get(function localized(_) {
      CallScreen.showStatusMessage(_('caller-left-call',
        {caller: self._cachedInfo}));
    });
    self._leftGroup = false;
  }

  var entry = this.recentsEntry;
  if (entry.contactInfo) {
    if (typeof entry.contactInfo.contact === 'string') {
      entry.contactInfo.contact = JSON.parse(entry.contactInfo.contact);
    }
    if (typeof entry.contactInfo.matchingTel === 'string') {
      var tel = entry.contactInfo.matchingTel;
      entry.contactInfo.matchingTel = JSON.parse(tel);
    }
  }

  CallsHandler.addRecentEntry(entry);

  this.remove();
};

HandledCall.prototype.show = function hc_show() {
  if (this.node) {
    this.node.hidden = false;
  }
};

HandledCall.prototype.hide = function hc_hide() {
  if (this.node) {
    this.node.hidden = true;
  }
};
