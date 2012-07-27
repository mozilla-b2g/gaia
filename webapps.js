/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
'use strict';

navigator.mozApps = {
  'mgmt': {
    'getAll': function() {
      var DOMRequest = {};
      setTimeout(function() {
        if (!DOMRequest.onsuccess)
          return;

        var installedApps = [];
        for (var app in apps) {
        
          var manifest = apps[app];
          manifest.name = app;

          var icon = document.location.pathname.split('/');
          icon.pop();
          icon = document.location.protocol + icon.join('/');
          icon += '/style/icons/' + app[0].toUpperCase() + app.slice(1) + '.png';

          manifest.icons = {
            '120': icon
          }

          installedApps.push({
            'origin': apps[app].origin,
            'manifest': manifest
          });
        }

        DOMRequest.onsuccess({
          'target': {
            'result': installedApps
          }
        });
      }, 20);

      return DOMRequest;
    }
  }
}

if (document.location.protocol === 'file:') {
  var rootPath = document.location.pathname.split('/');
  rootPath.pop();
  rootPath.pop();
  rootPath = document.location.protocol + rootPath.join('/');
  rootPath = rootPath + '/%%%/index.html';
} else {
  var host = document.location.host;
  var domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2');
  var rootPath = 'http://%%%.' + domain + '/';
}

var apps = {
  "browser": {
    "origin": rootPath.replace('%%%', 'browser'),
    "installOrigin": "http://browser.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://browser.localhost.org:8080/manifest.webapp"
  },
  "calculator": {
    "origin": rootPath.replace('%%%', 'calculator'),
    "installOrigin": "http://calculator.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://calculator.localhost.org:8080/manifest.webapp"
  },
  "camera": {
    "origin": rootPath.replace('%%%', 'calculator'),
    "installOrigin": "http://camera.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://camera.localhost.org:8080/manifest.webapp"
  },
  "clock": {
    "origin": rootPath.replace('%%%', 'clock'),
    "installOrigin": "http://clock.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://clock.localhost.org:8080/manifest.webapp"
  },
  "crystalskull": {
    "origin": rootPath.replace('%%%', 'crystalskull'),
    "installOrigin": "http://crystalskull.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://crystalskull.localhost.org:8080/manifest.webapp"
  },
  "cubevid": {
    "origin": rootPath.replace('%%%', 'cubevid'),
    "installOrigin": "http://cubevid.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://cubevid.localhost.org:8080/manifest.webapp"
  },
  "cuttherope": {
    "origin": rootPath.replace('%%%', 'cuttherope'),
    "installOrigin": "http://cuttherope.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://cuttherope.localhost.org:8080/manifest.webapp"
  },
  "dialer": {
    "origin": rootPath.replace('%%%', 'dialer'),
    "installOrigin": "http://dialer.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://dialer.localhost.org:8080/manifest.webapp"
  },
  "gallery": {
    "origin": rootPath.replace('%%%', 'gallery'),
    "installOrigin": "http://gallery.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://gallery.localhost.org:8080/manifest.webapp"
  },
  "market": {
    "origin": rootPath.replace('%%%', 'market'),
    "installOrigin": "http://market.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://market.localhost.org:8080/manifest.webapp"
  },
  "music": {
    "origin": rootPath.replace('%%%', 'music'),
    "installOrigin": "http://music.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://music.localhost.org:8080/manifest.webapp"
  },
  "penguinpop": {
    "origin": rootPath.replace('%%%', 'penguinpop'),
    "installOrigin": "http://penguinpop.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://penguinpop.localhost.org:8080/manifest.webapp"
  },
  "settings": {
    "origin": rootPath.replace('%%%', 'settings'),
    "installOrigin": "http://settings.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://settings.localhost.org:8080/manifest.webapp"
  },
  "sms": {
    "origin": rootPath.replace('%%%', 'sms'),
    "installOrigin": "http://sms.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://sms.localhost.org:8080/manifest.webapp"
  },
  "tasks": {
    "origin": rootPath.replace('%%%', 'tasks'),
    "installOrigin": "http://tasks.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://tasks.localhost.org:8080/manifest.webapp"
  },
  "template": {
    "origin": rootPath.replace('%%%', 'template'),
    "installOrigin": "http://template.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://template.localhost.org:8080/manifest.webapp"
  },
  "test-agent": {
    "origin": rootPath.replace('%%%', 'test-agent'),
    "installOrigin": "http://test-agent.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://test-agent.localhost.org:8080/manifest.webapp"
  },
  "towerjelly": {
    "origin": rootPath.replace('%%%', 'towerjelly'),
    "installOrigin": "http://towerjelly.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://towerjelly.localhost.org:8080/manifest.webapp"
  },
  "uitest": {
    "origin": rootPath.replace('%%%', 'uitest'),
    "installOrigin": "http://uitest.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://uitest.localhost.org:8080/manifest.webapp"
  },
  "video": {
    "origin": rootPath.replace('%%%', 'video'),
    "installOrigin": "http://video.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://video.localhost.org:8080/manifest.webapp"
  },
  "pdfjs": {
    "origin": rootPath.replace('%%%', 'pdfjs'),
    "installOrigin": "http://pdfjs.localhost.org:8080",
    "receipt": null,
    "installTime": 132333986000,
    "manifestURL": "http://pdfjs.localhost.org:8080/manifest.webapp"
  }
}
})();
