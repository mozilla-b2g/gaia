'use strict';
/* jshint browser: true */
/* global MocksHelper, MockL10n, EPG */

require('/shared/test/unit/mocks/smart-screen/mock_spatial_navigator.js');
require('/shared/test/unit/mocks/smart-screen/mock_key_navigation_adapter.js');
require('/shared/test/unit/mocks/smart-screen/mock_clock.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_epg_controller.js');
require('/js/epg_program.js');
require('/js/epg.js');


var mocksHelper = new MocksHelper([
  'EPGController',
  'Clock',
  'SpatialNavigator',
  'KeyNavigationAdapter'
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
    createMockElement('progress-bar');
    createMockElement('program-list');
    createMockElement('program-title');
    createMockElement('program-detail');
    createMockElement('time-marker-container');
    createMockElement('time-marker');
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
    var programElement;

    setup(function() {
      var rowElement = document.createElement('UL');
      programElement = document.createElement('epg-program');
      rowElement.appendChild(programElement);
      epg.programListElement.appendChild(rowElement);
    });

    teardown(function() {
      epg.programListElement.innerHTML = '';
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
      assert.equal(programElement.titleElement.textContent, 'program1');
      assert.isTrue(programElement.classList.contains('hidden'));
      assert.equal(programElement.dataset.duration, '10');
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
      assert.equal(programElement.titleElement.textContent, 'program1');
      assert.isFalse(programElement.classList.contains('hidden'));
      assert.equal(programElement.dataset.duration, '10');
    });

    teardown(function() {
      epg.programListElement.innerHTML = '';
    });
  });

  suite('_allChannelFetched', function() {
    setup(function() {
      epg.epgController.channelOffset = 6;
    });

    teardown(function() {
      epg.channelListElement.style.top = null;
      epg.programListElement.style.top = null;
    });

    test('Adjust top offset', function() {
      var answer = (-6 * EPG.ROW_HEIGHT) + 'rem';
      epg._allChannelFetched();
      assert.equal(epg.channelListElement.style.top, answer);
      assert.equal(epg.programListElement.style.top, answer);
    });
  });

  suite('_onUnfocus', function() {
    test('Class focus should be removed', function() {
      var element = document.createElement('DIV');
      element.classList.add('focus');
      epg._onUnfocus(element);
      assert.isFalse(element.classList.contains('focus'));
    });
  });

  suite('_onFocus', function() {
    var fetchPrograms;
    var columnElement;
    var rowElement;

    setup(function() {
      this.sinon.stub(epg, '_setTitlePadding');
      this.sinon.stub(epg, '_displayProgramInfo');
      fetchPrograms = this.sinon.stub(epg.epgController, 'fetchPrograms')
                          .returns({
                            then: function() {
                              return {
                                catch: function() {}
                              };
                            }
                          });
      columnElement = document.createElement('epg-program');
      rowElement = document.createElement('DIV');
      rowElement.appendChild(columnElement);
      epg.visibleChannelOffset = 10;
      epg.epgController.channelOffset = 10;
      epg.initialTime = 10;
      epg.visibleTimeOffset = 10;
    });

    teardown(function() {
      epg.channelListElement.style.transform = null;
      epg.programListElement.style.transform = null;
    });

    test('Move down', function() {
      var channelAnswer = 'translateY(' + EPG.ROW_HEIGHT +
                          'rem) translateZ(0.01rem)';
      var programAnswer = 'translate(0rem, ' + EPG.ROW_HEIGHT +
                          'rem) translateZ(0.01rem)';
      rowElement.dataset.row = 9;
      epg._onFocus(columnElement);
      assert.equal(epg.visibleChannelOffset, 9);
      assert.equal(
        epg.channelListElement.style.transform, channelAnswer);
      assert.equal(
        epg.programListElement.style.transform, programAnswer);
    });

    test('Move up', function() {
      var channelAnswer = 'translateY(' + (-EPG.ROW_HEIGHT) +
                          'rem) translateZ(0.01rem)';
      var programAnswer = 'translate(0rem, ' + (-EPG.ROW_HEIGHT) +
                          'rem) translateZ(0.01rem)';
      rowElement.dataset.row = 15;
      epg._onFocus(columnElement);
      assert.equal(epg.visibleChannelOffset, 11);
      assert.equal(
        epg.channelListElement.style.transform, channelAnswer);
      assert.equal(
        epg.programListElement.style.transform, programAnswer);
    });

    test('Move left', function() {
      var timelineAnswer = 'translateX(' + (EPG.COLUMN_WIDTH) +
                           'rem) translateZ(0.01rem)';
      var programAnswer = 'translate(' + (EPG.COLUMN_WIDTH) +
                          'rem, 0rem) translateZ(0.01rem)';

      epg.epgController.timelineOffset = 4;
      columnElement.startTime = epg.visibleTimeOffset - 1;
      epg._onFocus(columnElement);
      assert.equal(
        epg.timelineElement.style.transform, timelineAnswer);
      assert.equal(
        epg.programListElement.style.transform, programAnswer);
      assert.isTrue(fetchPrograms.called);
    });

    test('Move right', function() {
      var timelineAnswer = 'translateX(' + (-EPG.COLUMN_WIDTH * 4) +
                           'rem) translateZ(0.01rem)';
      var programAnswer = 'translate(' + (-EPG.COLUMN_WIDTH * 4) +
                          'rem, 0rem) translateZ(0.01rem)';

      epg.epgController.timelineOffset = 14;
      columnElement.startTime = epg.visibleTimeOffset + 4;
      epg._onFocus(columnElement);
      assert.equal(
        epg.timelineElement.style.transform, timelineAnswer);
      assert.equal(
        epg.programListElement.style.transform, programAnswer);
      assert.isTrue(fetchPrograms.called);
    });
  });

  suite('_setTitlePadding', function() {
    var programElement;
    setup(function() {
      programElement = document.createElement('epg-program');
      programElement.startTime = 0;
      epg.visibleTimeOffset = 1;
      epg.epgController.timelineOffset = 0;
      epg.epgController.programTable = {
        1: {
          0: {
            element: programElement
          }
        }
      };
    });

    test('Clear padding-left of title element', function() {
      epg._setTitlePadding({
        setToNull: true
      });
      assert.equal(programElement.titleElement.style.paddingLeft, '');
    });

    test('Set padding-left of title element', function() {
      epg._setTitlePadding();
      assert.equal(programElement.titleElement.style.paddingLeft, '33.8rem');
    });
  });
});
