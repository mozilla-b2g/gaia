/* globals CallsHandler, CallScreen,
           ConferenceGroupHandler, Contacts, ContactPhotoHelper,
           FontSizeManager, FontSizeUtils, Utils, Voicemail, TonePlayer */

'use strict';

function HandledCall(aCall) {
  this.photo = null;
  this._leftGroup = false;
  this.call = aCall;

  aCall.addEventListener('statechange', this);

  aCall.ongroupchange = (function onGroupChange() {
    if (this.call.group) {
      ConferenceGroupHandler.addToGroupDetails(this.node);
      this._leftGroup = false;
    } else if (this._wasUnmerged()) {
      if (ConferenceGroupHandler.isGroupDetailsShown()) {
        // Since the call has been unmerged and its node will be moved from the
        // participant list overlay to the main call screen, the call node is
        // cloned and added to the call node parent so it is kept in the
        // participant list overlay until it is hidden.
        this.node.parentNode.insertBefore(this.node.cloneNode(true), this.node);
      }
      // Move the call node from the conference call participant list overlay
      //  to the main call screen page.
      CallScreen.insertCall(this.node);
      this._leftGroup = false;
    } else {
      this._leftGroup = !this.node.dataset.groupHangup;
    }
  }).bind(this);

  this._initialState = this.call.state;
  this._cachedInfo = null;
  this._cachedAdditionalTel = null;
  this._cachedAdditionalTelType = null;
  this._removed = false;
  this._wasConnected = false;

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
  this.numberNode = this.node.querySelector('.numberWrapper .number bdi');
  this.outerNode = this.node.querySelector('.numberWrapper .number');
  this.groupCallNumberNode =
    document.getElementById('group-call-label');
  this.additionalTelNode =
    this.node.querySelector('.additionalContactInfo .tel');
  this.additionalTelTypeNode =
    this.node.querySelector('.additionalContactInfo .tel-type');
  this.hangupButton = this.node.querySelector('.hangup-button');
  this.hangupButton.onclick = (function() {
    this.call.hangUp();
  }.bind(this));

  this.updateCallNumber();
  this.createCustomStyles();

  /* Observe changes to the node that holds the call duration, this is also
   * used for displaying the call ended string and needs to be resized
   * dynamically to accomodate for certain locales. */
  this.mutationObserverConfig = { childList: true };
  this.mutationObserver =
    new MutationObserver(this.observeMutation.bind(this));
  this.mutationObserver.observe(this.durationChildNode,
                                this.mutationObserverConfig);

  navigator.mozL10n.setAttributes(this.durationChildNode,
    (this.call.state === 'incoming') ? 'incoming' : 'connecting');
  this.updateDirection();

  if (navigator.mozIccManager.iccIds.length > 1) {
    this.node.classList.add('sim-info');
    var n = this.call.serviceId + 1;
    navigator.mozL10n.setAttributes(this.viaSimNode, 'via-sim', { n: n });
    navigator.mozL10n.setAttributes(this.simNumberNode, 'sim-number', { n: n });
  } else {
    this.viaSimNode.hidden = true;
    this.simNumberNode.hidden = true;
  }

  // Some calls might be already connected
  if (this._initialState === 'connected') {
    this.connected();
  }
}

/**
 * Creates the global custom style used for resizing the call ended string.
 * Re-uses the existing one it if the style is already present.
 */
HandledCall.prototype.createCustomStyles = function hc_createCustomStyles() {
  const CUSTOM_STYLE_ID = 'call-ended-custom-style';

  var style = document.getElementById(CUSTOM_STYLE_ID);

  if (!style) {
    style = document.createElement('style');
    style.id = CUSTOM_STYLE_ID;
    document.head.appendChild(style);
  }

  this.callEndedStyleSheet = style.sheet;
};

/**
 * Recomputes the font size rules so that the call ended string fits both in
 * the callscreen display and in the statusbar.
 */
HandledCall.prototype.computeCallEndedFontSizeRules =
function hc_computeCallEndedFontSizeRules() {
  // Remove the existing rules
  while (this.callEndedStyleSheet.cssRules.length > 0) {
    this.callEndedStyleSheet.deleteRule(0);
  }

  var computedStyle = window.getComputedStyle(this.durationChildNode);
  var fontFamily = computedStyle.fontFamily;
  var allowedSizes = [ 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27 ];

  /* Compute the size of the font for displaying the string in the callscreen,
   * this rules only apply when there's a single call, i.e. when the
   * big-duration class is present in the calls node. */
  var info = FontSizeUtils.getMaxFontSizeInfo(
    this.durationChildNode.textContent, allowedSizes, fontFamily, 180);
  var rule =
    '@media (min-height: 4.5em) {' +
    '  #calls.big-duration > section.ended .duration > span,' +
    '  #calls.big-duration > section.ended .total-duration {' +
    '    font-size: ' + (info.fontSize / 10.0) + 'rem;' +
    '  }' +
    '}';
  this.callEndedStyleSheet.insertRule(rule,
    this.callEndedStyleSheet.cssRules.length);
};

