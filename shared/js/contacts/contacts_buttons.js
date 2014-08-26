'use strict';

/* exported ContactsButtons */

/* globals TelephonyHelper, LazyLoader, MozActivity, Contacts, Normalizer,
           utils, MmiManager, MultiSimActionButton, SmsIntegration */

var ContactsButtons = {
  DEFAULT_TEL_TYPE: 'other',
  DEFAULT_EMAIL_TYPE: 'other',
  PHONE_TYPE_MAP: {
    'cell' : 'mobile'
  },

  _listContainer: null,
  _contactDetails: null,

  _activityHandler: null,

  init: function init(listContainer, contactDetails, activityHandler) {
    this._listContainer = listContainer;
    this._contactDetails = contactDetails;
    this._activityHandler = activityHandler;
  },

  _enableCalls: function enableCalls() {
    this._contactDetails.classList.remove('calls-disabled');
  },

  _disableCalls: function disableCalls() {
    this._contactDetails.classList.add('calls-disabled');
  },

  _call: function call(phoneNumber, cardIndex) {
    this._disableCalls();
    var enableCalls = this._enableCalls.bind(this);
    TelephonyHelper.call(phoneNumber, cardIndex, enableCalls, enableCalls,
                         enableCalls, enableCalls);
  },

  // Check current situation and setup different listener for the button
  _setupPhoneButtonListener: function setupPhoneButtonListener(button, number) {
    var self = this;
    LazyLoader.load(['/dialer/js/mmi.js'], function() {
      if (self._activityHandler &&
          self._activityHandler.currentActivityIsNot(['open'])) {
        button.addEventListener('click', self._onPickNumber.bind(self));
      } else if ((window.navigator.mozMobileConnections &&
          window.navigator.mozMobileConnections[0]) &&
          MmiManager.isMMI(number)) {
        button.addEventListener('click', self._onMMICode.bind(self));
      } else if (navigator.mozTelephony) {
        LazyLoader.load(['/shared/js/multi_sim_action_button.js'], function() {
          /* jshint nonew: false */
          new MultiSimActionButton(button, self._call.bind(self),
                                   'ril.telephony.defaultServiceId',
                                   function() { return number; });
        });
      }
    });
  },

  // If we are currently handing an activity, send the phone
  // number as result of clicking in the phone button.
  _onPickNumber: function onPickNumber(evt) {
    var number = evt.target.dataset.tel;
    if (this._activityHandler) {
      this._activityHandler.postPickSuccess({ number: number });
    }
  },

  // If the phone number stored in a contact is a MMI code,
  // launch the dialer with that specific code.
  _onMMICode: function onMMICode(evt) {
    var number = evt.target.dataset.tel;
    // For security reasons we cannot directly call MmiManager.send(). We
    // need to show the MMI number in the dialer instead.
    /* jshint nonew: false */
    new MozActivity({
      name: 'dial',
      data: {
        type: 'webtelephony/number',
        number: number
      }
    });
  },

  _onSendSmsClicked: function onSendSmsClicked(evt) {
    var tel = evt.target.dataset.tel;
    SmsIntegration.sendSms(tel);
  },

  _onEmailOrPickClick: function onEmailOrPickClick(evt) {
    evt.preventDefault();
    var email = evt.target.dataset.email;
    Contacts.sendEmailOrPick(email);
    return false;
  },

  renderPhones: function cd_renderPhones(contact) {
    if (!contact.tel) {
      return;
    }
    var telLength = Contacts.getLength(contact.tel);
    for (var tel = 0; tel < telLength; tel++) {
      var currentTel = contact.tel[tel];
      var escapedType = Normalizer.escapeHTML(currentTel.type, true).trim();
      var carrier = Normalizer.escapeHTML(currentTel.carrier || '', true) || '';
      if (!escapedType) {
        escapedType =
          navigator.mozL10n.get(this.PHONE_TYPE_MAP[escapedType] ||
                                escapedType ||
                                this.DEFAULT_TEL_TYPE);
      }

      var telField = {
        value: Normalizer.escapeHTML(currentTel.value, true) || '',
        type: escapedType + (carrier ? navigator.mozL10n.get('separator') : ''),
        'type_l10n_id': currentTel.type,
        carrier: carrier,
        i: tel
      };

      var phonesTemplate =
        document.querySelector('#phone-details-template-\\#i\\#');
      var template = utils.templates.render(phonesTemplate, telField);

      // Add event listeners to the phone template components
      var sendSmsButton = template.querySelector('#send-sms-button-' + tel);
      sendSmsButton.dataset.tel = telField.value;
      sendSmsButton.addEventListener('click',
                                     this._onSendSmsClicked.bind(this));

      var callOrPickButton = template.querySelector('#call-or-pick-' + tel);
      callOrPickButton.dataset.tel = telField.value;
      this._setupPhoneButtonListener(callOrPickButton, telField.value);

      this._listContainer.appendChild(template);
    }
  },

  renderEmails: function cd_renderEmails(contact) {
    if (!contact.email) {
      return;
    }
    var emailLength = Contacts.getLength(contact.email);
    for (var email = 0; email < emailLength; email++) {
      var currentEmail = contact.email[email];
      var escapedType = Normalizer.escapeHTML(currentEmail.type, true);
      var emailField = {
        value: Normalizer.escapeHTML(currentEmail.value, true) || '',
        type: navigator.mozL10n.get(escapedType) ||
              escapedType || this.DEFAULT_EMAIL_TYPE,
        'type_l10n_id': currentEmail.type,
        i: email
      };
      var emailsTemplate =
        document.querySelector('#email-details-template-\\#i\\#');
      var template = utils.templates.render(emailsTemplate, emailField);

      // Add event listeners to the phone template components
      var emailButton = template.querySelector('#email-or-pick-' + email);
      emailButton.dataset.email = emailField.value;
      emailButton.addEventListener('click',
                                   this._onEmailOrPickClick.bind(this));

      this._listContainer.appendChild(template);
    }
  },

  reMark: function(field, value, remarkClass) {
    var selector = '[data-' + field + '="' + value + '"]';
    var elements = this._listContainer.querySelectorAll(selector);

    if (typeof remarkClass === 'undefined') {
      remarkClass = 'remark';
    }

    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.add(remarkClass);
    }
  }
};

