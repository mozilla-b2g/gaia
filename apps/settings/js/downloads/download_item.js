'use strict';

//
// Download Item helper.
// Creates and updates the dom needed to render a
// download as a list item.
// Usage:
//
// var li = DownloadItem.create(download);
//
// Once we got the reference, we can listen to click events
// or update the content if we know the download was modified:
//
// DownloadItem.update(li, download);
var DownloadItem = (function DownloadItem() {

  // Mapp the download status with the classes that the
  // different elements of a dom download item have.
  // This is a snapshot on how they should finish depending
  // on the state.
  var STATUS_MAPPING = {
    'downloading': {
      'asideStatus': ['hide'],
      'asideAction': ['actionCancel', 'pack-end'],
      'progress': []
    },
    'paused': {
      'asideStatus': ['hide'],
      'asideAction': ['actionRetry', 'pack-end'],
      'progress': ['hide']
    },
    'stopped': {
      'asideStatus': ['hide'],
      'asideAction': ['hide'],
      'progress': ['hide']
    },
    'canceled': {
      'asideStatus': ['statusError'],
      'asideAction': ['actionRetry', 'pack-end'],
      'progress': ['hide']
    }
  };

  // Helper function extract the download name from the url
  // @param {DomDownload} Download object
  var getDownloadName = function getDownloadName(download) {
    var separator = download.url.lastIndexOf('/');

    return separator > 0 ? download.url.substr(separator + 1) : download.url;
  };

  // Generates the following DOM, take into account that
  // the css needed for the classes above is in settings app:
  // downloads.css
  // @param {DomDownload} Download object to get the output from
  //
  //<li data-url="<url>" data-state="<download state>">
  //  <aside class="<statusError | >">
  //  </aside>
  //  <aside class="<actionCancel | actionRetry> pack-end"
  //      data-url="<url>">
  //  </aside>
  //  <p class="fileName">Filename.doc</p>
  //  <p class="info">57% - 4.1MB of 7MB</p>
  //  <progress value="57" max="100"></progress>
  //</li>
  var create = function create(download) {
    var li = document.createElement('li');
    li.dataset.url = download.url;
    li.dataset.state = download.state;

    var asideStatus = document.createElement('aside');

    var asideAction = document.createElement('aside');
    asideAction.classList.add('pack-end');
    asideAction.dataset.url = download.url;

    var pFileName = document.createElement('p');
    pFileName.classList.add('fileName');
    pFileName.textContent = getDownloadName(download);

    var pInfo = document.createElement('p');
    pInfo.classList.add('info');

    var progress = document.createElement('progress');
    progress.classList.add('hide');
    progress.max = 100;

    li.appendChild(asideStatus);
    li.appendChild(asideAction);
    li.appendChild(pFileName);
    li.appendChild(pInfo);
    li.appendChild(progress);

    return update(li, download);
  };

  // Given a DOM Download Item generated with the previous
  // method, update the style and the content based on the
  // given download.
  // @param {Dom Element} LI element representing the download
  // @param {DomDownload} Download object
  var update = function update(domElement, download) {
    if (download.state === 'removed') {
      // State not updateable
      return;
    }
    var styles = STATUS_MAPPING[download.state];

    if (styles == null) {
      // The only possible value is for removed, we don't have UI
      // for that
      return null;
    }

    var domNodes = getElements(domElement);
    applyStyles(domNodes, styles);
    updateContent(domNodes, download);

    return domElement;
  };

  // Update the content of the elements according to the download
  // status
  // @param {Object of DOM Element} Dictionary containing the DOM
  //   elements accesible by name
  // @param {DomDownload} Download object
  var updateContent = function updateContent(domNodes, download) {
    if (download.state === 'downloading') {
      var percentage = Math.floor(
        download.currentBytes * 100 / download.totalBytes);
      var current = download.currentBytes / 1024;
      var total = download.totalBytes / 1024;
      domNodes['progress'].value = percentage;
      domNodes['info'].textContent = percentage + '% - ' +
        current.toFixed(2) + 'MB of ' + total.toFixed(2) + 'MB';
    } else {
      //XXX: Right now the api docs don't show a timestamp for the
      // download, but we will need to ask for it
      var time = 'Just now';
      var extra = '';
      switch (download.state) {
        case 'paused':
          extra = navigator.mozL10n.get('stopped') || 'Stopped';
          break;
        case 'canceled':
          // XXX: The api doesnt have a proper download failed, just
          // canceled
          extra = navigator.mozL10n.get('donwload_failed') || 'Download failed';
          break;
        case 'stopped':
          var total = download.currentBytes / 1024;
          // XXX: Use proper measurement
          extra = total.toFixed(2) + 'MB';
          break;
      }

      domNodes['info'].textContent = time + ' - ' + extra;
    }
  };

  // Given a state mapping predefined, apply it to the dom elements
  // of the download item
  // @param {Object of DOM Element} Dictionary containing the DOM
  //   elements accesible by name
  // @param {Object} Dictionary containing what are the classes that
  //   should be on the different dom elements
  var applyStyles = function applyStyles(domElements, stateMapping) {
    var elem = null;
    Object.keys(stateMapping).forEach(function onElementName(elName) {
      elem = domElements[elName];
      if (elem === null) {
        return;
      }

      var klasses = stateMapping[elName];
      if (klasses === null) {
        return;
      }

      elem.className = '';
      klasses.forEach(function(klass) {
        elem.classList.add(klass);
      });
    });
  };

  // Get's the DOM nodes for the Download Node to apply
  // the specific style
  // @param {DOM element} Given a Download LI generated with the
  //   create method, returns in an object the different components
  //   making them accessible via name
  var getElements = function getElements(domElement) {
    var domNodes = {};

    var asides = domElement.querySelectorAll('aside');
    domNodes['asideStatus'] = domElement.querySelector('aside:not(pack-end)');
    domNodes['asideAction'] = domElement.querySelector('aside.pack-end');

    domNodes['progress'] = domElement.getElementsByTagName('progress')[0];

    // Should never change with current UI specs
    domNodes['fileName'] = domElement.querySelector('p.fileName');

    domNodes['info'] = domElement.querySelector('p.info');

    return domNodes;
  };

  return {
    'create': create,
    'update': update
  };

}());
