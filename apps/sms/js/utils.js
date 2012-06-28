/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Based on Resig's pretty date
var _ = navigator.mozL10n.get;
function prettyDate(time) {

  switch (time.constructor) {
    case String:
      time = parseInt(time);
      break;
    case Date:
      time = time.getTime();
      break;
  }

  var diff = (Date.now() - time) / 1000;
  var dayDiff = Math.floor(diff / 86400);

  if (isNaN(dayDiff))
    return '(incorrect date)';

  if (dayDiff < 0 || diff < 0) {
    // future time
    return (new Date(time)).toLocaleFormat('%x %R');
  }

  return dayDiff == 0 && ( // today?
      diff < 60 && _('justNow') ||
      diff < 3600 && _('minutesAgo', { minutes: Math.floor(diff / 60) }) ||
      diff < 86400 && _('hoursAgo', { hours: Math.floor(diff / 3600) })
  ) ||
      dayDiff == 1 && _('yesterday') || // yesterday?
      dayDiff < 7 && (new Date(time)).toLocaleFormat('%A') || // <1 week ago?
      (new Date(time)).toLocaleFormat('%x'); // default: standard date format
}

function giveHourMinute(time) {
  switch (time.constructor) {
    case String:
      time = parseInt(time);
      break;
    case Date:
      time = time.getTime();
      break;
  }

  return (new Date(time)).toLocaleFormat('%R %p');
}

function giveHeaderDate(time) {
  switch (time.constructor) {
    case String:
      time = new Number(time);
      break;
    case Date:
      time = time.getTime();
      break;
  }

  var today = Math.floor((new Date()).getTime() / 86400000);
  var otherDay = Math.floor(time / 86400000);
  var dayDiff = today - otherDay;

  if (isNaN(dayDiff))
    return '(incorrect date)';

  if (dayDiff < 0) {
    // future time
    return (new Date(time)).toLocaleFormat('%x %R');
  }

  return dayDiff == 0 && _('today') ||
    dayDiff == 1 && _('yesterday') ||
    dayDiff < 4 && (new Date(time)).toLocaleFormat('%A') ||
    (new Date(time)).toLocaleFormat('%x');
}

(function() {
  var updateHeadersDate = function updateHeadersDate() {
    var labels = document.querySelectorAll('div.groupHeader');
    var i = labels.length;
    while (i--) {
      labels[i].textContent = giveHeaderDate(labels[i].dataset.time);
    }
  };
  var timer = setInterval(updateHeadersDate, 60 * 1000);

  document.addEventListener('mozvisibilitychange', function visibility(e) {
    clearTimeout(timer);
    if (!document.mozHidden) {
      updateHeadersDate();
      timer = setInterval(updateHeadersDate, 60 * 1000);
    }
  });
})();

/* ***********************************************************

  Code below is for desktop testing!

*********************************************************** */

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
        id: 41,
        timestamp: new Date(Date.now() - 44000000)
      },
      {
        sender: '1-977-743-6797',
        body: 'Hey! What\s up?',
        delivery: 'received',
        id: 40,
        timestamp: new Date(Date.now() - 50000000)
      }
    ];

    for (var i = 0; i < 40; i++) {
      messages.push({
        sender: '1-488-678-3487',
        body: 'Hello world!',
        delivery: 'received',
        id: 39 - i,
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
      id: messagesHack.length,
      timestamp: new Date()
    };

    var simulateFail = /fail/i.test(text);

    window.setTimeout(function sent() {
      if (simulateFail) {
        // simulate failure
        callback(null);
        return;
      }

      // simulate success
      callback(message);

      // the SMS DB is written after the callback
      window.setTimeout(function writeDB() {
        messagesHack.unshift(message);
      }, 90 * Math.random());
    }, 3000 * Math.random());

    if (simulateFail)
      return;

    window.setTimeout(function hiBack() {
      var message = {
        sender: number,
        receiver: null,
        delivery: 'received',
        body: 'Hi back! ' + text,
        id: messagesHack.length,
        timestamp: new Date()
      };

      var evt = {
        type: 'received',
        message: message
      };

      ConversationView.handleEvent.call(ConversationView, evt);
      ConversationListView.handleEvent.call(ConversationView, evt);

      // the SMS DB is written after the callback
      window.setTimeout(function writeDB() {
        messagesHack.unshift(message);
      }, 90 * Math.random());

    }, 5000 + 3000 * Math.random());
  };
}

function escapeHTML(str, escapeQuotes) {
  var span = document.createElement('span');
  span.textContent = str;

  // Escape space for displaying multiple space in message.
  span.innerHTML = span.innerHTML.replace(/\s/g, '&nbsp;');

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
}

if (!navigator.mozSettings) {
  window.addEventListener('load', function loadWithoutSettings() {
    ConversationView.init();
    ConversationListView.init();
  });
}
