'use strict';

/**
 * Download Item helper.
 * Creates and updates the DOM needed to render a download as a list item.
 *
 * Usage:
 *   var li = DownloadItem.create(download);
 *
 * Once you got the reference, you can attach event listeners or update the
 * content explicitely if you know the download has been modified:
 *   DownloadItem.update(li, download);
 *
 * This helper requires some l10n resources, make sure to import them:
 *   <link type="application/l10n" href="shared/locales/download.ini">
 */

var DownloadItem = (function DownloadItem() {

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

    var label = document.createElement('label');
    label.classList.add('pack-checkbox');
    var checkBox = document.createElement('input');
    checkBox.setAttribute('type', 'checkbox');
    checkBox.value = getDownloadId(download);

    var span = document.createElement('span');

    label.appendChild(checkBox);
    label.appendChild(span);


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

    li.appendChild(label);
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
    updateContent(domNodes, download);

    return domElement;
  };

  // Update the content of the elements according to the download
  // status
  // @param {Object of DOM Element} Dictionary containing the DOM
  //   elements accesible by name
  // @param {DomDownload} Download object
  var updateContent = function updateContent(domNodes, download) {
    var _ = navigator.mozL10n.get;
    var state = getDownloadState(download);
    if (state === 'downloading') {
      domNodes['progress'].value =
        DownloadFormatter.getPercentage(download);

      navigator.mozL10n.localize(domNodes['info'], 'partialResult', {
        partial: DownloadFormatter.getDownloadedSize(download),
        total: DownloadFormatter.getTotalSize(download)
      });

    } else {
      var status = '';
      switch (state) {
        case 'stopped':
        case 'failed':
          status = _('download-' + state);
          break;
        case 'succeeded':
          status = DownloadFormatter.getTotalSize(download);
          break;
      }
      DownloadFormatter.getDate(download, function(date) {
        navigator.mozL10n.localize(domNodes['info'], 'summary', {
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

    var asides = domElement.querySelectorAll('aside');
    domNodes['asideStatus'] = domElement.querySelector('aside:not(pack-end)');
    domNodes['asideAction'] = domElement.querySelector('aside.pack-end');

    domNodes['progress'] = domElement.getElementsByTagName('progress')[0];

    // Should never change with current UI specs
    domNodes['fileName'] = domElement.querySelector('p.fileName');

    domNodes['info'] = domElement.querySelector('p.info');

    return domNodes;
  };

  // TODO: Keep this function until the api returns valid dom id
  // values on the id field.
  var getDownloadId = function getDownloadId(download) {
    return DownloadFormatter.getUUID(download);
  };

  var getDownloadState = function getDownloadState(download) {
    var state = download.state;

    if (state === 'stopped' && download.error !== null) {
      state = 'failed';
    }

    return state;
  };

  return {
    'create': create,
    'refresh': update,
    'getDownloadId': getDownloadId
  };

}());
