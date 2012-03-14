/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Based on Resig's pretty date
function prettyDate(time) {
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff))
    return '(incorrect date)';

  if (day_diff < 0 || diff < 0) {
    // future time
    return (new Date(time)).toLocaleFormat('%x %R');
  }

  return day_diff == 0 && (
    diff < 60 && 'Just Now' ||
    diff < 120 && '1 Minute Ago' ||
    diff < 3600 && Math.floor(diff / 60) + ' Minutes Ago' ||
    diff < 7200 && '1 Hour Ago' ||
    diff < 86400 && Math.floor(diff / 3600) + ' Hours Ago') ||
    day_diff == 1 && 'Yesterday' ||
    day_diff < 7 && (new Date(time)).toLocaleFormat('%A') ||
    (new Date(time)).toLocaleFormat('%x');
}

(function() {
  var updatePrettyDate = function updatePrettyDate() {
    var labels = document.querySelectorAll('[data-time]');
    var i = labels.length;
    while (i--) {
      labels[i].textContent = prettyDate(labels[i].dataset.time);
    }
  };
  var timer = setInterval(updatePrettyDate, 60 * 1000);

  window.addEventListener('message', function visibleAppUpdatePrettyDate(evt) {
    var data = evt.data;
    if (data.message !== 'visibilitychange')
      return;
    clearTimeout(timer);
    if (!data.hidden) {
      updatePrettyDate();
      timer = setInterval(updatePrettyDate, 60 * 1000);
    }
  });
);

window.addEventListener('message', function visibleApp(evt) {
  var data = evt.data;
  if (data.message == 'visibilitychange' && !data.hidden) {
    visibilityChanged(data.url);
  }
});

function visibilityChanged(url) {
  var params = (function makeURL() {
    var a = document.createElement('a');
    a.href = url;

    var rv = {};
    var params = a.search.substring(1, a.search.length).split('&');
    for (var i = 0; i < params.length; i++) {
      var data = params[i].split('=');
      rv[data[0]] = data[1];
    }
    return rv;
  })();

  var sender = params['sender'];
  if (sender) {
    ConversationListView.openConversationView(sender);
  }
}

function profilePictureForId(id) {
  // pic #9 is used as the phone holder
  // id is the index # of the contact in Contacts array,
  // or parseInt(phone number) if not in the list
  return '../contacts/contact' + (id % 9) + '.png';
}

if (!navigator.mozSms) {
  // Until there is a database to store messages on the device, return
  // a fake list of messages.
  var messagesHack = [];
  (function() {
    var messages = [
      {
        sender: null,
        receiver: '1-977-743-6797',
        body: 'Nothing :)',
        timestamp: Date.now() - 44000000
      },
      {
        sender: '1-977-743-6797',
        body: 'Hey! What\s up?',
        timestamp: Date.now() - 50000000
      }
    ];

    for (var i = 0; i < 40; i++) {
      messages.push({
        sender: '1-488-678-3487',
        body: 'Hello world!',
        timestamp: Date.now() - 60000000
      });
    }

    messagesHack = messages;
  })();

  var GetMessagesHack = function gmhack(callback, filter, invert) {
    function applyFilter(msgs) {
      if (!filter)
        return msgs;

      if (filter.numbers) {
        msgs = msgs.filter(function(element, index, array) {
          var num = filter.numbers;
          return (num && (num.indexOf(element.sender) != -1 ||
                          num.indexOf(element.receiver) != -1));
        });
      }

      return msgs;
    }

    var msg = messagesHack.slice();
    if (invert)
      msg.reverse();
    callback(applyFilter(msg));
  };

  MessageManager.getMessages = function(callback, filter, invert) {
    GetMessagesHack(callback, filter, invert);
    return;
  };

  MessageManager.send = function(number, text, callback) {
    var message = {
      sender: null,
      receiver: number,
      body: text,
      timestamp: Date.now()
    };

    window.setTimeout(function() {
      callback(message);
    }, 0);
  };

  if (!navigator.mozSettings) {
    window.addEventListener('load', function loadWithoutSettings() {
      selectedLocale = 'en-US';
      ConversationView.init();
      ConversationListView.init();
    });
  }
}

