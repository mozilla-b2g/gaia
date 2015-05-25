'use strict';
/* jshint browser: true */
/* global EPGController, MocksHelper */

require('/bower_components/evt/index.js');
require('/shared/test/unit/mocks/smart-screen/mock_channel_manager.js');
require('/js/epg_controller.js');

var mocksHelper = new MocksHelper([
  'ChannelManager'
]).init();

suite('tv-epg/epg_controller', function() {
  var epgController;

  mocksHelper.attachTestHelpers();

  setup(function() {
    epgController = new EPGController(4, 30 * 60000);
  });

  suite('_onScanned', function() {
    var fetchPrograms;
    var _createChannelList;

    setup(function() {
      fetchPrograms = this.sinon.stub(epgController, 'fetchPrograms');
      _createChannelList = this.sinon.stub(epgController, '_createChannelList');
    });

    test('_createChannelList should be called', function() {
      epgController._onScanned();
      assert.isTrue(_createChannelList.called);
    });
  });

  suite('fetchPrograms', function() {
    var mockPrograms;
    setup(function() {
      mockPrograms = [{
        startTime: -2 * epgController.timelineUnit,
        duration: 4 * epgController.timelineUnit
      }, {
        startTime: 2 * epgController.timelineUnit,
        duration: 4 * epgController.timelineUnit
      }, {
        startTime: 6 * epgController.timelineUnit,
        duration: 4 * epgController.timelineUnit
      }];
      epgController.timelineOffset = 0;
      this.sinon.stub(epgController.channelManager, 'getSource').returns({
        channels: [
          {
            channel: {
              getPrograms: function() {
                return {
                  then: function(callback) {
                    callback(mockPrograms);
                  }
                };
              }
            }
          }
        ]
      });
    });

    test('Eight timeslot should be created in programTable', function() {
      epgController.programTable = [];
      epgController.fetchPrograms(-4, 8);
      assert.equal(epgController.programTable.length, 8);
      assert.equal(epgController.totalTimeslotCount, 8);
    });

    test('Eight timeslot should be created in programTable', function() {
      epgController.programTable = [];
      epgController.fetchPrograms(-4, 8);
      assert.equal(epgController.programTable.length, 8);
      assert.equal(epgController.totalTimeslotCount, 8);
    });

    test('fetchPrograms from 0 to 8', function() {
      epgController.programTable = [];
      epgController.fetchPrograms(0, 8);

      var answers = [{
        program: mockPrograms[0],
        duration: 2
      }, {
        program: mockPrograms[0],
        duration: 1
      }, {
        program: mockPrograms[1],
        duration: 4
      }, {
        program: mockPrograms[1],
        duration: 3
      }, {
        program: mockPrograms[1],
        duration: 2
      }, {
        program: mockPrograms[1],
        duration: 1
      }, {
        program: mockPrograms[2],
        duration: 2
      }, {
        program: mockPrograms[2],
        duration: 1
      }];
      var i;
      for(i = 0; i < epgController.programTable.length; i++) {
        assert.equal(
          epgController.programTable[i][0].program, answers[i].program);
      }
    });

    test('fetchPrograms from 0 to 2 and then -2 to 7', function() {
      epgController.programTable = [];
      epgController.fetchPrograms(0, 2);
      epgController.fetchPrograms(-2, 7);

      var answers = [{
        program: mockPrograms[0],
        duration: 4
      }, {
        program: mockPrograms[0],
        duration: 3
      }, {
        program: mockPrograms[0],
        duration: 2
      }, {
        program: mockPrograms[0],
        duration: 1
      }, {
        program: mockPrograms[1],
        duration: 3
      }, {
        program: mockPrograms[1],
        duration: 2
      }, {
        program: mockPrograms[1],
        duration: 1
      }];

      assert.equal(epgController.programTable.length, 7);
      assert.equal(epgController.totalTimeslotCount, 7);
      var i;
      for(i = 0; i < epgController.programTable.length; i++) {
        assert.equal(
          epgController.programTable[i][0].program, answers[i].program);
      }
    });
  });
});
