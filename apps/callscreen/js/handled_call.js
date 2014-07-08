/* globals CallsHandler, CallScreen, Contacts, ContactPhotoHelper,
           FontSizeManager, LazyL10n, Utils, Voicemail */

'use strict';

function HandledCall(aCall) {
  this.photo = null;
  this._leftGroup = false;
  this.call = aCall;

  aCall.addEventListener('statechange', this);

  aCall.ongroupchange = (function onGroupChange() {
    if (this.call.group) {
      CallScreen.moveToGroup(this.node);
      this._leftGroup = false;
    } else if (this._wasUnmerged()) {
      CallScreen.insertCall(this.node);
      this._leftGroup = false;
    } else {
      this._leftGroup = !this.node.dataset.groupHangup;
    }
  }).bind(this);

  this._initialState = this.call.state;
  this._cachedInfo = '';
  this._cachedAdditionalInfo = '';
  this._removed = false;

  this.node = document.getElementById('handled-call-template').cloneNode(true);
  this.node.id = '';
  this.node.classList.add('handled-call');
  this.node.hidden = false;

  // TODO: The structure of the duration related elements will be refactored in
  //  https://bugzilla.mozilla.org/show_bug.cgi?id=1007148
  this.durationNode = this.node.querySelector('.duration');
  this.durationChildNode = this.node.querySelector('.duration span');
  this.totalDurationNode = this.node.querySelector('.total-duration');
  this.viaSimNode = this.node.querySelector('.sim .via-sim');
  this.simNumberNode = this.node.querySelector('.sim .sim-number');
  this.numberNode = this.node.querySelector('.numberWrapper .number');
  this.groupCallNumberNode =
    document.getElementById('group-call-label');
  this.groupCallFakeNumberNode =
    document.querySelector('#group-call .fake-number');
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
    this.updateDirection();

    if (navigator.mozIccManager.iccIds.length > 1) {
      var n = this.call.serviceId + 1;
      this.viaSimNode.textContent = _('via-sim', { n: n });
      this.simNumberNode.textContent = _('sim-number', { n: n });
    } else {
      this.viaSimNode.hidden = true;
      this.simNumberNode.hidden = true;
    }
  }).bind(this));

  // Some calls might be already connected
  if (this._initialState === 'connected') {
    this.connected();
  }
}

HandledCall.prototype._wasUnmerged = function hc_wasUnmerged() {
  return !this.node.dataset.groupHangup &&
         this.call.state != 'disconnecting' &&
         this.call.state != 'disconnected';
};

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
    case 'held':
      CallsHandler.updateKeypadEnabled();
      this.node.classList.add('held');
      break;
  }
};

HandledCall.prototype.updateCallNumber = function hc_updateCallNumber() {
  var number = this.call.id ? this.call.id.number : this.call.number;
  var node = this.numberNode;
  var self = this;

  CallScreen.setCallerContactImage();

  /* If we have a second call waiting in CDMA mode then we don't know which
   * number is currently active */
  if (this.call.secondNumber || this.call.secondId) {
    LazyL10n.get(function localized(_) {
      node.textContent = _('switch-calls');
      self._cachedInfo = _('switch-calls');
      self._cachedAdditionalInfo = '';
      self.replaceAdditionalContactInfo('');
      self.numberNode.style.fontSize = '';
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
    this.node.classList.add('emergency');
    LazyL10n.get(function localized(_) {
      self.replacePhoneNumber(number, 'end');
      self._cachedInfo = number;
      self.replaceAdditionalContactInfo(_('emergencyNumber'));
      self._cachedAdditionalInfo = _('emergencyNumber');
    });

    return;
  }

  Voicemail.check(number, function(isVoicemailNumber) {
    if (isVoicemailNumber) {
      LazyL10n.get(function localized(_) {
        node.textContent = _('voiceMail');
        self._cachedInfo = _('voiceMail');
      });
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
        self.replacePhoneNumber(self._iccCallMessage, 'end');
        self._cachedInfo = self._iccCallMessage;
        navigator.mozSettings.createLock().set({'icc.callmessage': null});
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
      self.formatPhoneNumber('end');
      self._cachedAdditionalInfo =
        Utils.getPhoneNumberAdditionalInfo(matchingTel);
      self.replaceAdditionalContactInfo(self._cachedAdditionalInfo);
      var photo = ContactPhotoHelper.getFullResolution(contact);
      if (photo) {
        self.photo = photo;
        CallScreen.setCallerContactImage();

        var thumbnail = ContactPhotoHelper.getThumbnail(contact);
        contactCopy.photo = [thumbnail];
      }

      return;
    }

    self._cachedInfo = number;
    node.textContent = self._cachedInfo;
    self.replaceAdditionalContactInfo(self._cachedAdditionalInfo);
    self.formatPhoneNumber('end');
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
  function hc_formatPhoneNumber(ellipsisSide) {
    if (this._removed) {
      return;
    }

    FontSizeManager.adaptToSpace(
      CallScreen.getScenario(), this.numberNode,
      this.node.querySelector('.fake-number'), false, ellipsisSide);
};

HandledCall.prototype.replacePhoneNumber =
  function hc_replacePhoneNumber(phoneNumber, ellipsisSide) {
    this.numberNode.textContent = phoneNumber;
    this.formatPhoneNumber(ellipsisSide);
};

HandledCall.prototype.restorePhoneNumber =
  function hc_restorePhoneNumber() {
    this.numberNode.textContent = this._cachedInfo;
    this.formatPhoneNumber('end');
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
  this._removed = true;
  this.call.removeEventListener('statechange', this);
  this.photo = null;

  var self = this;
  CallScreen.stopTicker(this.durationNode);
  var currentDuration = this.durationChildNode.textContent;
  // FIXME/bug 1007148: Refactor duration element structure. No number or ':'
  //  existence checking will be necessary.
  this.totalDurationNode.textContent =
    !!currentDuration.match(/\d+/g) ? currentDuration : '';

  LazyL10n.get(function localized(_) {
    self.durationNode.classList.remove('isTimer');
    self.durationChildNode.textContent = _('callEnded');
  });
  this.node.classList.add('ended');
  setTimeout(function(evt) {
    CallScreen.removeCall(self.node);
    self.node = null;
  }, CallScreen.callEndPromptTime);
};

HandledCall.prototype.connected = function hc_connected() {
  this.show();
  this.node.classList.remove('held');

  this.updateDirection();
  CallScreen.createTicker(this.durationNode);
  CallScreen.enableKeypad();
  CallScreen.syncSpeakerEnabled();

  CallScreen.setCallerContactImage();
};

HandledCall.prototype.disconnected = function hc_disconnected() {
  var self = this;
  if (this._leftGroup) {
    LazyL10n.get(function localized(_) {
      CallScreen.showStatusMessage(_('caller-left-call',
        {caller: self._cachedInfo.toString()}));
    });
    self._leftGroup = false;
  }

  this.remove();
};

HandledCall.prototype.show = function hc_show() {
  if (this.node) {
    this.node.hidden = false;
  }
  CallScreen.updateCallsDisplay();
};

HandledCall.prototype.hide = function hc_hide() {
  if (this.node) {
    this.node.hidden = true;
  }
  CallScreen.updateCallsDisplay();
};
