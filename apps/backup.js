var webapps = [
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
               },
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
               { // maps
                 installOrigin: 'http://gaiamobile.org:8888',
                 origin: '../maps',
                 receipt: null,
                 installTime: 1323339869000,
                 manifest: {
                   'name': 'Maps',
                   'description': 'Google Maps',
                   'launch_path': '/maps.html',
                   'developer': {
                     'name': 'The Gaia Team',
                     'url': 'https://github.com/andreasgal/gaia'
                   },
                   'icons': {
                     '120': '/style/icons/Maps.png'
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
                   'hackKillMe': true,
                   'developer': {
                     'name': 'The Gaia Team',
                     'url': 'https://github.com/andreasgal/gaia'
                   },
                   'icons': {
                     '120': '/style/icons/Camera.png'
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
               { // video
                 'installOrigin': 'http://gaiamobile.org:8888',
                 'origin': '../video',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Video',
                   'description': 'Gaia Video',
                   'launch_path': '/video.html',
                   'hackKillMe': true,
                   'developer': {
                     'name': 'The Gaia Team',
                     'url': 'https://github.com/andreasgal/gaia'
                   },
                   'icons': {
                     '120': '/style/icons/Video.png'
                   },
                   'fullscreen': true
                 }
               },
               { // facebook
                 'installOrigin': 'http://www.facebook.com',
                 'origin': 'http://touch.facebook.com',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Facebook',
                   'description': 'Facebook Mobile Application',
                   'launch_path': '/',
                   'developer': {
                     'name': 'Facebook',
                     'url': 'http://www.facebook.com/'
                   },
                   'icons': {
                     '120': '/style/icons/Facebook.png'
                   }
                 }
               },
               { // market
                 'installOrigin': 'http://gaiamobile.org:8888',
                 'origin': '../market',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Market',
                   'description': 'Market for downloading and installing apps',
                   'launch_path': '/market.html',
                   'developer': {
                     'name': 'The Gaia Team',
                     'url': 'https://github.com/andreasgal/gaia'
                   },
                   'icons': {
                     '120': '/style/icons/Market.png'
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
               { // mail
                 installOrigin: 'http://mail.google.com',
                 origin: 'http://mail.google.com',
                 receipt: null,
                 installTime: 1323339869000,
                 manifest: {
                   'name': 'Mail',
                   'description': 'GMail',
                   'launch_path': '/mail/mu',
                   'developer': {
                     'name': 'Google',
                     'url': 'http://google.com'
                   },
                   'icons': {
                     '120': '/style/icons/GMail.png'
                   }
                 }
               },
               { // calendar
                 installOrigin: 'http://google.com',
                 origin: 'http://google.com',
                 receipt: null,
                 installTime: 1323339869000,
                 manifest: {
                   'name': 'Calendar',
                   'description': 'Google Calendar',
                   'launch_path': '/calendar/gp',
                   'developer': {
                     'name': 'Google',
                     'url': 'http://google.com'
                   },
                   'icons': {
                     '120': '/style/icons/GoogleCalendar.png'
                   }
                 }
               },
               { // zimbra
                 installOrigin: 'https://mail.mozilla.com',
                 origin: 'https://mail.mozilla.com',
                 receipt: null,
                 installTime: 1323339869000,
                 manifest: {
                   'name': 'Zimbra',
                   'description': 'Mozilla Zimbra Mail',
                   'launch_path': '/zimbra/m',
                   'developer': {
                     'name': 'Zimbra',
                     'url': 'http://zimbra.com'
                   },
                   'icons': {
                     '120': '/style/icons/Zimbra.png'
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
               { // clock
                 installOrigin: 'http://gaiamobile.org:8888',
                 origin: '../clock',
                 receipt: null,
                 installTime: 1323339869000,
                 manifest: {
                   'name': 'Clock',
                   'description': 'Gaia Clock',
                   'launch_path': '/clock.html',
                   'developer': {
                     'name': 'The Gaia Team',
                     'url': 'https://github.com/andreasgal/gaia'
                   },
                   'icons': {
                     '120': '/style/icons/Clock.png'
                   }
                 }
               },
               { // webgl demo
                 'installOrigin': 'http://www.everyday3d.com/j3d/demo',
                 'origin': '../crystalskull',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Crystal Skull',
                   'description': 'Demo of WebGL',
                   'launch_path': '/crystalskull.html',
                   'hackKillMe': true,
                   'developer': {
                     'name': 'Unknown',
                     'url': 'http://www.everyday3d.com/j3d/demo/004_Glass.html'
                   },
                   'icons': {
                     '120': '/style/icons/CrystalSkull.png'
                   },
                   'fullscreen': true
                 }
               },
               { // video cube demo
                 'installOrigin': 'http://www.everyday3d.com/j3d/demo',
                 'origin': '../cubevid',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'VideoCube',
                   'description': 'Demo of WebGL',
                   'launch_path': '/index.html',
                   'hackKillMe': true,
                   'developer': {
                     'name': 'Unknown',
                     'url': 'http://www.everyday3d.com/j3d/demo/004_Glass.html'
                   },
                   'icons': {
                     '120': '/style/icons/VideoCube.png'
                   },
                   'fullscreen': true
                 }
               },
               { // PenguinPop
                 'installOrigin': 'http://goosypets.com/html5games/whac',
                 'origin': '../penguinpop',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Penguin Pop',
                   'description': 'Penguin Pop by TweenSoft.com',
                   'launch_path': '/penguinpop.html',
                   'developer': {
                     'name': 'TweenSoft.com',
                     'url': 'http://goosypets.com/html5games/whac/'
                   },
                   'icons': {
                     '120': '/style/icons/PenguinPop.png'
                   }
                 }
               },
               { // TowerJelly
                 'installOrigin': 'http://goosypets.com/html5games/tower/',
                 'origin': '../towerjelly',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Tower Jelly',
                   'description': 'Tower Jelly by TweenSoft.com',
                   'launch_path': '/towerjelly.html',
                   'developer': {
                     'name': 'TweenSoft.com',
                     'url': 'http://goosypets.com/html5games/tower/'
                   },
                   'icons': {
                     '120': '/style/icons/TowerJelly.png'
                   }
                 }
               },
               { // cut the rope
                 'installOrigin': 'http://cuttherope.ie/',
                 'origin': 'http://cuttherope.ie/',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Cut The Rope',
                   'description': 'http://cuttherope.ie',
                   'launch_path': '',
                   'orientation': 'landscape-primary',
                   'fullscreen': true,
                   'hackKillMe': true,
                   'developer': {
                     'name': 'ZeptoLab',
                     'url': 'http://cuttherope.ie'
                   },
                   'icons': {
                     '120': '/style/icons/CutTheRope.png'
                   }
                 }
               },
               { // wikipedia
                 'installOrigin': 'http://www.wikipedia.org/',
                 'origin': 'http://en.m.wikipedia.org/',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Wikipedia',
                   'description': 'Wikipedia Mobile Application',
                   'launch_path': '/',
                   'developer': {
                     'name': 'Wikipedia',
                     'url': 'http://www.wikipedia.org/'
                   },
                   'icons': {
                     '120': '/style/icons/Wikipedia.png'
                   }
                 }
               },
               { // CNN
                 'installOrigin': 'http://m.cnn.com/',
                 'origin': 'http://m.cnn.com/',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'CNN',
                   'description': 'CNN Mobile Application',
                   'launch_path': '/',
                   'developer': {
                     'name': 'CNN',
                     'url': 'http://www.cnn.com/'
                   },
                   'icons': {
                     '120': '/style/icons/CNN.png'
                   }
                 }
               },
               { // BBC
                 'installOrigin': 'http://m.bbc.co.uk/',
                 'origin': 'http://m.bbc.co.uk/',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'BBC',
                   'description': 'BBC Mobile Application',
                   'launch_path': '/',
                   'developer': {
                     'name': 'BBC',
                     'url': 'http://www.bbc.co.uk/'
                   },
                   'icons': {
                     '120': '/style/icons/BBC.png'
                   }
                 }
               },
               { // NY Times
                 'installOrigin': 'http://www.nytimes.com/',
                 'origin': 'http://m.nytimes.com/',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'NY Times',
                   'description': 'NY Times Mobile Application',
                   'launch_path': '/',
                   'developer': {
                     'name': 'NY Times',
                     'url': 'http://www.nytimes.com/'
                   },
                   'icons': {
                     '120': '/style/icons/NYT.png'
                   }
                 }
               },
               { // Calculator
                 'installOrigin': 'http://gaiamobile.org:8888',
                 'origin': '../calculator',
                 'receipt': null,
                 'installTime': 1323339869000,
                 manifest: {
                   'name': 'Calculator',
                   'description': 'Gaia Settings',
                   'launch_path': '/calculator.html',
                   'developer': {
                     'name': 'The Gaia Team',
                     'url': 'https://github.com/andreasgal/gaia'
                   },
                   'icons': {
                     '120': '/style/icons/Calculator.png'
                   }
                 }
               }
];