/**
 * Observe DOM mutations. This will automatically resize the call ended string
 * once it's displayed at the end of a call.
 */
HandledCall.prototype.observeMutation =
function hc_observeMutation(mutations) {
  if (this.durationChildNode.hasAttribute('data-l10n-id') &&
      this.durationChildNode.getAttribute('data-l10n-id') === 'callEnded') {
    /* Disable the observer to prevent it from being called recursively
     * while we modify the DOM tree, re-enable it once we're done . */
    this.mutationObserver.disconnect();
    this.computeCallEndedFontSizeRules();
    this.mutationObserver.observe(this.durationChildNode,
                                  this.mutationObserverConfig);
  }
};

HandledCall.prototype._wasUnmerged = function hc_wasUnmerged() {
  return !this.node.dataset.groupHangup &&
         this.call.state != 'disconnecting' &&
         this.call.state != 'disconnected';
};

HandledCall.prototype.handleEvent = function hc_handle(evt) {
  CallsHandler.updatePlaceNewCall();
  CallsHandler.updateMergeAndOnHoldStatus();
  CallsHandler.updateMuteAndSpeakerStatus();

  switch (evt.call.state) {
    case 'connected':
      CallScreen.render('connected');
      this.connected();
      break;
    case 'disconnected':
      this.disconnected();
      break;
    case 'held':
      this.node.classList.add('held');
      CallScreen.render('connected-hold');
      break;
  }
};

