/*global Utils, Template, Threads, ThreadUI, MessageManager, ContactRenderer,
         Contacts, Settings, Navigation */
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

/*
 Summarized single status based on delivery and read status for mms.
 The 1st level properties represents delivery status and 2nd level properties
 represents read status.
 */
var REPORT_MAP = {
  'not-applicable': {
    'not-applicable': 'not-applicable',
    'pending' : 'pending',
    'success' : 'read'
  },
  'pending' : {
    'not-applicable': 'pending',
    'pending': 'pending',
    'success' : 'read'   // should not possible
  },
  'success' : {
    'not-applicable': 'delivered',
    'pending': 'delivered',
    'success' : 'read'
  }
};

// Register the message events we wanted for report view refresh
var MESSAGE_EVENTS = [
  'message-failed-to-send',
  'message-delivered',
  'message-read',
  'message-sent'
];

function completeLocaleFormat(timestamp) {
  return Utils.date.format.localeFormat(
    new Date(+timestamp),
    navigator.mozL10n.get(
      navigator.mozHour12 ? 'report-dateTimeFormat12' :
        'report-dateTimeFormat24'
    )
  );
}

function l10nContainsDateSetup(element, timestamp) {
  element.dataset.l10nDate = timestamp;
  element.dataset.l10nDateFormat12 = 'report-dateTimeFormat12';
  element.dataset.l10nDateFormat24 = 'report-dateTimeFormat24';
  element.textContent = completeLocaleFormat(timestamp);
}

// Generate report Div contains delivery report and read report for showing
// report information within contact list
function createReportDiv(reports) {
  var reportDiv = document.createElement('div');
  var data = {
    titleL10n: '',
    reportDateL10n: '',
    timestamp: '',
    messageL10nDateFormat12: 'report-dateTimeFormat12',
    messageL10nDateFormat24: 'report-dateTimeFormat24'
  };
  var status;

  if (!reports.readStatus) {  // sms
    status = reports.deliveryStatus === 'success' ?
      'delivered' : reports.deliveryStatus;
  } else {
    try {
      status = reports.deliveryStatus === 'error' ? 'error' :
        REPORT_MAP[reports.deliveryStatus][reports.readStatus];
    } catch(e) {
      console.error('Invalid message report status: ' + e);
      return reportDiv;
    }
  }

  data.titleL10n = 'message-status-' + status;
  reportDiv.dataset.deliveryStatus = status;

  if (status === 'delivered') {
    data.timestamp = '' + reports.deliveryTimestamp;
    data.reportDateL10n = completeLocaleFormat(reports.deliveryTimestamp);
  } else if (status === 'read') {
    data.timestamp = '' + reports.readTimestamp;
    data.reportDateL10n = completeLocaleFormat(reports.readTimestamp);
  }

  reportDiv.innerHTML = TMPL.report.interpolate(data);
  return reportDiv;
}

