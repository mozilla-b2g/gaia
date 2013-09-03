'use strict';

var ConferenceGroupHandler = (function() {
  var groupLine = document.getElementById('group-call');
  var groupLabel = document.getElementById('group-call-label');

  var telephony = window.navigator.mozTelephony;
  telephony.conferenceGroup.oncallschanged = onCallsChanged;
  telephony.conferenceGroup.onstatechange = onStateChange;

  function onCallsChanged() {
    var calls = telephony.conferenceGroup.calls;
    groupLine.hidden = !calls.length;

    LazyL10n.get(function localized(_) {
      groupLabel.textContent = _('group-call',
                                 {n: calls.length});
    });
  }

  function onStateChange() {
    switch (telephony.conferenceGroup.state) {
      case 'resuming':
        groupLine.classList.remove('held');
        break;
      case 'held':
        groupLine.classList.add('held');
        break;
    }
  }
})();
