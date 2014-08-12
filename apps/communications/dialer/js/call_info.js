'use strict';

/* global CallLogDBManager, LazyLoader, MozActivity, Utils */

(function(exports) {
  var currentGroup;
  var detailsButton;
  var addToContactButton;
  var createContactButton;
  var callInfoView;

  function updateView(group) {
    currentGroup = group;
    updateGroupInformation(group);
    updateCallDurations(group);
    updateActionButtons(group);
    callInfoView.hidden = false;
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
    switch (group.type) {
      case 'dialing':
      case 'alerting':
        classList.add('icon-outgoing');
        break;
      case 'incoming':
        if (group.status === 'connected') {
          classList.add('icon-incoming');
        } else {
          classList.add('icon-missed');
        }
        break;
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
            duration.setAttribute('data-l10n-id', 'missed');
          } else {
            duration.setAttribute('data-l10n-id', 'cancelled');
          }
        } else {
          duration.textContent = Utils.prettyDuration(call.duration);
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

  function updateActionButtons(group) {
    detailsButton.hidden = true;
    addToContactButton.hidden = true;
    createContactButton.hidden = true;

    if (group.contact) {
      detailsButton.hidden = false;
    } else {
      addToContactButton.hidden = false;
      createContactButton.hidden = false;
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
      var isMissedCall = currentGroup.type == 'incoming' &&
                         currentGroup.status !== 'connected';
      src += '&isMissedCall=' + isMissedCall;
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
    var options = {
      name: name,
      data: {
        type: 'webcontacts/contact',
        params: {
          'tel': phoneNumber
        }
      }
    };
    try {
      /* jshint nonew: false */
      new MozActivity(options);
    } catch (e) {
      console.error('Error while creating activity');
    }
  }

  var _initialised = false;
  function initListeners() {
    if (_initialised) {
      return;
    }
    _initialised = true;

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

  var CallInfo = {
    show: function(number, date, type, status) {
      callInfoView = document.getElementById('call-info-view');
      LazyLoader.load(callInfoView, function() {
        initListeners();
        date = parseInt(date, 10);
        CallLogDBManager.getGroup(number, date, type, status)
          .then(updateView);
      });
    }
  };
  exports.CallInfo = CallInfo;
})(window);
