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
})();

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

if (!navigator.mozSms) {
  // We made up a fake database on
  var messagesHack = [];
  (function() {
    var messages = [
      {
        sender: null,
        receiver: '1-977-743-6797',
        body: 'Nothing :)',
        delivery: 'sent',
        timestamp: new Date(Date.now() - 44000000)
      },
      {
        sender: '1-977-743-6797',
        body: 'Hey! What\s up?',
        delivery: 'received',
        timestamp: new Date(Date.now() - 50000000)
      }
    ];

    for (var i = 0; i < 40; i++) {
      messages.push({
        sender: '1-488-678-3487',
        body: 'Hello world!',
        delivery: 'received',
        timestamp: new Date(Date.now() - 60000000)
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
      delivery: 'sent',
      body: text,
      timestamp: new Date()
    };

    window.setTimeout(function sent() {
      // simulate failure
      //callback(null);
      //return;

      // simulate success
      callback(message);

      // the SMS DB is written after the callback
      setTimeout(function writeDB() {
        messagesHack.unshift(message);
      }, 90 * Math.random());
    }, 3000 * Math.random());
  };

  if (!navigator.mozSettings) {
    window.addEventListener('load', function loadWithoutSettings() {
      selectedLocale = 'en-US';
      ConversationView.init();
      ConversationListView.init();
    });
  }
}