HandledCall.prototype.updateCallNumber = function hc_updateCallNumber() {
  var number = this.call.id.number;
  var self = this;

  CallScreen.setCallerContactImage();

  /* If we have a second call waiting in CDMA mode then we don't know which
   * number is currently active */
  if (this.call.secondId) {
    this.replacePhoneNumber('switch-calls');
    this.replaceAdditionalContactInfo(null, null);
    return;
  }

  if (!number) {
    this.replacePhoneNumber('withheld-number');
    return;
  }

  var isEmergencyNumber = this.call.emergency;
  if (isEmergencyNumber) {
    this.node.classList.add('emergency');
    this.replacePhoneNumber({ raw: number }, 'end');
    this.replaceAdditionalContactInfo('emergencyNumber');
    return;
  }

  Voicemail.check(number, this.call.serviceId).then(
  function(isVoicemailNumber) {
    if (isVoicemailNumber) {
      self.replacePhoneNumber('voiceMail');
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
        self.replacePhoneNumber({ raw: self._iccCallMessage }, 'end');
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
      if (primaryInfo) {
        self.replacePhoneNumber({ raw: primaryInfo }, 'end');
      } else {
        self.replacePhoneNumber('withheld-number');
      }
      self.replaceAdditionalContactInfo({ raw: matchingTel.value },
        Utils.getPhoneNumberAdditionalInfo(matchingTel));

      var photo = ContactPhotoHelper.getFullResolution(contact);
      if (photo) {
        self.photo = photo;
        CallScreen.setCallerContactImage();
      }

      return;
    }

    self.replacePhoneNumber({ raw: number }, 'end');
    self.replaceAdditionalContactInfo(self._cachedAdditionalTel,
                                      self._cachedAdditionalTelType);
  }
};

HandledCall.prototype.replaceAdditionalContactInfo =
  function hc_replaceAdditionalContactInfo(additionalTel, additionalTelType) {
  if (!additionalTel && !additionalTelType) {
    this.additionalTelNode.removeAttribute('data-l10n-id');
    this.additionalTelNode.textContent = '';
    this.additionalTelTypeNode.removeAttribute('data-l10n-id');
    this.additionalTelTypeNode.textContent = '';
    this.node.classList.remove('additionalInfo');
  } else {
    if (typeof(additionalTel) === 'string') {
      navigator.mozL10n.setAttributes(this.additionalTelNode, additionalTel);
    } else if (additionalTel.id) {
      navigator.mozL10n.setAttributes(this.additionalTelNode, additionalTel.id,
                                      additionalTel.args);
    } else if (additionalTel.raw) {
      this.additionalTelNode.removeAttribute('data-l10n-id');
      this.additionalTelNode.textContent = additionalTel.raw;
    }

    if (additionalTelType) {
      navigator.mozL10n.setAttributes(this.additionalTelTypeNode,
                                      additionalTelType.id,
                                      additionalTelType.args);
    }

    this.node.classList.add('additionalInfo');
  }

  this._cachedAdditionalTel = additionalTel;
  this._cachedAdditionalTelType = additionalTelType || null;
};

HandledCall.prototype.restoreAdditionalContactInfo =
  function hc_restoreAdditionalContactInfo() {
    this.replaceAdditionalContactInfo(this._cachedAdditionalTel,
                                      this._cachedAdditionalTelType);
};

HandledCall.prototype.formatPhoneNumber =
  function hc_formatPhoneNumber(ellipsisSide) {
    if (this._removed) {
      return;
    }

    // Don't format if the call is in a conference.
    if (this.call.group) {
      this.numberNode.style = '';
      return;
    }

    var scenario = CallScreen.getScenario();
    // To cover the second incoming call sub-scenario of the call waiting one,
    //  we have to check if the current call is in incoming state and if the
    //  incoming lower pane is being shown.
    if (scenario === FontSizeManager.CALL_WAITING &&
        this.call.state === 'incoming' &&
        CallScreen.incomingContainer.classList.contains('displayed')) {
      scenario = FontSizeManager.SECOND_INCOMING_CALL;
    }
    FontSizeManager.adaptToSpace(
      scenario, this.outerNode, false, ellipsisSide);
    if (this.node.classList.contains('additionalInfo')) {
      FontSizeManager.ensureFixedBaseline(scenario, this.numberNode);
    } else {
      FontSizeManager.resetFixedBaseline(this.numberNode);
    }
};

HandledCall.prototype.replacePhoneNumber =
  function hc_replacePhoneNumber(number, ellipsisSide) {
    if (typeof(number) === 'string') {
      navigator.mozL10n.setAttributes(this.numberNode, number);
    } else if (number.id) {
      navigator.mozL10n.setAttributes(this.numberNode, number.id,
                                      number.args);
      this.numberNode.style.fontSize = '';
    } else if (number.raw) {
      this.numberNode.removeAttribute('data-l10n-id');
      this.numberNode.textContent = number.raw;
      this.formatPhoneNumber(ellipsisSide);
    }

    this._cachedInfo = number;
};

HandledCall.prototype.restorePhoneNumber =
  function hc_restorePhoneNumber() {
    this._cachedInfo && this.replacePhoneNumber(this._cachedInfo, 'end');
};

HandledCall.prototype.updateDirection = function hc_updateDirection() {
  var classList = this.node.classList;
  if (this._initialState === 'incoming') {
    classList.add('incoming');
    this.node.setAttribute('data-l10n-id', 'incoming_screen_reader');
  } else {
    classList.add('outgoing');
    this.node.setAttribute('data-l10n-id', 'outgoing_screen_reader');
  }

  if (this.call.state === 'connected') {
    classList.add('ongoing');
  }
};

HandledCall.prototype.remove = function hc_remove() {
  this._removed = true;
  this.call.removeEventListener('statechange', this);
  this.photo = null;

  var self = this;
  CallScreen.stopTicker(this.durationNode);
  var currentDuration = ConferenceGroupHandler.isGroupDetailsShown() ?
    ConferenceGroupHandler.currentDuration : this.durationChildNode.textContent;

  this.node.classList.add('ended');
  this.durationNode.classList.remove('isTimer');

  /* This string will be resized automatically to fit its container, see
   * hc_observeMutations() & hc_computeCallEndedFontSizeRules. */
  navigator.mozL10n.setAttributes(this.durationChildNode, 'callEnded');

  // FIXME/bug 1007148: Refactor duration element structure. No number or ':'
  // existence checking will be necessary.
  var totalDuration = !!currentDuration.match(/\d+/g) ? currentDuration : '';
  this.totalDurationNode.textContent = totalDuration;

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
  CallScreen.syncSpeakerEnabled();

  this.updateCallNumber();

  this._wasConnected = true;
};

HandledCall.prototype.disconnected = function hc_disconnected() {
  if (this._leftGroup) {
    if (typeof(this._cachedInfo) === 'string') {
      CallScreen.showStatusMessage(this._cachedInfo);
    } else if (this._cachedInfo.id) {
      const disconnectedMessageL10n = {
        'withheld-number': 'withheld-number-left-call',
        'voiceMail':       'voicemail-left-call'
      };
      var id = disconnectedMessageL10n[this._cachedInfo.id];

      CallScreen.showStatusMessage(id);
    } else if (this._cachedInfo.raw) {
      CallScreen.showStatusMessage({
        id: 'caller-left-call',
        args: { caller: this._cachedInfo.raw }
      });
    }

    this._leftGroup = false;
  }

  // Play End call tone only if the call was connected.
  if (this._wasConnected) {
    TonePlayer.playSequence([[480, 620, 250]]);
  }
  this._wasConnected = false;

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
