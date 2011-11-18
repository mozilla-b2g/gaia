
'use strict';

var Apps = {
  events: ['keypress', 'unload'],
  handleEvent: function apps_handleEvent(evt) {
    switch (evt.type) {
      case 'keypress':
        if (window.top == window ||
            evt.keyCode != evt.DOM_VK_ESCAPE)
          break;
        evt.preventDefault();

        var event = document.createEvent('UIEvents');
        event.initUIEvent('appclose', true, true, window, 0);
        window.parent.dispatchEvent(event);
        break;
      case 'unload':
        this.uninit();
        break;
    }
  },

  init: function apps_init() {
    this.events.forEach((function(evt) {
      window.addEventListener(evt, this, true);
    }).bind(this));

    TouchHandler.start();
    ContactsAPI.start();
  },

  uninit: function apps_uninit() {
    this.events.forEach((function(evt) {
      window.removeEventListener(evt, this, true);
    }).bind(this));

    TouchHandler.stop();
    ContactsAPI.stop();
  }
};

var TouchHandler = {
  touchState: { active: false, startX: 0, startY: 0 },
  events: ['touchstart', 'touchmove', 'touchend',
           'mousedown', 'mousemove', 'mouseup',
           'contextmenu'],
  start: function th_start() {
    this.events.forEach((function(evt) {
      window.addEventListener(evt, this);
    }).bind(this));
  },
  stop: function th_stop() {
    this.events.forEach((function(evt) {
      window.removeEventListener(evt, this);
    }).bind(this));
  },
  onTouchStart: function th_touchStart(evt) {
    var touchState = this.touchState;
    touchState.active = true;
    touchState.startTime = evt.timeStamp;

    this.startX = this.lastX = evt.pageX;
    this.startY = this.lastY = evt.pageY;
  },
  onTouchEnd: function th_touchEnd(evt) {
    var touchState = this.touchState;
    if (!touchState.active)
      return;
    touchState.active = false;

    this.startX = this.startY = 0;
    this.lastX = this.lastY = 0;
  },
  onTouchMove: function th_touchMove(evt) {
    var offsetX = this.lastX - evt.pageX;
    var offsetY = this.lastY - evt.pageY;

    var element = this.target;
    element.scrollLeft += offsetX;
    element.scrollTop += offsetY;

    this.lastX = evt.pageX;
    this.lastY = evt.pageY;
  },
  isPan: function isPan(x1, y1, x2, y2) {
    var kRadius = 10;
    return Math.abs(x1 - x2) > kRadius || Math.abs(y1 - y2) > kRadius;
  },
  isPannable: function isPannable(target) {
    // TODO Check if the target is pannable
    return true;
  },
  handleEvent: function th_handleEvent(evt) {
    if (evt.getPreventDefault())
      return;

    switch (evt.type) {
      case 'touchstart':
      case 'mousedown':
        if (!this.isPannable(evt.target)
          return;

        evt.preventDefault();
        hideSourceViewer();
        this.target = evt.originalTarget;
        this.onTouchStart(evt.touches ? evt.touches[0] : evt);
        break;

      case 'touchmove':
      case 'mousemove':
        if (!this.target)
          break;

        var touchEvent = evt.touches ? evt.touches[0] : evt;
        if (!this.panning) {
          var pan = this.isPan(evt.pageX, evt.pageY, this.startX, this.startY);
          if (pan) {
            this.panning = true;
            this.startX = this.lastX = touchEvent.pageX;
            this.startY = this.lastY = touchEvent.pageY;
            this.target.setAttribute('panning', true);
            this.target.setCapture(false);
          }
        }
        this.onTouchMove(touchEvent);
        break;
      case 'contextmenu':
        var sourceURL = (evt.target.ownerDocument || window.document).URL;
        showSourceViewer(sourceURL);
        evt.preventDefault();
      case 'touchend':
      case 'mouseup':
        if (!this.target)
          return;

        if (this.panning) {
          document.releaseCapture();
          this.target.removeAttribute('panning');
          this.panning = null;
        }
        this.onTouchEnd(evt.touches ? evt.touches[0] : evt);
        this.target = null;
      break;
    }
  }
};

function showSourceViewer(url) {
  var viewsource = document.getElementById('appViewsource');
  if (!viewsource) {
    var style = '#appViewsource { ' +
                '  position: absolute;' +
                '  top: -moz-calc(10%);' +
                '  left: -moz-calc(10%);' +
                '  width: -moz-calc(80% - 2 * 15px);' +
                '  height: -moz-calc(80% - 2 * 15px);' +
                '  visibility: hidden;' +
                '  box-shadow: 10px 10px 5px #888;' +
                '  margin: 15px;' +
                '  background-color: white;' +
                '  opacity: 0.92;' +
                '  color: black;' +
                '  z-index: 9999;' +
                '}';
    document.styleSheets[0].insertRule(style, 0);

    viewsource = document.createElement('iframe');
    viewsource.id = 'appViewsource';
    document.body.appendChild(viewsource);
  }
  viewsource.style.visibility = 'visible';
  viewsource.src = 'view-source: ' + url;
}

function hideSourceViewer() {
  var viewsource = document.getElementById('appViewsource');
  if (viewsource) {
    viewsource.style.visibility = 'hidden';
  }
}

var ContactsManager = {
  contacts: []
};

var Contact = function Contact(name, familyName, tel) {
  this.name = name;
  this.honorificPrefix = '';
  this.givenName = '';
  this.additionalName = '';
  this.familyName = familyName;
  this.honorificSuffix = '';
  this.nickname = '';
  this.email = '';
  this.photo = '';
  this.url = '';
  this.category = '';
  this.adr = new ContactAddress();
  this.streetAddress = '';
  this.locality = '';
  this.region = '';
  this.postalCode = '';
  this.countryName = '';
  this.tel = tel;
  this.org = '';
  this.bday = new Date();
  this.note = '';
  this.impp = ''; /* per RFC 4770, included in vCard4 */
  this.anniversary = new Date();
};

var ContactAddress = function ContactAddress() {
  this.streetAddress = '';
  this.locality = '';
  this.region = '';
  this.postalCode = '';
  this.countryName = '';
};

var ContactsAPI = {
  _contacts: [
    { name: 'Andreas', tel: '+0110101010101' },
    { name: 'Chris', tel: '+01202020202' },
    { name: 'Mounir', tel: '+33601010101' },
    { name: 'Vivien', tel: '+33602020202' }
  ],
  start: function contact_init() {
    window.navigator.mozContacts = ContactsManager;

    var contacts = ContactsManager.contacts;
    this._contacts.forEach((function(contact) {
      contacts.push(new Contact(contact.name, '', contact.tel));
    }).bind(this));
  },
  stop: function contact_uninit() {
    window.navigator.mozContacts = null;
  }
};

Apps.init();

