'use strict';

/* global CallLogDBManager, Utils */

(function(exports) {
  function updateTitle(group) {
    var title = document.getElementById('call-info-title');
    /* XXX Problem with voicemail, emergency */
    /* XXX We shouldn't display the menu for withheld calls */
    if (group.contact) {
      title.textContent = group.contact.primaryInfo;
    } else {
      title.textContent = group.number;
    }
  }

  function updateCallDurations(group) {
    document.getElementById('call-info-day').textContent =
      Utils.headerDate(parseInt(group.date));
    var iconStyle = '';
    // XXX DRY this
    switch (group.type) {
      case 'dialing':
      case 'alerting':
        iconStyle += 'icon-outgoing';
        break;
      case 'incoming':
        if (group.status === 'connected') {
          iconStyle += 'icon-incoming';
        } else {
          iconStyle += 'icon-missed';
        }
        break;
    }

    document.getElementById('call-info-direction').textContent = iconStyle;

    // group.calls.forEach
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
      initListeners();
      date = parseInt(date, 10);
      CallLogDBManager.getGroup(number, date, type, status)
      .then(function(group) {
        updateTitle(group);
        updateCallDurations(group);
        document.getElementById('call-info-view').hidden = false;
      }).catch(function() {
        console.log('OOPS');
      });
    }
  };
  exports.CallInfo = CallInfo;
})(window);
