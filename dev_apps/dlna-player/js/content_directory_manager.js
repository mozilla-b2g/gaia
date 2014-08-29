/* globals plug, deviceManager */
(function(exports) {
  var DEBUG = false;
  'use strict';

  var savedServices = {};

  var debugEl;
  var avtSelector;
  var audioPlayer;
  var videoPlayer;
  var imagePlayer;
  var unknownPlayer;
  var discoverButton;
  var currentPlayer;
  var playerToggler;
  var folderList;
  var debugPanel;

  function debugLog(msg, level) {
    if (!DEBUG && level == 'debug') {
      return;
    }
    var logEl = document.createElement('div');
    logEl.textContent = msg;
    debugEl.appendChild(logEl);
  }

  function toggleFolder(evt) {
    evt.preventDefault();
    var elem = evt.target;

    if (elem.nextSibling && elem.nextSibling.tagName == 'UL') {
      // folder is opened. Close it.
      elem.parentElement.removeChild(elem.nextSibling);
      elem.classList.remove('opened');
    } else {
      // folder is closed. Open it.
      debugLog(elem.serviceId, 'debug');
      elem.classList.add('opened');
      browseFolder(
        elem.dataset.serviceId, elem.dataset.href, evt.target);
    }
  }

  function togglePlayer(value) {
    if (typeof value != 'boolean') {
      value = currentPlayer.classList.contains('hide');
    }
    audioPlayer.classList.add('hide');
    videoPlayer.classList.add('hide');
    imagePlayer.classList.add('hide');
    unknownPlayer.classList.add('hide');
    if (value) {
      currentPlayer.classList.remove('hide');
    }
  }

  function togglePanel(name) {
    if (!name) {
      name = 'main';
    }
    window.location.hash = name;
  }

  function switchPlayer(type) {
    var oldPlayer = currentPlayer;
    if (type == 'audio') {
      currentPlayer = audioPlayer;
    } else if (type == 'video') {
      currentPlayer = videoPlayer;
    } else if (type == 'image') {
      currentPlayer = imagePlayer;
    } else if (type == 'unknown') {
      currentPlayer = unknownPlayer;
    }
    if (oldPlayer != currentPlayer && currentPlayer != imagePlayer) {
      oldPlayer.src = '';
    }
    togglePlayer(true);
    togglePanel('playerPanel');
  }

  function playFile(evt) {
    evt.preventDefault();
    var fileType = evt.target.dataset.type;
    var fileProtocol = evt.target.dataset.protocol;
    var fileFormat = evt.target.dataset.mime.split('/')[1].toLowerCase();
    var avtId = avtSelector.options[avtSelector.selectedIndex].value;
    if (avtId != 'local') {
      deviceManager.play(
        avtId, evt.target.dataset.href, evt.target.dataset.res);
      return;
    }


    switchPlayer(fileType);

    currentPlayer.hidden = false;
    currentPlayer.src = evt.target.dataset.href;
    currentPlayer.oncanplay = function() {
      this.play();
    };
  }

  function detectTypeByMime(mimeText) {
    var type = mimeText.split('/')[0];
    var format = mimeText.split('/')[1];
    switch (type) {
      case 'audio':
      case 'video':
      case 'image':
        return type;
      case 'application':
        switch (format) {
          case 'ogg':
            return 'video';
          case 'octet-stream':
            return 'unknown';
        }
        break;
      default:
        return 'unknown';
    }
  }

  function escapeXML(string) {
    string = '<DIDL-Lite xmlns:dlna="urn:schemas-dlna-org:device-1-0"' +
        ' xmlns:dc="http://purl.org/dc/elements/1.1/"' +
        ' xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"' +
        ' xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">' +
        string +
        '</DIDL-Lite>';
    return string;
  }

  function browseFolder(serviceId, folderId, folderElement) {
    var mediaServer = savedServices[serviceId];
    if (!mediaServer) {
      return;
    }

    folderId = folderId || '';

    mediaServer.browse(folderId).then(function(response) {
      if (!response || !response.data) {
        return;
      }


      var data = response.data.Result;
      if (data.indexOf('xmlns:dlna') == -1) {
        data = data.replace('<DIDL-Lite ',
          '<DIDL-Lite xmlns:dlna="urn:schemas-dlna-org:device-1-0" ')
          .replace(/<unknown\>/g, '&lt;unknown&gt;');
      }
      var parser = new DOMParser();
      var serializer = new XMLSerializer();
      var xmlResponse = parser.parseFromString(data, 'application/xml');
      var lists = xmlResponse.documentElement.children;

      var sublist = document.createElement('ul');
      sublist.className = 'sublist';

      for (var i = 0; i < lists.length; i++) {
        var item = lists[i];

        var titleElem = item.getElementsByTagName('title')[0] ||
                        item.getElementsByTagName('dc:title')[0];
        var title;
        if (titleElem) {
          title = titleElem.textContent;
        }

        var newElem;
        if (item.tagName == 'container') {
          newElem = document.createElement('li');

          newElem.dataset.serviceId = serviceId;
          newElem.addEventListener('click', toggleFolder);
          newElem.dataset.href = item.getAttribute('id');
          newElem.textContent = title;
          newElem.className = 'folder';

          sublist.appendChild(newElem);
        } else if (item.tagName == 'item') {
          var linkElem = item.getElementsByTagName('res')[0];
          var link, protocol, mime;
          if (linkElem) {
            link = linkElem.textContent;
            protocol = linkElem.getAttribute('protocolInfo');
            mime = protocol.split(':')[2];
          }
          var fileType = detectTypeByMime(mime);
          newElem = document.createElement('li');
          newElem.addEventListener('click', playFile);
          newElem.dataset.mime = mime;
          newElem.dataset.protocol = protocol;
          newElem.dataset.type = fileType;
          newElem.dataset.res = escapeXML(item.outerHTML);
          newElem.dataset.href = link;
          newElem.textContent = title;
          newElem.className = fileType;
          sublist.appendChild(newElem);
        }
      }
      if (!folderElement) {
        folderList.appendChild(sublist);
      } else {
        folderElement.parentElement.
            insertBefore(sublist, folderElement.nextSibling);
      }

      debugLog(serializer.serializeToString(xmlResponse), 'debug');
    });
  }

  function remove(serviceId) {
    var serverItem = savedServices[serviceId].serverItem;
    removeSiblingList(serverItem);
    serverItem.parentElement.removeChild(serverItem);
    delete savedServices[serviceId];
  }

  function removeSiblingList(elem) {
    if (elem.nextElementSibling.classList.contains('sublist')) {
      elem.parentElement.removeChild(elem.nextElementSibling);
    }
  }

  function refresh(evt) {
    var serverItem = evt.target;
    var serviceId = serverItem.dataset.serviceId;
    serverItem.removeEventListener('click', refresh);
    serverItem.classList.remove('needRefresh');

    var service = savedServices[serviceId];
    removeSiblingList(service.serverItem);
    browseFolder(serviceId, null, service.serverItem);
  }

  function addRefreshLink(serviceId) {
    var serverItem = savedServices[serviceId].serverItem;
    serverItem.classList.add('needRefresh');
    serverItem.addEventListener('click', refresh);
  }

  function onServices(services) {
    var idx = services.length;
    services.addEventListener('servicefound', function servicefound(e) {
      for (var i = 0; i < services.length; i++) {
        console.log(services[i].id);
      }
      updateService(services[idx]);
      idx++;
    });

    debugLog(services.length + ' service' +
    (services.length !== 1 ? 's' : '') +
    ' found in the current network');

    // Remove offline services
    for (var savedServiceId in savedServices) {
      var removed = true;
      for (var i = 0; i < services.length; i++) {
        if (services[i].id == savedServiceId) {
          removed = false;
          break;
        }
      }
      if (removed) {
        remove(savedServiceId);
      }
    }

    // Update services individually
    for (var j = 0; j < services.length; j++) {
      updateService(services[j]);
    }
  }

  function updateService(service) {
    var mediaServer =
      new Plug.UPnP_ContentDirectory(service, { debug: false });

    if (!savedServices[service.id]) {
      savedServices[service.id] = mediaServer;

      // Add server node
      var serverItem = document.createElement('li');
      var serverName = mediaServer.configDocument.
        getElementsByTagName('friendlyName')[0].textContent;
      serverItem.className = 'server';
      serverItem.textContent = serverName;
      serverItem.dataset.serviceId = service.id;
      folderList.appendChild(serverItem);

      mediaServer.serverItem = serverItem;

      browseFolder(service.id, null, serverItem);
    }
  }

  function discover() {
    if (navigator.getNetworkServices) {
      debugLog('Searching for UPnP services in the current network...');
      navigator.getNetworkServices(
        'upnp:urn:schemas-upnp-org:service:ContentDirectory:1')
      .then(onServices, function(e) {
          debugLog('An error occurred obtaining UPnP Services [CODE: ' +
                    error.code + ']');
      });
    } else {
      debugLog(
          'navigator.getNetworkServices API is not supported in this browser');
    }
  }


  function init() {
    var audioToggler = document.getElementById('audioToggler');
    var videoToggler = document.getElementById('videoToggler');
    var imageToggler = document.getElementById('imageToggler');
    folderList = document.getElementById('folderList');
    debugEl = document.getElementById('debug');
    audioPlayer = document.getElementById('audioPlayer');
    videoPlayer = document.getElementById('videoPlayer');
    imagePlayer = document.getElementById('imagePlayer');
    unknownPlayer = document.getElementById('unknownPlayer');
    discoverButton = document.getElementById('discoverButton');
    avtSelector = document.getElementById('AVTList');
    directoryPage = document.getElementById('toDirectoryPage');
    toPlayerPage = document.getElementById('toPlayerPage');
    debugPanel = document.getElementById('debug');
    if (!DEBUG) {
      debugPanel.style.display = 'none';
    }


    currentPlayer = imagePlayer;
    togglePlayer(true);

    discoverButton.addEventListener('click', discover);
    directoryPage.addEventListener('click', togglePanel.bind(null, ''));
    toPlayerPage.addEventListener('click',
      togglePanel.bind(null, 'playerPanel'));

    discover();
    togglePanel();
  }

  exports.ContentDirectoryManager = {
    init: init,
    savedServices: savedServices
  };
})(window);
