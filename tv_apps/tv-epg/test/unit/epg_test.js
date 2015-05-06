'use strict';
/* jshint browser: true */
/* global MocksHelper, MockL10n, EPG */

require('/test/unit/mock_epg_controller.js');
require('/shared/test/unit/mocks/smart-screen/mock_clock.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/js/epg.js');


var mocksHelper = new MocksHelper([
  'EPGController',
  'Clock'
]).init();

suite('tv-epg/epg', function() {

  var realL10n;
  var epg;

  mocksHelper.attachTestHelpers();

  function createMockElement(id, type) {
    var element;
    element = document.createElement(type || 'div');
    element.id = id;
    document.body.appendChild(element);
    return element;
  }

  function createMockUI() {
    createMockElement('time');
    createMockElement('date');
    createMockElement('video-thumbnail', 'video');
    createMockElement('timeline');
    createMockElement('time-prefix');
    createMockElement('channel-list');
    createMockElement('program-list');
    createMockElement('program-title');
    createMockElement('program-detail');
  }

  suiteSetup(function() {
    createMockUI();
  });

  setup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;
    epg = new EPG();
    this.sinon.stub(epg, '_updateClock');
  });

  teardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  suite('_onScanned', function() {
    test('Source of video-thumbnail should be assigned', function() {
      var prefix = 'app://tv-epg.gaiamobile.org/test/unit';
      epg._onScanned('new-stream');
      assert.equal(epg.videoElement.src, prefix + '/new-stream');
    });
  });

  suite('_addTimeline', function() {
    setup(function() {
      epg.programListElement.appendChild(document.createElement('UL'));
      epg.programListElement.appendChild(document.createElement('UL'));
    });

    teardown(function() {
      epg.programListElement.innerHTML = '';
      epg.timelineElement.innerHTML = '';
    });

    test('Add one timeslot to timeline', function() {
      var time = new Date('Sat May 16 2015 19:24:55 GMT+0800 (CST)');
      epg._addTimeline(0, time.getTime());
      assert.equal(epg.timelineElement.children.length, 1);
      assert.equal(epg.programListElement.children[0].children.length, 1);
      assert.equal(epg.programListElement.children[1].children.length, 1);
    });
  });

  suite('_appendChannel', function() {
    test('Append two channels', function() {
      epg._appendChannel({
        name: 'ESPN',
        number: '10'
      });
      epg._appendChannel({
        name: 'ESPNHD',
        number: '11'
      });
      assert.equal(epg.channelListElement.children.length, 2);
      assert.equal(epg.programListElement.children.length, 2);
    });

    teardown(function() {
      epg.programListElement.innerHTML = '';
      epg.channelListElement.innerHTML = '';
    });
  });

  suite('_updateProgramSlot', function() {
    var columnElement;
    setup(function() {
      var rowElement = document.createElement('UL');
      columnElement = document.createElement('LI');
      rowElement.appendChild(columnElement);
      epg.programListElement.appendChild(rowElement);
    });

    test('Hide column', function() {
      var configs = {
        row: 0,
        column: 0,
        title: 'program1',
        isVisible: false,
        duration: 10
      };
      epg._updateProgramSlot(configs);
      assert.equal(columnElement.textContent, 'program1');
      assert.isTrue(columnElement.classList.contains('hidden'));
      assert.equal(columnElement.dataset.duration, '10');
    });

    test('Visible column with item', function() {
      var configs = {
        row: 0,
        column: 0,
        title: 'program1',
        isVisible: true,
        duration: 10
      };
      epg._updateProgramSlot(configs);
      assert.equal(columnElement.textContent, 'program1');
      assert.isFalse(columnElement.classList.contains('hidden'));
      assert.equal(columnElement.dataset.duration, '10');
    });

    teardown(function() {
      epg.programListElement.innerHTML = '';
    });
  });
});
