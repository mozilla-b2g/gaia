
// Based on Resig's pretty date
function prettyDate(time) {
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);
      
  if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
    return '';
      
  return day_diff == 0 && (
          diff < 60 && "just now" ||
          diff < 120 && "1 minute ago" ||
          diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
          diff < 7200 && "1 hour ago" ||
          diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
          day_diff == 1 && "Yesterday" ||
          day_diff < 7 && day_diff + " days ago" ||
          day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
};

var MessageManager = {
  getMessages: function mm_getMessages(callback, filter) {
    var request = navigator.mozSms.getMessages(filter ,true);

    var messages = [];
    request.onsuccess = function() {
      var result = request.result;
      if (!result) {
        callback(messages);
        return;
      }
              
      var message = result.message;
      messages.push(message);
      result.next();
    };

    request.onerror = function() {
      alert('Something wrong has happened while reading the database. Error code: ' + request.errorCode);
    }
  },

  send: function mm_send(number, text, callback) {
    var result = navigator.mozSms.send(number, text);
    result.onsuccess = callback;
    result.onerror = callback;
  }
};

if (!('mozSms' in navigator)) {
  MessageManager.messages = [];

  MessageManager.getMessages = function mm_getMessages(callback, filter) {
    function applyFilter(msgs) {
      if (!filter)
        return msgs;

      if (filter.number) {
        msgs = msgs.filter(function(element, index, array) {
            return (filter.number && (filter.number == element.sender ||
                    filter.number == element.receiver));
        });
      }

      return msgs;
    }

    if (this.messages.length) {
      callback(applyFilter(this.messages.slice()));
      return;
    }

    var messages = [
      {
        sender: null,
        receiver: 'Mounir',
        body: 'fine fine',
        timestamp: Date.now() - 44000000,
      },
      {
        sender: 'Mounir',
        body: 'that\'s cheap to ask!',
        timestamp: Date.now() - 45000000,
      },
      {
        sender: 'Mounir',
        body: 'Hey! how are you?',
        timestamp: Date.now() - 50000000,
      }
    ];

    for (var i = 0; i < 40; i++)
      messages.push({
        sender: 'Vivien',
        body: 'Hello world!',
        timestamp: Date.now() - 60000000,
      });

    this.messages = messages;
    callback(applyFilter(this.messages.slice()));
  }

  MessageManager.send = function mm_send(number, text, callback) {
    var message = {
      sender: null,
      receiver: number,
      body: text,
      timestamp: Date.now()
    } 
    var event = document.createEvent("CustomEvent");
    event.initCustomEvent("smssent", true, false, message);
    var windows = window.top.document.getElementById('windows');
    parentWindow = windows.lastChild.previousSibling.contentWindow;
    setTimeout(function(evt) {
      parentWindow.dispatchEvent(event);
      window.dispatchEvent(event);
      callback();
    }, 1000);
  }

  MessageManager.handleEvent = function handleEvent(evt) {
    this.messages.unshift(evt.detail);
  }

  window.addEventListener('smssent', MessageManager, true);
  window.addEventListener('smsreceived', MessageManager, true);
}

