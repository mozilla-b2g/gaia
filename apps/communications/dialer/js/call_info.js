'use strict';

/* global CallLogDBManager, LazyLoader, MozActivity, Utils, ContactsButtons,
          Contacts */

(function(exports) {
  var currentGroup;
  var detailsButton;
  var addToContactButton;
  var createContactButton;
  var callInfoView;
  var phoneDetailsElt;
  var emailDetailsElt;
  var listDetailsElt;

  function updateView(group) {
    currentGroup = group;
    updateGroupInformation(group);
    updateCallDurations(group);
    updateActionButtons(group);
    callInfoView.hidden = false;
  }

  function isMissedCall(group) {
    return group.type === 'incoming' && group.status !== 'connected';
  }

  function updateGroupInformation(group) {
    var titleElt = document.getElementById('call-info-title');
    if (group.contact) {
      titleElt.textContent = group.contact.primaryInfo;
    } else if (group.voicemail) {
      titleElt.setAttribute('data-l10n-id', 'voiceMail');
    } else if (group.emergency) {
      titleElt.setAttribute('data-l10n-id', 'emergencyNumber');
    } else {
      titleElt.textContent = group.number;
    }

    document.getElementById('call-info-day').textContent =
      Utils.headerDate(parseInt(group.date));

    var classList = document.getElementById('call-info-direction').classList;
    classList.remove('icon-outgoing', 'icon-incoming', 'icon-missed');
    if (isMissedCall(group)) {
      classList.add('icon-missed');
    } else if (group.type === 'dialing' || group.type === 'alerting') {
      classList.add('icon-outgoing');
    } else if (group.type === 'incoming'){
      classList.add('icon-incoming');
    }
  }

  function updateCallDurations(group) {
    var callDurationsElt = document.getElementById('call-durations');
    callDurationsElt.innerHTML = '';

    /* Old groups did not record call durations */
    if (!group.calls) {
      return;
    }

    group.calls.forEach(function(call) {
      var startTime = document.createElement('p');
      startTime.classList.add('ci__grow');
      startTime.classList.add('js-ci-start-times');
      startTime.dataset.date = call.date;
      startTime.textContent = Utils.prettyDate(call.date);

      var duration = document.createElement('p');
      duration.classList.add('cd__duration');
      navigator.mozL10n.once(function() {
        if (call.duration === 0) {
          if (group.type === 'incoming') {
            duration.setAttribute('data-l10n-id', 'info-missed');
          } else {
            duration.setAttribute('data-l10n-id', 'canceled');
          }
        } else {
          duration.textContent =
            Utils.prettyDuration(call.duration, 'callDurationText');
        }
      });

      var row = document.createElement('div');
      row.classList.add('call-duration');
      row.appendChild(startTime);
      row.appendChild(duration);

      callDurationsElt.appendChild(row);
    });
  }

  function updateStartTimes() {
    var startTimeElts = document.querySelectorAll('.js-ci-start-times');
    for (var i=0, il=startTimeElts.length; i<il; i++) {
      var startTimeElt = startTimeElts[i];
      var date = parseInt(startTimeElt.dataset.date, 10);
      startTimeElt.textContent = Utils.prettyDate(date);
    }
  }

  function renderPhones(group, contact) {
    ContactsButtons.renderPhones(contact);
    var remark = isMissedCall(group) ? 'remark-missed' : 'remark';
    ContactsButtons.reMark(
      'tel', group.number || group.contact.matchingTel.number, remark);
  }

  function updateActionButtons(group) {
    listDetailsElt.innerHTML = '';

    detailsButton.hidden = true;
    addToContactButton.hidden = true;
    createContactButton.hidden = true;

    if (group.contact) {
      detailsButton.hidden = false;

      Contacts.findByNumber(group.contact.matchingTel.number,
      function(contact, matchingTel) {
        ContactsButtons.renderEmails(contact);
        renderPhones(group, contact);
      });
    } else {
      addToContactButton.hidden = false;
      createContactButton.hidden = false;

      var contact = {
        tel: [
          {
            value: group.number,
            type: 'mobile'
          }
        ]
      };
      renderPhones(group, contact);
    }
  }

  function close(evt) {
    if (evt.detail.type === 'back') {
      callInfoView.hidden = true;
    }
  }

  function viewContact() {
    window.location.hash = '#contacts-view';
    setTimeout(function nextTick() { /* we'll have the iframe by then */
      var contactsIframe = document.getElementById('iframe-contacts');
      var src = '/contacts/index.html';
      src += '#view-contact-details?id=' + currentGroup.contact.id;
      src += '&tel=' + currentGroup.number;
      // Enable the function of receiving the messages posted from the iframe.
      src += '&back_to_previous_tab=1';
      // Contacts app needs to know if it's a missed call for different
      // highlight color of the phone number in contacts details
      src += '&isMissedCall=' + isMissedCall(currentGroup);
      var timestamp = new Date().getTime();
      contactsIframe.src = src + '&timestamp=' + timestamp;
    });
  }

  function createNewContact() {
    launchActivity('new', currentGroup.number);
  }

  function addToExistingContact() {
    launchActivity('update', currentGroup.number);
  }

  function launchActivity(name, phoneNumber) {
    try {
      /* jshint nonew: false */
      new MozActivity({
        name: name,
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': phoneNumber
          }
        }
      });
    } catch (e) {
      console.error('Error while creating activity');
    }
  }

  function initListeners() {
    detailsButton = document.getElementById('call-info-details');
    detailsButton.addEventListener('click', viewContact);
    addToContactButton = document.getElementById('call-info-add');
    addToContactButton.addEventListener('click', addToExistingContact);
    createContactButton = document.getElementById('call-info-create');
    createContactButton.addEventListener('click', createNewContact);
    var header = document.getElementById('call-info-gaia-header');
    header.addEventListener('action', close);

    window.addEventListener('timeformatchange', updateStartTimes);
  }

  // FIXME/bug 1060290: The build system doesn't allow nested fragments, so we
  // can work around this for now by loading all elements at the root level and
  // then resolving them to the correct location, e.g. fragment-name-stub, on
  // runtime.
  function replaceFragmentStub(stub, fragment) {
    var parent = stub.parentNode;
    parent.insertBefore(fragment, stub);
    parent.removeChild(stub);
    fragment.hidden = false;
  }

  function initFragments() {
    var phoneDetailsStub = document.getElementById('phone-details-stub');
    phoneDetailsElt = document.getElementById('phone-details');

    var emailDetailsStub = document.getElementById('email-details-stub');
    emailDetailsElt = document.getElementById('email-details');

    var contactDetailsElt = document.getElementById('contact-detail');
    listDetailsElt = document.getElementById('call-info-list-details');

    LazyLoader.load([phoneDetailsElt, emailDetailsElt], function() {
      replaceFragmentStub(phoneDetailsStub, phoneDetailsElt);
      replaceFragmentStub(emailDetailsStub, emailDetailsElt);

      ContactsButtons.init(listDetailsElt, contactDetailsElt);
    });
  }

  var CallInfo = {
    _initialised: false,
    show: function(number, date, type, status) {
      callInfoView = document.getElementById('call-info-view');
      var self = this;
      LazyLoader.load([callInfoView,
                       '/shared/js/dialer/contacts.js',
                       '/shared/js/dialer/utils.js',
                       '/shared/js/contacts/contacts_buttons.js',
                       '/shared/js/contacts/utilities/templates.js',
                       '/shared/js/contacts/sms_integration.js',
                       '/shared/js/text_normalizer.js',
                       '/dialer/js/telephony_helper.js',
                       '/shared/style/contacts/contacts_buttons.css',
                       '/shared/style/contacts.css',
                       '/dialer/style/buttons.css'], function() {
        if (!self._initialised) {
          self._initialised = true;
          initListeners();
          initFragments();
        }
        date = parseInt(date, 10);
        CallLogDBManager.getGroup(number, date, type, status)
          .then(updateView);
      });
    }
  };
  exports.CallInfo = CallInfo;
})(window);
