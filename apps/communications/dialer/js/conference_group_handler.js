'use strict';

var ConferenceGroupHandler = (function() {
  var groupLine = document.getElementById('group-call');
  var groupLabel = document.getElementById('group-call-label');
  var groupDetails = document.getElementById('group-call-details');
  var groupDetailsHeader = groupDetails.querySelector('header');
  var groupDuration = document.querySelector('#group-call > .duration');
  var mergeButton = groupLine.querySelector('.merge-button');
  mergeButton.onclick = function(evt) {
    if (evt) {
      evt.stopPropagation();
    }
    CallsHandler.mergeConferenceGroupWithActiveCall();
  };

  var telephony = window.navigator.mozTelephony;
  telephony.conferenceGroup.oncallschanged = onCallsChanged;
  telephony.conferenceGroup.onstatechange = onStateChange;

  function onCallsChanged() {
    var calls = telephony.conferenceGroup.calls;
    groupLine.hidden = !calls.length;
    if (!calls.length) {
      CallScreen.hideGroupDetails();
    }

    LazyL10n.get(function localized(_) {
      groupDetailsHeader.textContent = groupLabel.textContent =
        _('group-call', {n: calls.length});
    });

    // When hanging up phones on conferenceGroup.calls.length >= 2,
    // we need to update handledCalls here since conferenceGroup.oncallschanged
    // rather than telephony.oncallschanges raises.
    // In case of conferenceGroup.calls.length < 2, check should be performed
    // in onStateChange to ignore transitional oncallschanged events before
    // exiting.
    if (telephony.conferenceGroup.calls.length >= 2) {
      CallsHandler.checkCalls();
    }
  }

  function onStateChange() {
    switch (telephony.conferenceGroup.state) {
      case 'resuming':
      case 'connected':
        CallScreen.createTicker(groupDuration);
        CallScreen.setDefaultContactImage({force: true});
        groupLine.classList.remove('held');
        break;
      case 'held':
        groupLine.classList.add('held');
        break;
      case '':
        // Exiting conference call
        CallScreen.stopTicker(groupDuration);
        CallsHandler.checkCalls();
        break;
    }
  }
})();
