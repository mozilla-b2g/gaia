// DISCLAIMER: This code is a band aid and will slowly be remove when
//             the functionalities provided here will land in the Mozilla
//             platform itself.


'use strict';
var emulateRun = (window.navigator.userAgent.indexOf('B2G') == -1);

try {
  var cache = window.applicationCache;
  cache.update();
  cache.addEventListener('updateready', function updateReady(evt) {
    // XXX add a nice UI when an update is ready asking if the user
    // want to reload the application now.
    cache.swapCache();
    document.location.reload();
  });
} catch (e) {}

if (true) {
  window.navigator.mozApps = {
    enumerate: function mozAppsEnumerate(callback) {
      var webapps = [
        { // browser
          installOrigin: 'http://gaiamobile.org:8888',
          origin: '../browser',
          receipt: null,
          installTime: 1323339869000,
          manifest: {
            'name': 'Browser',
            'description': 'Gaia Web Browser',
            'launch_path': '/browser.html',
            'developer': {
              'name': 'The Gaia Team',
              'url': 'https://github.com/andreasgal/gaia'
            },
            'icons': {
              '120': '/style/icons/Browser.png'
            }
          }
        },
        { // camera
          'installOrigin': 'http://gaiamobile.org:8888',
          'origin': '../camera',
          'receipt': null,
          'installTime': 1323339869000,
          manifest: {
            'name': 'Camera',
            'description': 'Gaia Camera',
            'launch_path': '/camera.html',
            'developer': {
              'name': 'The Gaia Team',
              'url': 'https://github.com/andreasgal/gaia'
            },
            'icons': {
              '120': '/style/icons/Camera.png'
            }
          }
        },
        { // dialer
          'installOrigin': 'http://gaiamobile.org:8888',
          'origin': '../dialer',
          'receipt': null,
          'installTime': 1323339869000,
          manifest: {
            'name': 'Dialer',
            'description': 'Gaia Dialer',
            'launch_path': '/dialer.html',
            'developer': {
              'name': 'The Gaia Team',
              'url': 'https://github.com/andreasgal/gaia'
            },
            'icons': {
              '120': '/style/icons/Phone.png'
            }
          }
        },
        { // gallery
          'installOrigin': 'http://gaiamobile.org:8888',
          'origin': '../gallery',
          'receipt': null,
          'installTime': 1323339869000,
          manifest: {
            'name': 'Gallery',
            'description': 'Gaia Gallery',
            'launch_path': '/gallery.html',
            'developer': {
              'name': 'The Gaia Team',
              'url': 'https://github.com/andreasgal/gaia'
            },
            'icons': {
              '120': '/style/icons/Gallery.png'
            }
          }
        },
        { // music
          'installOrigin': 'http://gaiamobile.org:8888',
          'origin': '../music',
          'receipt': null,
          'installTime': 1323339869000,
          manifest: {
            'name': 'Music',
            'description': 'Gaia Music',
            'launch_path': '/music.html',
            'developer': {
              'name': 'The Gaia Team',
              'url': 'https://github.com/andreasgal/gaia'
            },
            'icons': {
              '120': '/style/icons/Music.png'
            }
          }
        },
        { // settings
          'installOrigin': 'http://gaiamobile.org:8888',
          'origin': '../settings',
          'receipt': null,
          'installTime': 1323339869000,
          manifest: {
            'name': 'Settings',
            'description': 'Gaia Settings',
            'launch_path': '/settings.html',
            'developer': {
              'name': 'The Gaia Team',
              'url': 'https://github.com/andreasgal/gaia'
            },
            'icons': {
              '120': '/style/icons/Settings.png'
            }
          }
        },
        { // sms
          'installOrigin': 'http://gaiamobile.org:8888',
          'origin': '../sms',
          'receipt': null,
          'installTime': 1323339869000,
          manifest: {
            'name': 'Messages',
            'description': 'Gaia Messages',
            'launch_path': '/sms.html',
            'developer': {
              'name': 'The Gaia Team',
              'url': 'https://github.com/andreasgal/gaia'
            },
            'icons': {
              '120': '/style/icons/Messages.png'
           }
        }
      }];

      callback(webapps);
    }
  };
}

var Apps = {
  events: ['keypress', 'unload'],
  handleEvent: function apps_handleEvent(evt) {
    switch (evt.type) {
      case 'keypress':
        if (window.top == window ||
            !emulateRun ||
            evt.getPreventDefault() ||
            evt.keyCode != evt.DOM_VK_ESCAPE)
          break;
        evt.preventDefault();
        evt.stopPropagation();

        window.parent.postMessage('appclose', '*');
        break;
      case 'unload':
        this.uninit();
        break;
    }
  },

  init: function apps_init() {
    this.events.forEach((function(evt) {
      window.addEventListener(evt, this);
    }).bind(this));

    TouchHandler.start();
    ContactsAPI.start();
  },

  uninit: function apps_uninit() {
    this.events.forEach((function(evt) {
      window.removeEventListener(evt, this);
    }).bind(this));

    TouchHandler.stop();
    ContactsAPI.stop();
  }
};

