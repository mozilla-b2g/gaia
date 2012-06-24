/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// see http://stackoverflow.com/a/4673436
String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};


// Based on Resig's pretty date
var localeStr = navigator.mozL10n.get;
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
  var day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff))
    return '(incorrect date)';

  if (day_diff < 0 || diff < 0) {
    // future time
    return (new Date(time)).toLocaleFormat('%x %R');
  }

  return day_diff == 0 && (
    diff < 60 && localeStr('justNow') ||
    diff < 120 && localeStr('aMinuteAgo') ||
    diff < 3600 && localeStr('minutesAgo').format(Math.floor(diff / 60)) ||
    diff < 7200 && localeStr('anHourAgo') ||
    diff < 86400 && localeStr('hoursAgo').format(Math.floor(diff / 3600)) ||
    day_diff == 1 && localeStr('yesterday') ||
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

  document.addEventListener('mozvisibilitychange', function visibility(e) {
    clearTimeout(timer);
    if (!document.mozHidden) {
      updatePrettyDate();
      timer = setInterval(updatePrettyDate, 60 * 1000);
    }
  });
})();

/* ***********************************************************

  Code below are for desktop testing!

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

  if (escapeQuotes)
    return span.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return span.innerHTML;
}

if (!navigator.mozSettings) {
  window.addEventListener('load', function loadWithoutSettings() {
    selectedLocale = 'en-US';
    ConversationView.init();
    ConversationListView.init();
  });
}
