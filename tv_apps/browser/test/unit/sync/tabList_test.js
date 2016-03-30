/* global expect */
/* global loadBodyHTML */
/* global FirefoxSyncTabList */

'use strict';

require('/shared/test/unit/load_body_html_helper.js');


var tabGenerator = (deviceNumber, tabNumber, done) => {
  function createDevice (deviceId) {
    var id = `FXSYNCID_0${deviceId}`,
        clientName = `client${deviceId}`,
        timestamp = Date.now(),
        tabs = [];
    return { id, clientName, timestamp, tabs };
  }

  function createTab (tabId) {
    var title = `Mozilla Firefox Web Browser — — 0${tabId}`,
        urlHistory = [
          'https://www.mozilla.org/en-US/firefox/44.0.2/firstrun/'
        ],
        icon = '',
        lastUsed = Date.now();
    return { title, urlHistory, icon, lastUsed };
  }

  var tabData = [];

  for (var deviceId = 0; deviceId < deviceNumber; deviceId++) {
    let deviceObj = createDevice(deviceId);
    for (var tabId = 0; tabId < tabNumber; tabId++) {
      deviceObj.tabs.push(createTab(tabId));
    }
    tabData.push(deviceObj);
  }

  done(tabData);
};

suite('Sync tabNavigation >', function() {
  var subject;

  suiteSetup(function(done) {
    loadBodyHTML('sync/fixtures/defaultContentView.html');

    require('/tv_apps/browser/js/sync/tabList.js').then(() => {
      subject = FirefoxSyncTabList;
      done();
    });
  });

  suite('Initial state', function() {
    test('Integrity', function() {
      expect(subject).to.be.an('object');
    });
  });

  suite('render list', function() {
    test('render with no sync device', function() {
      subject.update([]);
      expect(subject.isDisplayNoTabView()).to.be.equal(true);
    });

    test('render with no sync devices but no tab', function() {
      const deviceNumber = 2;
      const tabNumber = 0;

      tabGenerator(deviceNumber, tabNumber, tabData => {
        subject.update(tabData);
        expect(subject.isDisplayNoTabView()).to.be.equal(true);
      });
    });

    test('render with sync devices and tabs', function() {
      const deviceNumber = 2;
      const tabNumber = 2;

      tabGenerator(deviceNumber, tabNumber, tabData => {
        subject.update(tabData);
        expect(subject.isDisplayNoTabView()).to.be.equal(false);
      });
    });
  });

  suite('folder operation', function() {
    const deviceNumber = 2;
    const tabNumber = 2;

    suiteSetup(function() {
      tabGenerator(deviceNumber, tabNumber, tabData => {
        subject.update(tabData);
      });
    });


    test('expand folder item', function() {
      subject.openFolderItem(subject.currentFocusItem);
      expect(subject.currentFocusItem.classList.contains('active'))
        .to.be.equal(true);
      expect(subject.currentFocusItem.parentNode.classList.contains('expand'))
        .to.be.equal(true);
      expect(subject.listViewEl.querySelectorAll('.list-item').length)
        .to.be.equal(deviceNumber + tabNumber);
    });

    test('collapse folder item', function() {
      subject.closeFolderItem(subject.currentFocusItem);
      expect(subject.currentFocusItem.classList.contains('active'))
        .to.be.equal(false);
      expect(subject.currentFocusItem.parentNode.classList.contains('expand'))
        .to.be.equal(false);
    });
  });
});