function makeCall(number) {
  var timeout = 0;
  return {
    number: number,
    addEventListener: function(name, callback) {
      timeout = setTimeout(function ch_fakeConnection() {
        callback.handleEvent({});
      }, 1200);
    },
    removeEventListener: function() {
      clearTimeout(timeout);
      timeout = 0;
    },
    answer: function() {
    },
    disconnect: function() {
    }
  };
}

if (!('mozTelephony' in window.navigator) ||
    !window.navigator.mozTelephony) {
  window.navigator.mozTelephony = {
    call: function(number) {
      return makeCall(number);
    },
    liveCalls: [makeCall('1-234-567-890')]
  };
}

var TouchHandler = {
  touchState: { active: false, startX: 0, startY: 0 },
  events: ['touchstart', 'touchmove', 'touchend',
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
  getPannableTarget: function isPannable(target) {
    // TODO Check if the target is pannable
    var targetNode = target;
    try {
      while (targetNode) {
        var computedStyle = window.getComputedStyle(targetNode, null);
        if (computedStyle &&
            computedStyle.getPropertyValue('overflow') == 'scroll') {

          var targetHeight = targetNode.getBoundingClientRect().height;
          if (targetNode.scrollHeight > targetHeight)
            return targetNode;
        }
        targetNode = targetNode.parentNode;
      }
    } catch (e) {
    }
    return null;
  },
  handleEvent: function th_handleEvent(evt) {
    if (evt.getPreventDefault())
      return;

    switch (evt.type) {
      case 'touchstart':
        hideSourceViewer();

        var pannableTarget = this.getPannableTarget(evt.originalTarget);
        if (!pannableTarget)
          return;

        var touchTarget = evt.originalTarget;
        if (touchTarget.className.indexOf('toggleswitch') === -1)
          evt.preventDefault();

        this.target = pannableTarget;
        this.onTouchStart(evt.touches ? evt.touches[0] : evt);
        break;

      case 'touchmove':
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
  contacts: [],
  find: function contactsManager(fields, successCallback, errorCallback) {
    var contacts = this.contacts.slice();
    successCallback(contacts);
  },
  create: function contactsCreate(successCallback, errorCallback, contact) {
    this.contacts.push(contact);
    successCallback();
  },
  delete: function contactsDelete(successCallback, errorCallback, id) {
    var count = contacts.length;
    for (var i = 0; i < count; i++) {
      if (contacts[i].id != id)
        continue;
      var oldContact = contacts.slice(i, 1);
      successCallback(oldContact);
      return;
    }
    errorCallback();
  }
};

var ContactsAPI = {
  _contacts: [
    {
      id: '3',
      displayName: 'Coby Newman',
      name: {
        familyName: ['Coby'],
        givenName: ['Newman']
      },
      phones: ['1-823-949-7735'],
      emails: ['posuere.at@hendreritaarcu.com']
    },
    {
      id: '6',
      displayName: 'Caesar Velasquez',
      name: {
        familyName: ['Caesar'],
        givenName: ['Velasquez']
      },
      phones: ['1-355-185-5419'],
      emails: ['fames@Duis.org']
    },
    {
      id: '9',
      displayName: 'Hamilton Farrell',
      name: {
        familyName: ['Hamilton'],
        givenName: ['Farrell']
      },
      phones: ['1-682-456-9186'],
      emails: ['sem@Uttinciduntvehicula.com']
    },
    {
      id: '12',
      displayName: 'Emery Livingston',
      name: {
        familyName: ['Emery'],
        givenName: ['Livingston']
      },
      phones: ['1-510-151-9801'],
      emails: ['orci.luctus.et@massaInteger.com']
    },
    {
      id: '15',
      displayName: 'Griffith Heath',
      name: {
        familyName: ['Griffith'],
        givenName: ['Heath']
      },
      phones: ['1-800-719-3201'],
      emails: ['dapibus@Inlorem.ca']
    },
    {
      id: '18',
      displayName: 'Luke Stuart',
      name: {
        familyName: ['Luke'],
        givenName: ['Stuart']
      },
      phones: ['1-120-910-1976'],
      emails: ['congue@nibh.ca']
    },
    {
      id: '21',
      displayName: 'Brennan Love',
      name: {
        familyName: ['Brennan'],
        givenName: ['Love']
      },
      phones: ['1-724-155-2807'],
      emails: ['interdum.libero.dui@cursusvestibulum.edu']
    },
    {
      id: '24',
      displayName: 'Lamar Meadows',
      name: {
        familyName: ['Lamar'],
        givenName: ['Meadows']
      },
      phones: ['1-976-164-8769'],
      emails: ['tincidunt@non.com']
    },
    {
      id: '27',
      displayName: 'Erasmus Flynn',
      name: {
        familyName: ['Erasmus'],
        givenName: ['Flynn']
      },
      phones: ['1-488-678-3487'],
      emails: ['lorem.ut.aliquam@eu.ca']
    },
    {
      id: '30',
      displayName: 'Aladdin Ellison',
      name: {
        familyName: ['Aladdin'],
        givenName: ['Ellison']
      },
      phones: ['1-977-743-6797'],
      emails: ['sociosqu.ad@sollicitudin.org']
    },
    {
      id: '33',
      displayName: 'Valentine Rasmussen',
      name: {
        familyName: ['Valentine'],
        givenName: ['Rasmussen']
      },
      phones: ['1-265-504-2025'],
      emails: ['ultrices.iaculis@acsem.edu']
    },
    {
      id: '36',
      displayName: 'Deacon Murphy',
      name: {
        familyName: ['Deacon'],
        givenName: ['Murphy']
      },
      phones: ['1-770-450-1221'],
      emails: ['varius@erat.edu']
    },
    {
      id: '39',
      displayName: 'Paul Kennedy',
      name: {
        familyName: ['Paul'],
        givenName: ['Kennedy']
      },
      phones: ['1-689-891-3529'],
      emails: ['ac.arcu@vitae.edu']
    },
    {
      id: '42',
      displayName: 'Aaron Chase',
      name: {
        familyName: ['Aaron'],
        givenName: ['Chase']
      },
      phones: ['1-451-574-7937'],
      emails: ['tempor.bibendum.Donec@pharetraQuisque.edu']
    },
    {
      id: '45',
      displayName: 'Geoffrey Dunn',
      name: {
        familyName: ['Geoffrey'],
        givenName: ['Dunn']
      },
      phones: ['1-924-387-2395'],
      emails: ['a.malesuada@tellusPhasellus.com']
    },
    {
      id: '48',
      displayName: 'Ashton Russo',
      name: {
        familyName: ['Ashton'],
        givenName: ['Russo']
      },
      phones: ['1-182-776-5600'],
      emails: ['Aliquam.vulputate.ullamcorper@faucibusorci.edu']
    },
    {
      id: '51',
      displayName: 'Owen Noble',
      name: {
        familyName: ['Owen'],
        givenName: ['Noble']
      },
      phones: ['1-463-693-1336'],
      emails: ['et@vulputateveliteu.ca']
    },
    {
      id: '54',
      displayName: 'Kamal Blake',
      name: {
        familyName: ['Kamal'],
        givenName: ['Blake']
      },
      phones: ['1-636-197-1985'],
      emails: ['tempor@malesuada.edu']
    },
    {
      id: '57',
      displayName: 'Tyrone Delaney',
      name: {
        familyName: ['Tyrone'],
        givenName: ['Delaney']
      },
      phones: ['1-886-920-6283'],
      emails: ['est@aliquetsemut.com']
    },
    {
      id: '60',
      displayName: 'Ciaran Sellers',
      name: {
        familyName: ['Ciaran'],
        givenName: ['Sellers']
      },
      phones: ['1-315-414-0323'],
      emails: ['Etiam@Nulla.com']
    },
    {
      id: '63',
      displayName: 'Bernard Alford',
      name: {
        familyName: ['Bernard'],
        givenName: ['Alford']
      },
      phones: ['1-430-958-2651'],
      emails: ['elementum.lorem.ut@sociisnatoque.edu']
    },
    {
      id: '66',
      displayName: 'Kamal Cote',
      name: {
        familyName: ['Kamal'],
        givenName: ['Cote']
      },
      phones: ['1-666-609-9141'],
      emails: ['eleifend.egestas@cursus.edu']
    },
    {
      id: '69',
      displayName: 'Lucius Mckee',
      name: {
        familyName: ['Lucius'],
        givenName: ['Mckee']
      },
      phones: ['1-224-590-6780'],
      emails: ['Fusce.dolor@tellusnon.org']
    },
    {
      id: '72',
      displayName: 'Dale Coleman',
      name: {
        familyName: ['Dale'],
        givenName: ['Coleman']
      },
      phones: ['1-320-245-3036'],
      emails: ['dapibus.rutrum@ametlorem.org']
    },
    {
      id: '75',
      displayName: 'Kermit Nguyen',
      name: {
        familyName: ['Kermit'],
        givenName: ['Nguyen']
      },
      phones: ['1-247-825-8563'],
      emails: ['per@risusMorbi.org']
    },
    {
      id: '78',
      displayName: 'Timon Horton',
      name: {
        familyName: ['Timon'],
        givenName: ['Horton']
      },
      phones: ['1-739-233-8981'],
      emails: ['Etiam@nonummyultriciesornare.ca']
    },
    {
      id: '81',
      displayName: 'Dale Lamb',
      name: {
        familyName: ['Dale'],
        givenName: ['Lamb']
      },
      phones: ['1-640-507-8295'],
      emails: ['dapibus.id@pedeac.edu']
    },
    {
      id: '84',
      displayName: 'Owen Acevedo',
      name: {
        familyName: ['Owen'],
        givenName: ['Acevedo']
      },
      phones: ['1-403-201-3170'],
      emails: ['porttitor.tellus.non@dolorFusce.edu']
    },
    {
      id: '87',
      displayName: 'Richard Mckee',
      name: {
        familyName: ['Richard'],
        givenName: ['Mckee']
      },
      phones: ['1-783-513-0684'],
      emails: ['senectus.et.netus@Vestibulum.com']
    },
    {
      id: '90',
      displayName: 'Elijah Bass',
      name: {
        familyName: ['Elijah'],
        givenName: ['Bass']
      },
      phones: ['1-632-950-0553'],
      emails: ['erat@sapien.com']
    },
    {
      id: '93',
      displayName: 'Barrett Wells',
      name: {
        familyName: ['Barrett'],
        givenName: ['Wells']
      },
      phones: ['1-112-180-5617'],
      emails: ['interdum.ligula@varius.edu']
    },
    {
      id: '96',
      displayName: 'Herman Meyer',
      name: {
        familyName: ['Herman'],
        givenName: ['Meyer']
      },
      phones: ['1-296-252-5507'],
      emails: ['urna@vitaealiquameros.org']
    },
    {
      id: '99',
      displayName: 'Ashton Hinton',
      name: {
        familyName: ['Ashton'],
        givenName: ['Hinton']
      },
      phones: ['1-695-256-8929'],
      emails: ['lorem@mattisornare.org']
    },
    {
      id: '102',
      displayName: 'Harrison Marsh',
      name: {
        familyName: ['Harrison'],
        givenName: ['Marsh']
      },
      phones: ['1-897-458-1730'],
      emails: ['pharetra.felis.eget@auctor.com']
    },
    {
      id: '105',
      displayName: 'Benedict Santana',
      name: {
        familyName: ['Benedict'],
        givenName: ['Santana']
      },
      phones: ['1-565-457-4828'],
      emails: ['amet.metus.Aliquam@Maecenas.org']
    },
    {
      id: '108',
      displayName: 'David Church',
      name: {
        familyName: ['David'],
        givenName: ['Church']
      },
      phones: ['1-179-353-3314'],
      emails: ['Nullam.enim@Utsagittis.edu']
    },
    {
      id: '111',
      displayName: 'Colt Wolfe',
      name: {
        familyName: ['Colt'],
        givenName: ['Wolfe']
      },
      phones: ['1-587-970-8581'],
      emails: ['hendrerit.Donec.porttitor@tinciduntaliquam.org']
    },
    {
      id: '114',
      displayName: 'Carlos Bishop',
      name: {
        familyName: ['Carlos'],
        givenName: ['Bishop']
      },
      phones: ['1-963-305-6702'],
      emails: ['Nam@cursusNunc.org']
    },
    {
      id: '117',
      displayName: 'Dominic Ware',
      name: {
        familyName: ['Dominic'],
        givenName: ['Ware']
      },
      phones: ['1-609-458-5449'],
      emails: ['Fusce.aliquet@Etiam.ca']
    },
    {
      id: '120',
      displayName: 'Phillip Whitley',
      name: {
        familyName: ['Phillip'],
        givenName: ['Whitley']
      },
      phones: ['1-284-955-1766'],
      emails: ['per.inceptos.hymenaeos@nequesedsem.ca']
    },
    {
      id: '123',
      displayName: 'Valentine Sargent',
      name: {
        familyName: ['Valentine'],
        givenName: ['Sargent']
      },
      phones: ['1-346-890-6417'],
      emails: ['nec@dolorFusce.com']
    },
    {
      id: '126',
      displayName: 'Gabriel Huber',
      name: {
        familyName: ['Gabriel'],
        givenName: ['Huber']
      },
      phones: ['1-399-465-0589'],
      emails: ['pretium.neque@nislsemconsequat.ca']
    },
    {
      id: '129',
      displayName: 'George Tyler',
      name: {
        familyName: ['George'],
        givenName: ['Tyler']
      },
      phones: ['1-739-571-2737'],
      emails: ['blandit.viverra.Donec@dictum.ca']
    },
    {
      id: '132',
      displayName: 'Asher Carey',
      name: {
        familyName: ['Asher'],
        givenName: ['Carey']
      },
      phones: ['1-477-425-4723'],
      emails: ['torquent.per.conubia@blanditNamnulla.edu']
    },
    {
      id: '135',
      displayName: 'Anthony Solomon',
      name: {
        familyName: ['Anthony'],
        givenName: ['Solomon']
      },
      phones: ['1-570-753-4296'],
      emails: ['risus.Nunc@hendreritconsectetuercursus.com']
    },
    {
      id: '138',
      displayName: 'Griffith Fuller',
      name: {
        familyName: ['Griffith'],
        givenName: ['Fuller']
      },
      phones: ['1-779-242-5342'],
      emails: ['Suspendisse@aliquam.ca']
    },
    {
      id: '141',
      displayName: 'Beau Brewer',
      name: {
        familyName: ['Beau'],
        givenName: ['Brewer']
      },
      phones: ['1-664-184-7334'],
      emails: ['magna.tellus.faucibus@ultricesposuerecubilia.com']
    },
    {
      id: '144',
      displayName: 'Jordan Campbell',
      name: {
        familyName: ['Jordan'],
        givenName: ['Campbell']
      },
      phones: ['1-593-938-2525'],
      emails: ['Curae;.Phasellus@Morbiquis.ca']
    },
    {
      id: '147',
      displayName: 'Cyrus Cabrera',
      name: {
        familyName: ['Cyrus'],
        givenName: ['Cabrera']
      },
      phones: ['1-915-748-1349'],
      emails: ['lorem.tristique@acmetus.edu']
    },
    {
      id: '150',
      displayName: 'Hamilton Boone',
      name: {
        familyName: ['Hamilton'],
        givenName: ['Boone']
      },
      phones: ['1-278-421-9845'],
      emails: ['non.sapien@quamdignissimpharetra.edu']
    },
    {
      id: '153',
      displayName: 'Wallace Donovan',
      name: {
        familyName: ['Wallace'],
        givenName: ['Donovan']
      },
      phones: ['1-940-175-9334'],
      emails: ['justo@lacusMaurisnon.org']
    },
    {
      id: '156',
      displayName: 'Kirk Buckley',
      name: {
        familyName: ['Kirk'],
        givenName: ['Buckley']
      },
      phones: ['1-283-177-6304'],
      emails: ['Cras@Morbinon.edu']
    },
    {
      id: '159',
      displayName: 'Simon Hall',
      name: {
        familyName: ['Simon'],
        givenName: ['Hall']
      },
      phones: ['1-269-202-5174'],
      emails: ['mus.Proin@dolor.org']
    },
    {
      id: '162',
      displayName: 'Trevor Rush',
      name: {
        familyName: ['Trevor'],
        givenName: ['Rush']
      },
      phones: ['1-865-595-9074'],
      emails: ['Fusce@Donec.edu']
    },
    {
      id: '165',
      displayName: 'Todd Mccormick',
      name: {
        familyName: ['Todd'],
        givenName: ['Mccormick']
      },
      phones: ['1-398-916-3514'],
      emails: ['at@ornareelit.org']
    },
    {
      id: '168',
      displayName: 'Yuli Gay',
      name: {
        familyName: ['Yuli'],
        givenName: ['Gay']
      },
      phones: ['1-198-196-4256'],
      emails: ['Sed.congue.elit@Inornare.edu']
    },
    {
      id: '171',
      displayName: 'Joseph Frazier',
      name: {
        familyName: ['Joseph'],
        givenName: ['Frazier']
      },
      phones: ['1-969-410-7180'],
      emails: ['faucibus.ut.nulla@massa.org']
    },
    {
      id: '174',
      displayName: 'Ali Chase',
      name: {
        familyName: ['Ali'],
        givenName: ['Chase']
      },
      phones: ['1-598-924-6112'],
      emails: ['eu.elit@necanteMaecenas.edu']
    },
    {
      id: '177',
      displayName: 'Guy Simpson',
      name: {
        familyName: ['Guy'],
        givenName: ['Simpson']
      },
      phones: ['1-558-377-3714'],
      emails: ['in@mauriselit.edu']
    },
    {
      id: '180',
      displayName: 'Ivan Wynn',
      name: {
        familyName: ['Ivan'],
        givenName: ['Wynn']
      },
      phones: ['1-274-885-0477'],
      emails: ['lobortis.quis@Sed.com']
    },
    {
      id: '183',
      displayName: 'Preston Carpenter',
      name: {
        familyName: ['Preston'],
        givenName: ['Carpenter']
      },
      phones: ['1-758-120-5270'],
      emails: ['elit.Curabitur@vehiculaaliquet.edu']
    },
    {
      id: '186',
      displayName: 'Demetrius Santos',
      name: {
        familyName: ['Demetrius'],
        givenName: ['Santos']
      },
      phones: ['1-913-961-7009'],
      emails: ['id@magnaPhasellusdolor.com']
    },
    {
      id: '189',
      displayName: 'Dale Franklin',
      name: {
        familyName: ['Dale'],
        givenName: ['Franklin']
      },
      phones: ['1-443-971-0116'],
      emails: ['velit.Pellentesque@IntegerurnaVivamus.com']
    },
    {
      id: '192',
      displayName: 'Abraham Randolph',
      name: {
        familyName: ['Abraham'],
        givenName: ['Randolph']
      },
      phones: ['1-368-169-0957'],
      emails: ['egestas@maurisidsapien.com']
    },
    {
      id: '195',
      displayName: 'Hu Avila',
      name: {
        familyName: ['Hu'],
        givenName: ['Avila']
      },
      phones: ['1-311-333-8877'],
      emails: ['metus@adipiscinglacusUt.com']
    },
    {
      id: '198',
      displayName: 'Garth Trujillo',
      name: {
        familyName: ['Garth'],
        givenName: ['Trujillo']
      },
      phones: ['1-409-494-1231'],
      emails: ['commodo.hendrerit.Donec@etnunc.ca']
    },
    {
      id: '201',
      displayName: 'Quamar Buchanan',
      name: {
        familyName: ['Quamar'],
        givenName: ['Buchanan']
      },
      phones: ['1-114-992-7225'],
      emails: ['tellus@consequatpurusMaecenas.ca']
    },
    {
      id: '204',
      displayName: 'Ulysses Bishop',
      name: {
        familyName: ['Ulysses'],
        givenName: ['Bishop']
      },
      phones: ['1-485-518-5941'],
      emails: ['fermentum.fermentum.arcu@amalesuadaid.com']
    },
    {
      id: '207',
      displayName: 'Avram Knapp',
      name: {
        familyName: ['Avram'],
        givenName: ['Knapp']
      },
      phones: ['1-307-139-5554'],
      emails: ['est.ac.mattis@ultricesmauris.ca']
    },
    {
      id: '210',
      displayName: 'Conan Grant',
      name: {
        familyName: ['Conan'],
        givenName: ['Grant']
      },
      phones: ['1-331-936-0280'],
      emails: ['turpis@odio.com']
    },
    {
      id: '213',
      displayName: 'Chester Kemp',
      name: {
        familyName: ['Chester'],
        givenName: ['Kemp']
      },
      phones: ['1-554-119-4848'],
      emails: ['Aenean.gravida.nunc@eu.org']
    },
    {
      id: '216',
      displayName: 'Hedley Dudley',
      name: {
        familyName: ['Hedley'],
        givenName: ['Dudley']
      },
      phones: ['1-578-607-6287'],
      emails: ['Nunc@dignissimtemporarcu.ca']
    },
    {
      id: '219',
      displayName: 'Jermaine Avila',
      name: {
        familyName: ['Jermaine'],
        givenName: ['Avila']
      },
      phones: ['1-860-455-2283'],
      emails: ['accumsan@ametdapibusid.ca']
    },
    {
      id: '222',
      displayName: 'Kamal Hamilton',
      name: {
        familyName: ['Kamal'],
        givenName: ['Hamilton']
      },
      phones: ['1-650-389-0920'],
      emails: ['Fusce.dolor@nuncsed.ca']
    },
    {
      id: '225',
      displayName: 'Castor Maxwell',
      name: {
        familyName: ['Castor'],
        givenName: ['Maxwell']
      },
      phones: ['1-260-489-7135'],
      emails: ['diam.lorem@a.ca']
    },
    {
      id: '228',
      displayName: 'Lyle Burris',
      name: {
        familyName: ['Lyle'],
        givenName: ['Burris']
      },
      phones: ['1-250-343-2038'],
      emails: ['eget.lacus@tempordiamdictum.com']
    },
    {
      id: '231',
      displayName: 'Merrill Dalton',
      name: {
        familyName: ['Merrill'],
        givenName: ['Dalton']
      },
      phones: ['1-851-675-1381'],
      emails: ['eu.tempor@blanditmattisCras.edu']
    },
    {
      id: '234',
      displayName: 'Ezekiel Medina',
      name: {
        familyName: ['Ezekiel'],
        givenName: ['Medina']
      },
      phones: ['1-389-582-3443'],
      emails: ['lectus.sit@interdum.ca']
    },
    {
      id: '237',
      displayName: 'Len Tran',
      name: {
        familyName: ['Len'],
        givenName: ['Tran']
      },
      phones: ['1-434-573-6114'],
      emails: ['turpis.Aliquam.adipiscing@montesnasceturridiculus.com']
    },
    {
      id: '240',
      displayName: 'Len Dominguez',
      name: {
        familyName: ['Len'],
        givenName: ['Dominguez']
      },
      phones: ['1-144-489-7487'],
      emails: ['augue@Innec.ca']
    },
    {
      id: '243',
      displayName: 'Paul Lane',
      name: {
        familyName: ['Paul'],
        givenName: ['Lane']
      },
      phones: ['1-448-169-4312'],
      emails: ['lectus.Cum.sociis@dolornonummyac.org']
    },
    {
      id: '246',
      displayName: 'Eric Horne',
      name: {
        familyName: ['Eric'],
        givenName: ['Horne']
      },
      phones: ['1-124-862-6890'],
      emails: ['commodo.tincidunt.nibh@eleifendnuncrisus.com']
    },
    {
      id: '249',
      displayName: 'Elton Ellis',
      name: {
        familyName: ['Elton'],
        givenName: ['Ellis']
      },
      phones: ['1-492-834-0019'],
      emails: ['lorem.eu.metus@felis.ca']
    },
    {
      id: '252',
      displayName: 'Jameson Snyder',
      name: {
        familyName: ['Jameson'],
        givenName: ['Snyder']
      },
      phones: ['1-811-590-5893'],
      emails: ['fermentum@Nuncmaurissapien.org']
    },
    {
      id: '255',
      displayName: 'Micah Shelton',
      name: {
        familyName: ['Micah'],
        givenName: ['Shelton']
      },
      phones: ['1-402-504-4026'],
      emails: ['Nunc.mauris@malesuada.ca']
    },
    {
      id: '258',
      displayName: 'Evan Lester',
      name: {
        familyName: ['Evan'],
        givenName: ['Lester']
      },
      phones: ['1-535-915-3570'],
      emails: ['libero@adipiscingfringillaporttitor.org']
    },
    {
      id: '261',
      displayName: 'Reuben Dalton',
      name: {
        familyName: ['Reuben'],
        givenName: ['Dalton']
      },
      phones: ['1-296-598-2504'],
      emails: ['tincidunt.vehicula.risus@Craseutellus.com']
    },
    {
      id: '264',
      displayName: 'Beau Baird',
      name: {
        familyName: ['Beau'],
        givenName: ['Baird']
      },
      phones: ['1-525-882-9957'],
      emails: ['urna.suscipit.nonummy@facilisisvitae.com']
    },
    {
      id: '267',
      displayName: 'Hedley Olsen',
      name: {
        familyName: ['Hedley'],
        givenName: ['Olsen']
      },
      phones: ['1-945-295-5863'],
      emails: ['vulputate.ullamcorper@Vivamusnisi.org']
    },
    {
      id: '270',
      displayName: 'Oliver Todd',
      name: {
        familyName: ['Oliver'],
        givenName: ['Todd']
      },
      phones: ['1-551-447-1296'],
      emails: ['Donec.egestas@rutrum.edu']
    },
    {
      id: '273',
      displayName: 'Keegan Mayo',
      name: {
        familyName: ['Keegan'],
        givenName: ['Mayo']
      },
      phones: ['1-351-848-2796'],
      emails: ['ridiculus@Nuncsed.ca']
    },
    {
      id: '276',
      displayName: 'Wang Cote',
      name: {
        familyName: ['Wang'],
        givenName: ['Cote']
      },
      phones: ['1-439-568-2013'],
      emails: ['Morbi@tinciduntduiaugue.org']
    },
    {
      id: '279',
      displayName: 'Hyatt Rowe',
      name: {
        familyName: ['Hyatt'],
        givenName: ['Rowe']
      },
      phones: ['1-596-765-3807'],
      emails: ['eu.erat.semper@enimnonnisi.com']
    },
    {
      id: '282',
      displayName: 'Cade Wyatt',
      name: {
        familyName: ['Cade'],
        givenName: ['Wyatt']
      },
      phones: ['1-988-289-5924'],
      emails: ['erat.nonummy@sedpedeCum.com']
    },
    {
      id: '285',
      displayName: 'Stephen Vincent',
      name: {
        familyName: ['Stephen'],
        givenName: ['Vincent']
      },
      phones: ['1-954-435-1259'],
      emails: ['nec.euismod@ultricies.ca']
    },
    {
      id: '288',
      displayName: 'Tobias Cherry',
      name: {
        familyName: ['Tobias'],
        givenName: ['Cherry']
      },
      phones: ['1-270-763-1111'],
      emails: ['Nulla.aliquet@sit.com']
    },
    {
      id: '291',
      displayName: 'Keane Trevino',
      name: {
        familyName: ['Keane'],
        givenName: ['Trevino']
      },
      phones: ['1-794-929-8599'],
      emails: ['sem.semper.erat@Aliquamnecenim.edu']
    },
    {
      id: '294',
      displayName: 'Kennedy Cooley',
      name: {
        familyName: ['Kennedy'],
        givenName: ['Cooley']
      },
      phones: ['1-725-946-1901'],
      emails: ['urna.justo@Duismienim.edu']
    },
    {
      id: '297',
      displayName: 'Lucian Pope',
      name: {
        familyName: ['Lucian'],
        givenName: ['Pope']
      },
      phones: ['1-186-946-8356'],
      emails: ['justo.Proin@dis.com']
    },
    {
      id: '300',
      displayName: 'Hu Combs',
      name: {
        familyName: ['Hu'],
        givenName: ['Combs']
      },
      phones: ['1-398-488-5222'],
      emails: ['faucibus.lectus@nuncsedpede.com']
    }
  ],

  start: function contact_init() {
    window.navigator.mozContacts = ContactsManager;

    var contacts = ContactsManager.contacts;
    this._contacts.forEach((function(contact) {
      contacts.push(contact);
    }).bind(this));
  },
  stop: function contact_uninit() {
    window.navigator.mozContacts = null;
  }
};

Apps.init();


(function touchEventHandler() {
  var debugging = false;
  function debug(str) {
    if (debugging)
      dump(str);
  };
  var gIgnoreEvents = false;

  var contextMenuTimeout = 0;

  // During a 'touchstart' and the first 'touchmove' mouse events can be
  // prevented for the current touch sequence.
  var canPreventMouseEvents = false;

  // Used to track the first mousemove and to cancel click dispatc if it's not
  // true.
  var isNewTouchAction = false;

  // If this is set to true all mouse events will be cancelled by calling
  // both evt.preventDefault() and evt.stopPropagation().
  // This will not prevent a contextmenu event to be fired.
  // This can be turned on if canPreventMouseEvents is true and the consumer
  // application call evt.preventDefault();
  var preventMouseEvents = false;

  var TouchEventHandler = {
    events: ['mousedown', 'mousemove', 'mouseup', 'click', 'unload'],
    start: function teh_start() {
      this.events.forEach((function(evt) {
        window.addEventListener(evt, this, true);
      }).bind(this));
    },
    stop: function teh_stop() {
      this.events.forEach((function(evt) {
        window.removeEventListener(evt, this, true);
      }).bind(this));
    },
    handleEvent: function teh_handleEvent(evt) {
      // Handle left button only and prevents re-entering the event loop
      // for self disptached events.
      if (evt.button || gIgnoreEvents)
        return;

      var eventTarget = this.target;
      var type = '';
      switch (evt.type) {
        case 'mousedown':
          debug('mousedown:');

          this.target = evt.target;
          this.timestamp = evt.timeStamp;
          evt.target.setCapture(false);

          preventMouseEvents = false;
          canPreventMouseEvents = true;
          isNewTouchAction = true;

          contextMenuTimeout =
            this.sendContextMenu(evt.target, evt.pageX, evt.pageY, 2000);
          this.startX = evt.pageX;
          this.startY = evt.pageY;
          type = 'touchstart';
          break;

        case 'mousemove':
          if (!eventTarget)
            return;

          // On device a mousemove event is fired right after the mousedown
          // because of the size of the finger, so var's ignore what happens
          // below 5ms
          if (evt.timeStamp - this.timestamp < 30)
            break;

          if (isNewTouchAction) {
            canPreventMouseEvents = true;
            isNewTouchAction = false;
          }

          if (Math.abs(this.startX - evt.pageX) > 15 ||
              Math.abs(this.startY - evt.pageY) > 15)
            window.clearTimeout(contextMenuTimeout);
          type = 'touchmove';
          break;

        case 'mouseup':
          if (!eventTarget)
            return;
          debug('mouseup:');

          window.clearTimeout(contextMenuTimeout);
          eventTarget.ownerDocument.releaseCapture();
          this.target = null;
          type = 'touchend';
          break;

        case 'unload':
          window.clearTimeout(contextMenuTimeout);
          TouchEventHandler.stop();

          if (eventTarget) {
            eventTarget.ownerDocument.releaseCapture();
            this.target = null;
          }
          return;

        case 'click':
          if (!isNewTouchAction) {
            debug('click: cancel\n');
            evt.preventDefault();
            evt.stopPropagation();
          } else {
            // Mouse events has been cancelled so dispatch a sequence
            // of events to where touchend has been fired
            if (preventMouseEvents) {
              var target = evt.target;
              gIgnoreEvents = true;
              this.fireMouseEvent('mousemove', target, evt.pageX, evt.pageY);
              this.fireMouseEvent('mousedown', target, evt.pageX, evt.pageY);
              this.fireMouseEvent('mouseup', target, evt.pageX, evt.pageY);
              gIgnoreEvents = false;
            }
            debug('click: fire\n');
          }
          return;
      }

      var target = eventTarget || this.target;
      if (target && type) {
        var touchEvent = this.sendTouchEvent(evt, target, type);
        if (touchEvent.getPreventDefault() && canPreventMouseEvents)
          preventMouseEvents = true;
      }

      if (preventMouseEvents) {
        evt.preventDefault();
        evt.stopPropagation();

        if (type != 'touchmove')
          debug('cancelled (fire ' + type + ')\n');
      }
    },
    fireMouseEvent: function teh_fireMouseEvent(type, target, x, y) {
      debug(type + ': fire\n');
      var doc = target.ownerDocument;
      var evt = doc.createEvent('MouseEvent');
      evt.initMouseEvent(type, true, true, doc.defaultView,
                         0, x, y, x, y, false, false, false, false,
                         0, null);
      target.dispatchEvent(evt);
    },
    sendContextMenu: function teh_sendContextMenu(target, x, y, delay) {
      var doc = target.ownerDocument;
      var evt = doc.createEvent('MouseEvent');
      evt.initMouseEvent('contextmenu', true, true, doc.defaultView,
                         0, x, y, x, y, false, false, false, false,
                         0, null);

      var timeout = window.setTimeout((function contextMenu() {
        debug('fire context-menu');

        target.dispatchEvent(evt);
        if (!evt.getPreventDefault())
          return;

        doc.releaseCapture();
        this.target = null;

        isNewTouchAction = false;
      }).bind(this), delay);
      return timeout;
    },
    sendTouchEvent: function teh_sendTouchEvent(evt, target, name) {
      var touchEvent = document.createEvent('touchevent');
      var point = document.createTouch(window, target, 0,
                                     evt.pageX, evt.pageY,
                                     evt.screenX, evt.screenY,
                                     evt.clientX, evt.clientY,
                                     1, 1, 0, 0);
      var touches = document.createTouchList(point);
      var targetTouches = touches;
      var changedTouches = touches;
      touchEvent.initTouchEvent(name, true, true, window, 0,
                                false, false, false, false,
                                touches, targetTouches, changedTouches);
      target.dispatchEvent(touchEvent);
      return touchEvent;
    }
  };

  if (emulateRun)
    TouchEventHandler.start();
})();

