/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global MocksHelper */
/* global MockSdCard */
/* global Mockutils */
/* global SdManager */

require('/shared/test/unit/mocks/mock_sdcard.js');
require('/shared/test/unit/mocks/mock_vcard_parser.js');
requireApp('ftu/test/unit/mock_ui_manager.js');
requireApp('ftu/test/unit/mock_utils.js');
requireApp('ftu/js/memcard_manager.js');

if (!window.utils) { window.utils = null; }

var mocksHelperForSdCardImport = new MocksHelper([
  'utils',
  'UIManager',
  'VCFReader'
]).init();

suite('Import contacts from SD card >', () => {

  var mocksHelper = mocksHelperForSdCardImport;

  var realUtils;
  var showSpy;
  var showMenuSpy;

  suiteSetup(() => {
    mocksHelper.suiteSetup();

    realUtils = window.utils;
    window.utils = Mockutils;
    window.utils.sdcard = MockSdCard;
    window.utils.misc = {
      getTimestamp: function(element, cb) {
        if (typeof cb === 'function') {
          cb();
        }
      },
      setTimestamp: function(time, cb) {
        if (typeof cb === 'function') {
          cb();
        }
      }
    };
    window.utils.status = {
      show: function() {}
    };
  });

  suiteTeardown(() => {
    mocksHelper.suiteTeardown();
  });

  setup(() => {
    mocksHelper.setup();

    showSpy = this.sinon.spy(window.utils.status, 'show');
    showMenuSpy = this.sinon.spy(window.utils.overlay, 'showMenu');
  });

  teardown(() => {
    mocksHelper.teardown();

    showSpy.restore();
    showMenuSpy.restore();
  });

  test('Integrity', () => {
    assert.ok(SdManager);
  });

  test('SD import success', done => {
    SdManager.importContacts().then(() => {
      assert.ok(showMenuSpy.calledOnce);
      assert.ok(showSpy.calledOnce);
      assert.ok(showSpy.calledWith({
        id: 'memoryCardContacts-imported3',
        args: {
          n: 1
        }
      }));
      done();
    }).catch(error => {
      assert.ok(false, 'Unexpected error ' + error);
    });
  });

  test('SD import failed - no files to import', done => {
    MockSdCard.failOnRetrieveFiles = true;
    SdManager.importContacts().then(() => {
      assert.ok(false, 'Unexpected success');
    }).catch(() => {
      assert.ok(showMenuSpy.calledOnce);
      assert.ok(showSpy.notCalled);
      done();
    });
  });
});
