/*global Utils, Template, Threads, ConversationView, MessageManager,
         ContactRenderer, Contacts, Settings, Navigation
 */

/*exported Information */

(function(exports) {
'use strict';

/*
  Information view module is a subpanel belongs to TheadUI panel. This
  module provide some default  method for thiw view module:

  show: Reuse the conversation view for information view. Hiding unrelated icon,
    reset the header, and render container for  showing the view.

  reset: Hide the view container, clean up the contact list and resume the
    icons/header for ConversationView.

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
const REPORT_MAP = {
  'not-applicable': {
    'not-applicable': 'not-applicable',
    'pending' : 'pending',
    'success' : 'read',
    'error' : 'error'
  },
  'pending' : {
    'not-applicable': 'pending',
    'pending': 'pending',
    'success' : 'read',   // should not possible
    'error' : 'error'
  },
  'success' : {
    'not-applicable': 'delivered',
    'pending': 'delivered',
    'success' : 'read',
    'error' : 'error'
  },
  'error' : {
    'not-applicable': 'error',
    'pending': 'error',
    'success' : 'error', // should not possible
    'error' : 'error'    // should not possible
  }
};

// Register the message events we wanted for report view refresh
const MESSAGE_EVENTS = [
  'message-failed-to-send',
  'message-delivered',
  'message-read',
  'message-sent',
  'message-sending'
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
  reportDiv.className = 'network-status';
  var data = {
    titleL10n: '',
    reportDateL10n: '',
    timestamp: '',
    messageL10nDateFormat12: 'report-dateTimeFormat12',
    messageL10nDateFormat24: 'report-dateTimeFormat24'
  };
  var status;
  var deliveryStatus = reports.deliveryStatus;
  var readStatus = reports.readStatus;

  if (!readStatus) {  // sms
    status = deliveryStatus === 'success' ?
      'delivered' :
      deliveryStatus;
  } else if (deliveryStatus === 'rejected') {
    // Status = 'rejected' when receiver is not allowed to download any mms
    status = 'rejected';
  } else if (deliveryStatus in REPORT_MAP) {
    status = REPORT_MAP[deliveryStatus][readStatus];
  } else {
    console.error('Invalid message report status: ' + deliveryStatus);
    return reportDiv;
  }
  reportDiv.dataset.deliveryStatus = status;

  switch (status) {
    case 'not-applicable':
      return reportDiv;
    case 'delivered':
      data.timestamp = '' + reports.deliveryTimestamp;
      data.reportDateL10n = completeLocaleFormat(reports.deliveryTimestamp);
      break;
    case 'read':
      data.timestamp = '' + reports.readTimestamp;
      data.reportDateL10n = completeLocaleFormat(reports.readTimestamp);
      break;
  }
  data.titleL10n = 'report-status-' + status;
  reportDiv.innerHTML = TMPL.report.interpolate(data);

  return reportDiv;
}

function showSimInfo(element, iccId) {
  var iccManager = navigator.mozIccManager;
  // Hide the element when single SIM or no iccManager/mobileConnections
  if (!(Settings.hasSeveralSim() && iccId && iccManager)) {
    return;
  }

  var simInfoElement = element.querySelector('.sim-detail');
  var simId = Settings.getServiceIdByIccId(iccId);

  if (simId === null) {
    navigator.mozL10n.setAttributes(
      simInfoElement,
      'dsds-unknown-sim'
    );
  } else {
    var operator = Settings.getOperatorByIccId(iccId);
    var icc = iccManager.getIccById(iccId);
    var number = icc && icc.iccInfo.msisdn;

    var data = {};
    var l10nId;

    var info = [operator, number].filter(function(value) {
      return value;
    });

    var detailString = info.join(', ');
    l10nId = info.length ?  'sim-detail' : 'sim-id-label';
    data = { id: simId + 1, detailString: detailString };
    navigator.mozL10n.setAttributes(
      simInfoElement,
      l10nId,
      data
    );
  }

  element.classList.remove('hide');
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
    name: 'group-view',
    contactFlavor: 'group-view',

    render: function renderGroup() {
      var participants = Threads.get(this.id).participants;
      this.renderContactList(participants);
      navigator.mozL10n.setAttributes(
        this.headerText, 'participant', { n:participants.length }
      );
    },

    setEventListener: function setEventListener() {
      this.contactList.addEventListener('click', function onListClick(event) {
        event.stopPropagation();
        event.preventDefault();

        var target = event.target;

        ConversationView.promptContact({
          number: target.dataset.number
        }).then(
          () => Navigation.toPanel('thread', { id: Threads.currentId })
        );
      });
    },

    elements: ['contact-list', 'header', 'header-text']
  },
  report: {
    name: 'report-view',
    contactFlavor: 'report-view',

    init: function() {
      this.onStatusChanged = this.onStatusChanged.bind(this);
    },

    beforeEnter: function() {
      this.constructor.prototype.beforeEnter.apply(this, arguments);

      MESSAGE_EVENTS.forEach((event) => {
        MessageManager.on(event, this.onStatusChanged);
      });
    },

    afterLeave: function() {
      this.constructor.prototype.afterLeave.apply(this, arguments);

      MESSAGE_EVENTS.forEach((event) => {
        MessageManager.off(event, this.onStatusChanged);
      });
    },

    render: function renderReport() {
      var setL10nAttributes = navigator.mozL10n.setAttributes;
      var request = MessageManager.getMessage(this.id);

      // Hide these dynamic fields to avoid incorrect info displayed at first
      this.subject.classList.add('hide');
      this.sizeBlock.classList.add('hide');

      request.onsuccess = (function() {
        var message = request.result;
        var type = message.type;
        var delivery = message.delivery;

        var isIncoming = delivery === 'received' ||
            delivery === 'not-downloaded';

        // Fill in the description/status/size
        if (type === 'sms') {
          setL10nAttributes(this.type, 'message-type-sms');
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
            var size = message.attachments.reduce(function(size, attachment) {
              return (size += attachment.content.size);
            }, 0);
            var params = Utils.getSizeForL10n(size);
            setL10nAttributes(this.size, params.l10nId, params.l10nArgs);
            this.sizeBlock.classList.remove('hide');
          }
        }
        this.container.dataset.delivery = delivery;

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
          l10nContainsDateSetup(this.receivedTimestamp, message.timestamp);
          l10nContainsDateSetup(this.sentTimestamp, message.sentTimestamp);
          setL10nAttributes(this.sentTitle, 'message-sent');
        } else {
          if (delivery === 'sending' || delivery === 'sent') {
            setL10nAttributes(this.sentTitle, 'message-' + delivery);
          }
          if (delivery === 'error' || delivery === 'sent') {
            l10nContainsDateSetup(this.sentTimestamp, message.timestamp);
          }
        }

        //show sim information for dual sim device
        showSimInfo(this.simInfo, message.iccId);

        // Filled in the contact list. Only outgoing message contains detailed
        // report information.
        this.renderContactList(createListWithMsgInfo(message));
      }).bind(this);
    },

    // Set this flag to true only when resend is triggered.
    messageResending: false,

    setEventListener: function report_setEventListener() {
      this.resendBtn.addEventListener('click', () => {
        this.messageResending = true;
        ConversationView.resendMessage(this.id);
      });
    },

    isReportForMessage: function report_isReportForMessage(id) {
      return Navigation.isCurrentPanel('report-view', { id: id }) ||
        (Navigation.isCurrentPanel('report-view') &&
         this.id === id);
    },

    onStatusChanged: function report_onStatusChanged(e) {
      // If we got sending status change in report view after resend clicked
      // (messageResending is true), we should change report panel id, reset
      // messageResending flag and refresh for new message report.
      if (e.message.delivery === 'sending' && this.messageResending) {
        this.id = e.message.id;
        this.messageResending = false;
      }

      this.isReportForMessage(e.message.id) && this.refresh();
    },

    elements: ['contact-list', 'size', 'size-block', 'type', 'sent-title',
      'sent-timestamp', 'received-timestamp', 'subject', 'sim-info',
      'contact-title', 'resend-btn', 'header', 'container'
    ]
  }
};

var Information = function(type) {
  Object.assign(this, VIEWS[type]);

  if (this.init) {
    this.init();
  }

  this.panel = document.querySelector('.panel-' + this.name);

  this.elements.forEach(function(name) {
    this[Utils.camelCase(name)] = this.panel.querySelector('.' + name);
  }, this);

  this.header.addEventListener(
    'action', this.backOrClose.bind(this)
  );

  this.setEventListener && this.setEventListener();
  this.reset();
};

Information.prototype = {
  constructor: Information,

  beforeEnter: function(args) {
    this.id = +args.id;
    this.show();
  },

  afterLeave: function() {
    this.reset();
    this.id = null;
  },

  show: function() {
    this.render();
  },

  refresh: function() {
    if (Navigation.isCurrentPanel(this.name)) {
      this.render();
    }
  },

  reset: function() {
    // Remove all LIs
    if (this.contactList) {
      this.contactList.textContent = '';
    }
  },

  backOrClose: function() {
    Navigation.back();
  },

  // Incrementing ID for each rendering request to avoid possible race when next
  // renderContactList request earlier than list item appended to contact list
  // ul. Ignoring the rendering/appending request if the rendering ID doesn't
  // match the latest rendering ID.
  renderingId: 0,

  // Param participants could be:
  //   - Array of contact number string or
  //   - Array of object({ number: number, infoBlock: infoBlock })
  // for rendering the contact list.
  renderContactList: function(participants) {
    var ul = this.contactList;
    var renderer = ContactRenderer.flavor(this.contactFlavor);
    var currentRenderingId = ++this.renderingId;

    ul.textContent = '';
    participants.forEach((participant) => {
      var number, infoBlock, selector;

      if (typeof participant === 'object') {
        number = participant.number;
        infoBlock = participant.infoBlock;
        selector = '.js-contact-info';
      } else {
        number = participant;
      }
      Contacts.findByAddress(number).then((contacts) => {
        // If the current rendering ID doesn't match the latest ID, skip current
        // one and only render for ID which matches latest request ID.
        if (currentRenderingId !== this.renderingId) {
          return;
        }

        if (contacts.length > 0) {
          renderer.render({
            contact: contacts[0],
            input: number,
            infoBlock: infoBlock,
            infoBlockParentSelector: selector,
            target: ul
          });
        } else {
          var li = document.createElement('li');
          li.role = 'presentation';
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
    });
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

