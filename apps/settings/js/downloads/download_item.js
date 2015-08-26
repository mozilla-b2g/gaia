/* global DownloadFormatter */
'use strict';

/**
 * Download Item helper.
 * Creates and updates the DOM needed to render a download as a list item.
 *
 * Usage:
 *   DownloadItem.create(download).then((li) => {});
 *
 * Once you got the reference, you can attach event listeners or update the
 * content explicitely if you know the download has been modified:
 *   DownloadItem.update(li, download);
 *
 * This helper requires some l10n resources, make sure to import them:
 *   <link rel="localization"
 *         href="/shared/locales/download/download.{locale}.properties">
 */

window.DownloadItem = (function DownloadItem() {

  // Generates the following DOM, take into account that
  // the css needed for the classes above is in settings app:
  // downloads.css
  // @param {DomDownload} Download object to get the output from
  //
  //<li data-url="{url}" data-state="{download.state}">
  //  <aside class="download-status">
  //  </aside>
  //  <aside class="pack-end"
  //      data-id="{download.id}">
  //  </aside>
  //  <p class="fileName">Filename.doc</p>
  //  <p class="info">57% - 4.1MB of 7MB</p>
  //  <progress value="57" max="100"></progress>
  //</li>
  var create = function create(download) {
    var id = getDownloadId(download);
    var li = document.createElement('li');
    li.dataset.url = download.url;
    li.dataset.state = getDownloadState(download);
    li.id = id;
    li.dataset.id = id;

    var checkbox = document.createElement('gaia-checkbox');
    checkbox.className = 'inline';
    checkbox.value = getDownloadId(download);

    var label = document.createElement('label');
    checkbox.appendChild(label);


    var asideStatus = document.createElement('aside');
    asideStatus.className = 'download-status';
    var asideAction = document.createElement('aside');
    asideAction.classList.add('pack-end');
    asideAction.dataset.id = id;

    var pFileName = document.createElement('p');
    pFileName.classList.add('fileName');
    pFileName.textContent = DownloadFormatter.getFileName(download);

    var pInfo = document.createElement('p');
    pInfo.classList.add('info');

    var progress = document.createElement('progress');
    progress.max = 100;

    li.appendChild(checkbox);
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
    var state = getDownloadState(download);
    var domNodes = getElements(domElement);
    // Update the state properly in the element
    domElement.dataset.state = state;
    // Update content
    return updateContent(domNodes, download).then(() => {
      return domElement;
    });

  };

  // Update the content of the elements according to the download
  // status
  // @param {Object of DOM Element} Dictionary containing the DOM
  //   elements accesible by name
  // @param {DomDownload} Download object
  var updateContent = function updateContent(domNodes, download) {
    var state = getDownloadState(download);
    if (state === 'downloading') {
      domNodes.progress.value =
        DownloadFormatter.getPercentage(download);

      return Promise.all([
        DownloadFormatter.getDownloadedSize(download),
        DownloadFormatter.getTotalSize(download)
      ]).then(([partial, total]) => {
        navigator.mozL10n.setAttributes(domNodes.info, 'partialResult', {
          partial: partial,
          total: total
        });
      });
    } else {
      var statusPromise;

      switch (state) {
        case 'stopped':
        case 'failed':
          statusPromise = navigator.mozL10n.formatValue('download-' + state);
          break;
        case 'succeeded':
          statusPromise = DownloadFormatter.getTotalSize(download);
          break;
        default:
          statusPromise = Promise.resolve();
      }
      return Promise.all([
        DownloadFormatter.getDate(download),
        statusPromise
      ]).then(function([date, status]) {
        navigator.mozL10n.setAttributes(domNodes.info, 'summary', {
          date: date,
          status: status
        });
      });
    }
  };

  // Get's the DOM nodes for the Download Node to apply
  // the specific style
  // @param {DOM element} Given a Download LI generated with the
  //   create method, returns in an object the different components
  //   making them accessible via name
  var getElements = function getElements(domElement) {
    var domNodes = {};

    domNodes.asideStatus = domElement.querySelector('aside:not(pack-end)');
    domNodes.asideAction = domElement.querySelector('aside.pack-end');
    domNodes.progress = domElement.getElementsByTagName('progress')[0];
    // Should never change with current UI specs
    domNodes.fileName = domElement.querySelector('p.fileName');
    domNodes.info = domElement.querySelector('p.info');

    return domNodes;
  };

  var getDownloadId = function getDownloadId(download) {
    // We need to use this to generate our id because datastore ids are not
    // compatible with dom element ids.
    return DownloadFormatter.getUUID(download);
  };

  var updateDownloadId = function updateDownloadId(download,
                                                   domElement) {
    // Get our new element id.
    var id = getDownloadId(download);
    // Update all the relevant instances of the item id.
    domElement.id = id;
    domElement.dataset.id = id;
    domElement.getElementsByTagName('input')[0].value = id;
  };

  var getDownloadState = function getDownloadState(download) {
    var state = download.state;

    if (state === 'stopped') {
      if (download.error !== null) {
        state = 'failed';
      } else if (!window.navigator.onLine) {
        // Remain downloading state when the connectivity was lost
        state = 'downloading';
      }
    }

    return state;
  };

  return {
    'create': create,
    'refresh': update,
    'getDownloadId': getDownloadId,
    'updateDownloadId': updateDownloadId
  };

}());
