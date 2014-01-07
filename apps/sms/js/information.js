/*global Utils, Template, Threads, ThreadUI, MessageManager, ContactRenderer,
         Contacts*/
/*exported Information */

(function(exports) {
'use strict';

/*
  Information view module is a subpanel belongs to TheadUI panel. This
  module provide some default  method for thiw view module:

  show: Reuse the ThreadUI page for information view. Hiding unrelated icon,
    reset the header, and render container for  showing the view.

  reset: Hide the view container, clean up the contact list and resume the
    icons/header for ThreadUI.

  renderContactList(participants, options): Rendering group-view style contact
    list inside the page. Participants is an array of contact number and option
    is for setting additional information for rendering other lock for contact
     information.
*/
var TMPL = function createTemplate(tmpls) {
  for (var key in tmpls) {
    tmpls[key] = Template(tmpls[key]);
  }
  return tmpls;
}({
  number: 'messages-number-tmpl',
  report: 'information-report-tmpl'
});

function completeLocaleFormat(timestamp) {
  return Utils.date.format.localeFormat(new Date(+timestamp),
    navigator.mozL10n.get('report-dateTimeFormat')
  );
}

// Generate report Div contains delivery report and read report for showing
// report information within contact list
function createReportDiv(reports) {
  var reportDiv = document.createElement('div');
  var data = {
    delivery: '',
    deliveryL10n: '',
    deliveryDateL10n: '',
    deliveryTimestamp: '',
    read: 'hide', // TODO: Check read status when gecko ready
    readL10n: 'message-read', // TODO: Check read status when gecko ready
    readDateL10n: '', // TODO: Check read status when gecko ready
    messageL10nDateFormat: 'report-dateTimeFormat'
  };

  switch (reports.deliveryStatus) {
    case 'pending':
      data.deliveryL10n = 'message-requested';
      break;
    case 'success':
      data.deliveryTimestamp = '' + reports.deliveryTimestamp;
      data.deliveryDateL10n = completeLocaleFormat(reports.deliveryTimestamp);
      break;
    case 'error':
      data.deliveryL10n = 'message-status-error';
      break;
    case 'not-applicable':
      data.delivery = 'hide';
  }
  reportDiv.innerHTML = TMPL.report.interpolate(data);
  return reportDiv;
}

// Compute attachment size and return the corresponding l10nId(KB/MB) and
// args (total attachment size for message)
function sizeL10nParam(attachments) {
  var l10nId, l10nArgs;
  var size = attachments.reduce(function(size, attachment) {
    return (size += attachment.content.size);
  }, 0);
  var sizeKB = size / 1024;
  if (sizeKB < 1000) {
    l10nId = 'attachmentSize';
    l10nArgs = { n: sizeKB.toFixed(1) };
  } else {
    l10nId = 'attachmentSizeMB';
    l10nArgs = { n: (sizeKB / 1024).toFixed(1) };
  }
  return {
    l10nId: l10nId,
    l10nArgs: l10nArgs
  };
}

// Incoming message: return array of sender number string;
// Outgoing message: return array of object(number and report div block).
function createListWithMsgInfo(message) {
  var list = [];
  if (message.delivery === 'received' ||
      message.delivery === 'not-downloaded') { // received message
    list.push(message.sender);
  } else if (message.type === 'mms') { // sent mms message
    message.deliveryInfo.forEach(function(info) {
      list.push({number: info.receiver,
                 infoBlock: createReportDiv(info)});
    });
  } else {  // sent sms message
    var info = {};
    info.deliveryStatus = message.deliveryStatus;
    info.deliveryTimestamp = message.deliveryTimestamp;
    list.push({number: message.receiver,
               infoBlock: createReportDiv(info)});
  }
  return list;
}

var VIEWS = {
  group: {
    name: 'participants',
    render: function renderGroup() {
      var lastId = Threads.lastId;
      var participants = lastId && Threads.get(lastId).participants;
      this.renderContactList(participants);
      navigator.mozL10n.localize(ThreadUI.headerText, 'participant', {
        n: participants.length
      });
    },
    elements: ['contact-list']
  },
  report: {
    name: 'report',
    render: function renderReport() {
      var localize = navigator.mozL10n.localize;
      var messageId = +window.location.hash.split('=')[1];
      var request = MessageManager.getMessage(messageId);

      request.onsuccess = (function() {
        var message = request.result;
        var type = message.type;

        this.subject.textContent = '';
        this.datetime.dataset.l10nDate = message.timestamp;
        this.datetime.dataset.l10nDateFormat = 'report-dateTimeFormat';
        this.datetime.textContent = completeLocaleFormat(message.timestamp);

        // Fill in the description/status/size
        if (type === 'sms') {
          localize(this.type, 'message-type-sms');
          this.sizeBlock.classList.add('hide');
        } else { //mms
          localize(this.type, 'message-type-mms');
          // subject text content
          var subject = message.subject;
          if (subject) {
            this.subject.textContent = subject;
          }

          // Message total size show/hide
          if (message.attachments && message.attachments.length > 0) {
            var params = sizeL10nParam(message.attachments);
            localize(this.size, params.l10nId, params.l10nArgs);
            this.sizeBlock.classList.remove('hide');
          } else {
            this.sizeBlock.classList.add('hide');
          }
        }
        this.status.dataset.type = message.delivery;
        localize(this.status, 'message-status-' + message.delivery);

        // Filled in the contact list. Only outgoing message contains detailed
        // report information.
        if (message.delivery === 'received' ||
            message.delivery === 'not-downloaded') {
          localize(this.contactTitle, 'report-from');
        } else {
          localize(this.contactTitle, 'report-recipients');
        }
        this.renderContactList(createListWithMsgInfo(message));
      }).bind(this);

      localize(ThreadUI.headerText, 'message-report');
    },
    elements: ['contact-list', 'description', 'status', 'size', 'size-block',
      'type', 'subject', 'datetime', 'contact-title']
  }
};

var Information = function(type) {
  var view = VIEWS[type];
  var prefix = 'information-' + view.name;
  this.container = document.getElementById(prefix);
  this.render = view.render;
  this.parent = document.getElementById('thread-messages');
  view.elements.forEach(function(name) {
    this[Utils.camelCase(name)] = this.container.querySelector('.' + name);
  }, this);

  this.reset();

  if (this.contactList) {
    this.contactList.addEventListener(
      'click', function onListClick(event) {
      event.stopPropagation();
      event.preventDefault();

      var target = event.target;

      ThreadUI.promptContact({
        number: target.dataset.number
      });}
    );
  }
};

Information.prototype = {
  constructor: Information,

  show: function() {
    // Hide the Messages edit icon, view container and composer form
    this.parent.classList.add('information');

    this.render();
    // Append and Show the participants list
    this.container.classList.remove('hide');
  },

  reset: function() {
    // Hide the information view
    this.container.classList.add('hide');
    // Remove all LIs
    if (this.contactList) {
      this.contactList.textContent = '';
    }
    // Restore message list view UI elements
    this.parent.classList.remove('information');
  },

  // Param participants could be:
  //   - Array of contact number string or
  //   - Array of object({ number: number, infoBlock: infoBlock })
  // for rendering the contact list.
  renderContactList: function(participants) {
    var ul = this.contactList;
    var renderer = ContactRenderer.flavor('group-view');

    participants.forEach(function(participant) {
      var number, infoBlock, selector;

      if (typeof participant === 'object') {
        number = participant.number;
        infoBlock = participant.infoBlock;
        selector = '.suggestion';
      } else {
        number = participant;
      }
      Contacts.findByPhoneNumber(number, function(results) {
        var isContact = results !== null && !!results.length;

        if (isContact) {
          renderer.render({
            contact: results[0],
            input: number,
            infoBlock: infoBlock,
            infoBlockParentSelector: selector,
            target: ul
          });
        } else {
          var li = document.createElement('li');
          li.innerHTML = TMPL.number.interpolate({
            number: number
          });

          var parentBlock = li.querySelector(selector);
          if (parentBlock && infoBlock) {
            parentBlock.appendChild(infoBlock);
            navigator.mozL10n.translate(li);
          }
          ul.appendChild(li);
        }
      });
    }.bind(this));
  }
};

Information.initDefaultViews = function() {
  // Create group / report information view
  exports.GroupView = new Information('group');
  exports.ReportView = new Information('report');
};

exports.Information = Information;

// end global closure
}(this));