function showSimInfo(element, iccId) {
  var iccManager = navigator.mozIccManager;
  // Hide the element when single SIM or no iccManager/mobileConnections
  if (!(Settings.hasSeveralSim() && iccId && iccManager)) {
    return;
  }

  var info = [];
  var simId = Settings.getServiceIdByIccId(iccId);
  var operator = Settings.getOperatorByIccId(iccId);
  var number = iccManager.getIccById(iccId).iccInfo.msisdn;
  var data = {};
  var l10nId;

  info = [operator, number].filter(function(value) {
    return value;
  });

  var detailString = info.join(', ');

  if (simId !== null) {
    l10nId = info.length ?  'sim-detail' : 'sim-id-label';
    data = { id: simId + 1, detailString: detailString };
    navigator.mozL10n.setAttributes(
      element.querySelector('.sim-detail'),
      l10nId,
      data
    );
  } else {
    element.querySelector('.sim-detail').textContent = detailString;
  }

  element.classList.remove('hide');
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
      var participants = Threads.get(this.id).participants;
      this.renderContactList(participants);
      navigator.mozL10n.setAttributes(ThreadUI.headerText, 'participant', {
        n: participants.length
      });
      ThreadUI.setHeaderAction('back');
    },

    setEventListener: function setEventListener() {
      this.contactList.addEventListener('click', function onListClick(event) {
        event.stopPropagation();
        event.preventDefault();

        var target = event.target;

        ThreadUI.promptContact({
          number: target.dataset.number
        });
      });
    },

    elements: ['contact-list']
  },
  report: {
    name: 'report',

    init: function() {
      this.onStatusChanged = this.onStatusChanged.bind(this);
      this.onMessageSending = this.onMessageSending.bind(this);
    },

    beforeEnter: function() {
      MESSAGE_EVENTS.forEach(function(event) {
        MessageManager.on(event, this.onStatusChanged);
      }.bind(this));
    },

    afterLeave: function() {
      MESSAGE_EVENTS.forEach(function(event) {
        MessageManager.off(event, this.onStatusChanged);
      }.bind(this));
    },

    render: function renderReport() {
      var setL10nAttributes = navigator.mozL10n.setAttributes;
      var request = MessageManager.getMessage(this.id);

      request.onsuccess = (function() {
        var message = request.result;
        var type = message.type;

        var isIncoming = message.delivery === 'received' ||
            message.delivery === 'not-downloaded';

        // Fill in the description/status/size
        if (type === 'sms') {
          setL10nAttributes(this.type, 'message-type-sms');
          this.subject.classList.add('hide');
          this.sizeBlock.classList.add('hide');
        } else { //mms
          setL10nAttributes(this.type, 'message-type-mms');
          // subject text content
          var subject = message.subject;

          this.subject.classList.toggle('hide', !subject);
          if (subject) {
            this.subject.querySelector('.detail').textContent = subject;
          }

          // Message total size show/hide
          if (message.attachments && message.attachments.length > 0) {
            var params = sizeL10nParam(message.attachments);
            setL10nAttributes(this.size, params.l10nId, params.l10nArgs);
            this.sizeBlock.classList.remove('hide');
          } else {
            this.sizeBlock.classList.add('hide');
          }
        }
        this.container.dataset.delivery = message.delivery;

        // If incoming message is migrated from the database where sentTimestamp
        // hadn't been supported yet then we won't have valid value for it.
        this.container.classList.toggle(
          'no-valid-sent-timestamp',
          isIncoming && !message.sentTimestamp
        );

        setL10nAttributes(
          this.contactTitle,
          isIncoming ? 'report-from-title' : 'report-to-title'
        );

        if (isIncoming) {
          l10nContainsDateSetup(this.receivedTimeStamp, message.timestamp);
          l10nContainsDateSetup(this.sentTimeStamp, message.sentTimestamp);
          setL10nAttributes(this.sentTitle, 'message-sent');
        } else {
          l10nContainsDateSetup(this.sentTimeStamp, message.timestamp);
          setL10nAttributes(this.sentTitle, 'message-' + message.delivery);
        }

        //show sim information for dual sim device
        showSimInfo(this.simInfo, message.iccId);

        // Filled in the contact list. Only outgoing message contains detailed
        // report information.
        this.renderContactList(createListWithMsgInfo(message));
      }).bind(this);

      setL10nAttributes(ThreadUI.headerText, 'message-report');
      ThreadUI.setHeaderAction('close');
    },

    setEventListener: function report_setEventListener() {
      this.resendBtn.addEventListener('click', function() {
        MessageManager.on('message-sending', this.onMessageSending);
        ThreadUI.resendMessage(this.id);
      }.bind(this));
    },

    onStatusChanged: function report_onStatusChanged(e) {
      if (Navigation.isCurrentPanel('report-view', { id: e.message.id }) ||
          (Navigation.isCurrentPanel('report-view') &&
           this.id === e.message.id)) {
        this.refresh();
      }
    },

    onMessageSending: function report_onMessageSending(e) {
      MessageManager.off('message-sending', this.onMessageSending);
      this.id = e.message.id;
      this.refresh();
    },

    elements: ['contact-list', 'size', 'size-block', 'type', 'sent-title',
      'sent-timeStamp', 'received-timeStamp', 'subject', 'sim-info',
      'contact-title', 'resend-btn'
    ]
  }
};

var Information = function(type) {
  Utils.extend(this, VIEWS[type]);

  if (this.init) {
    this.init();
  }

  var prefix = 'information-' + this.name;
  this.container = document.getElementById(prefix);
  this.parent = document.getElementById('thread-messages');
  this.elements.forEach(function(name) {
    this[Utils.camelCase(name)] = this.container.querySelector('.' + name);
  }, this);

  this.setEventListener && this.setEventListener();
  this.reset();
};

Information.prototype = {
  constructor: Information,

  afterEnter: function(args) {
    this.id = args.id;
    this.show();
  },

  beforeLeave: function() {
    this.reset();
    this.id = null;
  },

  show: function() {
    // Hide the Messages edit icon, view container and composer form
    this.parent.classList.add(this.name + '-information');

    this.render();
    // Append and Show the participants list
    this.container.classList.remove('hide');
  },

  refresh: function() {
    if (this.parent.classList.contains(this.name + '-information')) {
      this.render();
    }
  },

  reset: function() {
    // Hide the information view
    this.container.classList.add('hide');
    // Remove all LIs
    if (this.contactList) {
      this.contactList.textContent = '';
    }
    // Restore message list view UI elements
    this.parent.classList.remove(this.name + '-information');
  },

  // Param participants could be:
  //   - Array of contact number string or
  //   - Array of object({ number: number, infoBlock: infoBlock })
  // for rendering the contact list.
  renderContactList: function(participants) {
    var ul = this.contactList;
    var renderer = ContactRenderer.flavor('group-view');

    ul.textContent = '';
    participants.forEach(function(participant) {
      var number, infoBlock, selector;

      if (typeof participant === 'object') {
        number = participant.number;
        infoBlock = participant.infoBlock;
        selector = '.suggestion';
      } else {
        number = participant;
      }
      Contacts.findByAddress(number, function(results) {
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

