'use strict';

/* global CallLogDBManager, LazyL10n, LazyLoader, Utils */

(function(exports) {
  function updateGroupInformation(group) {
    var title = document.getElementById('call-info-title');
    if (group.contact) {
      title.textContent = group.contact.primaryInfo;
    } else if (group.voicemail) {
      title.setAttribute('data-l10n-id', 'voiceMail');
    } else if (group.emergency) {
      title.setAttribute('data-l10n-id', 'emergencyNumber');
    } else {
      title.textContent = group.number;
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
    var callDurations = document.getElementById('call-durations');
    callDurations.innerHTML = '';
    group.calls.forEach(function(call) {
      var time = document.createElement('p');
      time.classList.add('cd__time');
      // XXX Make sure we deal with 12/24
      time.textContent = Utils.prettyDate(call.date);

      var duration = document.createElement('p');
      duration.classList.add('cd__duration');
      LazyL10n.get(function(_) {
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
      row.appendChild(time);
      row.appendChild(duration);

      callDurations.appendChild(row);
    });
  }

  function close() {
    document.getElementById('call-info-view').hidden = true;
  }

  var _initialised = false;
  function initListeners() {
    if (_initialised) {
      return;
    }
    _initialised = true;
    document.getElementById('call-info-close').addEventListener('click', close);
  }

  var CallInfo = {
    show: function(number, date, type, status) {
      LazyLoader.load(document.getElementById('call-info-view'), function() {
        initListeners();
        date = parseInt(date, 10);
        CallLogDBManager.getGroup(number, date, type, status)
        .then(function(group) {
          updateGroupInformation(group);
          updateCallDurations(group);
          document.getElementById('call-info-view').hidden = false;
        }).catch(function(error) {
          console.log('OOPS', error);
        });
      });
    }
  };
  exports.CallInfo = CallInfo;
})(window);
