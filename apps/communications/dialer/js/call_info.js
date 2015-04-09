'use strict';

/* global CallLog, CallLogDBManager, Contacts, ContactsButtons, LazyLoader,
          MozActivity, SimplePhoneMatcher, Utils */

(function(exports) {
  var currentGroup;
  var detailsButton;
  var addToContactButton;
  var createContactButton;
  var callInfoView;
  var phoneDetailsElt;
  var emailDetailsElt;
  var listDetailsElt;

  function updateViewIfNeeded(evt) {
    if (evt.detail.group.id !== currentGroup.id) {
      return;
    }

    updateView(evt.detail.group);
  }

  function updateView(group) {
    currentGroup = group;
    updateGroupInformation(group);
    updateCallDurations(group);
    updateActionButtons(group);
    callInfoView.hidden = false;
    CallLog.hideEditModeButton();
  }

  function isMissedCall(group) {
    return group.type === 'incoming' && group.status !== 'connected';
  }

  function updateGroupInformation(group) {
    var titleElt = document.getElementById('call-info-title');
    var titleEltBdi = titleElt.querySelector('bdi');

    if (group.contact) {
      titleEltBdi.textContent = group.contact.primaryInfo;
    } else if (group.voicemail) {
      titleEltBdi.setAttribute('data-l10n-id', 'voiceMail');
    } else if (group.emergency) {
      titleEltBdi.setAttribute('data-l10n-id', 'emergencyNumber');
    } else {
      titleEltBdi.textContent = group.number;
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

      var durationElt = document.createElement('p');
      durationElt.classList.add('cd__duration');
      navigator.mozL10n.once(function() {
        if (call.duration === 0) {
          if (group.type === 'incoming') {
            durationElt.setAttribute('data-l10n-id', 'info-missed');
          } else {
            durationElt.setAttribute('data-l10n-id', 'canceled');
          }
        } else {
          Utils.prettyDuration(durationElt, call.duration,
                               'callDurationTextFormat');
        }
      });

      var row = document.createElement('div');
      row.classList.add('call-duration');
      row.appendChild(startTime);
      row.appendChild(durationElt);

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
    var contactTels = contact.tel.map(function(tel) {
      return tel.value;
    });

    if (!contactTels.some((tel) => tel != null)) {
      return;
    }

    LazyLoader.load(['/shared/js/simple_phone_matcher.js'], function() {
      ContactsButtons.renderPhones(contact);

      // Highlight the contact number that the call info page was opened for,
      // with a color depending on whether the call was missed or not.
      var remark = isMissedCall(group) ? 'remark-missed' : 'remark';

      var groupTel = SimplePhoneMatcher.sanitizedNumber(
        group.number || group.contact.matchingTel.number);
      var groupTelVariants = SimplePhoneMatcher.generateVariants(groupTel);

      // SimplePhoneMatch expects a series of contacts, so we pass it an array
      // containing only the relevant contact.
      contactTels = [contactTels];

      var matchingTels = SimplePhoneMatcher.bestMatch(groupTelVariants,
                                                      contactTels);
      var matchingTel = {value: ''};
      if (matchingTels.totalMatchNum) {
        matchingTel = contact.tel[matchingTels.allMatches[0][0]];
      }
      ContactsButtons.reMark('tel', matchingTel.value, remark);
    });
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
    if (evt.detail.type !== 'back') {
      return;
    }

    window.removeEventListener('CallLogDbNewCall', updateViewIfNeeded);
    callInfoView.hidden = true;
    CallLog.showEditModeButton();
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

        window.addEventListener('CallLogDbNewCall', updateViewIfNeeded);
      });
    }
  };
  exports.CallInfo = CallInfo;
})(window);
