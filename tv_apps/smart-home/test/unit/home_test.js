'use strict';
/* global Folder, MockL10n, document, MocksHelper,
   XScrollable, MozActivity, SpatialNavigator, CardManager, MessageHandler,
   Home, SearchBar, FilterManager, Edit, Application, MockMozActivity,
   CardPicker, FTEWizard */

require('/bower_components/evt/index.js');
require('/shared/js/uuid.js');
require('/shared/js/smart-screen/cards/card.js');
require('/shared/js/smart-screen/cards/application.js');
require('/shared/js/smart-screen/cards/deck.js');
require('/shared/js/smart-screen/cards/folder.js');
require('/shared/js/smart-screen/cards/app_bookmark.js');
require('/shared/js/smart-screen/clock.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('mock_card_manager.js');
require('mock_search_bar.js');
require('mock_message_handler.js');
require('mock_x_scrollable.js');
require('mock_card_filter.js');
require('mock_edit.js');
require('mock_animations.js');
require('mock_utils.js');
require('mock_filter_manager.js');
require('mock_card_picker.js');
require('mock_card_util.js');
require('/shared/test/unit/mocks/smart-screen/mock_spatial_navigator.js');
require('/shared/test/unit/mocks/smart-screen/mock_key_navigation_adapter.js');
require('/shared/test/unit/mocks/smart-screen/mock_f_t_e_wizard.js');
require('/shared/test/unit/mocks/mock_l20n.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/tv_apps/smart-home/js/home.js');

var mocksHelperForHomeTest = new MocksHelper([
  'CardManager',
  'CardFilter',
  'SearchBar',
  'MessageHandler',
  'XScrollable',
  'SpatialNavigator',
  'KeyNavigationAdapter',
  'Animations',
  'Edit',
  'MozActivity',
  'Utils',
  'FilterManager',
  'FTEWizard',
  'CardPicker',
  'CardUtil'
]).init();

suite('home', function() {
  var realL10n = document.l10n;
  var realMozActivity = window.MozActivity;
  var searchButton, settingsButton, timeElem;
  var subject;
  var fakeTimer;

  mocksHelperForHomeTest.attachTestHelpers();

  suiteSetup(function() {
    realL10n = document.l10n;
    document.l10n = MockL10n;

    searchButton = document.createElement('button');
    searchButton.id = 'search-button';
    document.body.appendChild(searchButton);

    settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    document.body.appendChild(settingsButton);

    timeElem = document.createElement('div');
    timeElem.id = 'time';
    document.body.appendChild(timeElem);
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
    document.body.removeChild(searchButton);
    document.body.removeChild(settingsButton);
    document.body.removeChild(timeElem);
  });

  setup(function() {
    subject = new Home();
    subject.cardScrollable = new XScrollable();
    subject.folderScrollable = new XScrollable();
    subject.messageHandler = new MessageHandler();
    subject.spatialNavigator = new SpatialNavigator();
    subject.cardManager = new CardManager();
    subject.searchBar = new SearchBar();
    subject.filterManager = new FilterManager();
    subject._fteWizard = new FTEWizard();
    subject.edit = new Edit();
    subject._cardPicker = new CardPicker();
    subject.cardListElem = document.createElement('div');
    subject.spatialNavigator.m_focusedElement = document.createElement('div');
    subject.isNavigable = true;
    subject.settingsButton = settingsButton;
    subject.searchButton = searchButton;

    fakeTimer = this.sinon.useFakeTimers();
    window.MozActivity = MockMozActivity;

    if (!Intl.DateTimeFormat.prototype.formatToParts) {
      Intl.DateTimeFormat.prototype.formatToParts = function(now) {
        return [
          {type: 'hour', value: '12'},
          {type: 'minute', value: '25'},
          {type: 'dayPeriod', value: 'AM'}
        ];
      };
    }
  });

  teardown(function() {
    window.MozActivity = realMozActivity;
  });

  suite('visibilityChange > ', function() {
    suite('visible > ', function() {
      setup(function() {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writeable: true,
          configurable: true
        });
      });

      test('should start activity', function(done) {
        subject.messageHandler.resumeActivity = done;
        subject.onVisibilityChange();
      });
    });

    suite('invisible > ', function() {
      setup(function() {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writeable: true,
          configurable: true
        });
      });

      test('should stop activity when invisible', function() {
        var spy = this.sinon.spy(subject.messageHandler, 'stopActivity');
        subject.onVisibilityChange();
        assert.isTrue(spy.calledOnce);
      });
    });
  });

  suite('initClock >', function() {
    test('should set time after time elapsed', function() {
      var stub = this.sinon.stub(subject, 'updateClock');
      subject.initClock();
      fakeTimer.tick(1000);
      assert.isTrue(stub.calledOnce);
    });
  });

  suite('onCardInserted >', function() {
    test('should insert a card into scrollable', function() {
      var card1 = new Folder({});
      var card2 = new Folder({});
      var stub = this.sinon.stub();
      var testCase1 = stub.withArgs(sinon.match.truthy, 0);
      var testCase2 = stub.withArgs(sinon.match.truthy, 1);
      subject.cardScrollable.insertNodeBefore = stub;

      subject.onCardInserted(subject.cardScrollable, card1, 0);
      assert.isTrue(testCase1.calledOnce);
      assert.isFalse(testCase2.calledOnce);
      subject.onCardInserted(subject.cardScrollable, card2, 1);
      assert.isTrue(testCase2.calledOnce);
    });
  });

  suite('onCardRemoved >', function() {
    test('should remove specified cards from scrollable', function() {
      var stub = this.sinon.stub();
      subject.cardScrollable.removeNodes = stub;
      subject.onCardRemoved(subject.cardScrollable, [0, 1]);
      assert.isTrue(stub.withArgs([0, 1]).calledOnce);
    });
  });

  suite('onMove >', function() {
    test('should ask spatial navigator for next focus on non-scrollable target',
    function() {
      subject.spatialNavigator.m_focusedElement = document.createElement('div');
      var stub = this.sinon.stub();
      subject.spatialNavigator.move = stub;
      subject.onMove('left');
      assert.isTrue(stub.calledWith('left'));
    });

    test('should ask scrollable to move its focus on scrollable target',
    function() {
      var scrollable = new XScrollable();
      scrollable.move = this.sinon.stub();
      scrollable.move.returns(true);
      subject.spatialNavigator.m_focusedElement = scrollable;
      subject.onMove('right');
      assert.isTrue(scrollable.move.calledWith('right'));
    });

    test('should ask scrollable to move its focus on scrollable target, but ' +
    'fall-back to spatial navigator when scrollable didn\'t handle it',
    function() {
      var scrollable = new XScrollable();
      scrollable.move = this.sinon.stub();
      scrollable.move.returns(false);
      subject.spatialNavigator.m_focusedElement = scrollable;
      var spatialNavigatorMoveStub = this.sinon.stub();
      subject.spatialNavigator.move = spatialNavigatorMoveStub;
      subject.onMove('up');
      assert.isTrue(scrollable.move.calledWith('up'));
      assert.isTrue(spatialNavigatorMoveStub.calledWith('up'));
    });

    // TODO: add case
    // 'should bypass logic of onMove if edit.onMove returns true'
  });

  suite('onEnter >', function() {
    test('should open settings on settings button', function() {
      subject.handleFocus(settingsButton);

      assert.equal(MozActivity.calls.length, 0);
      subject.onEnter();
      assert.equal(MozActivity.calls[0].name, 'configure');
    });

    test('should launch application on card ', function() {
      var testCard = document.createElement('div');
      testCard.dataset.cardId = '123';

      var testApp = new Application({});
      testApp.launch = this.sinon.stub();
      subject.cardManager.m_card['123'] = testApp;

      subject.handleFocus(testCard);
      subject.onEnter();
      assert.isTrue(testApp.launch.calledOnce);
    });

    // TODO: add case
    // 'should bypass logic of onEnter if edit.onEnter returns true'
  });

  suite('onSearchBarShown >', function() {
    setup(function() {
      this.sinon.stub(document, 'addEventListener')
        .withArgs('visibilitychange').callsArg(1);
      subject.searchBar.hide = this.sinon.stub();
    });

    test('should fire search activity', function() {
      assert.equal(MozActivity.calls.length, 0);
      subject.onSearchBarShown();
      assert.equal(MozActivity.calls[0].name, 'search');
    });

    test('should hide search bar after visibility has changed', function(done) {
      subject.searchBar.hide = function() {
        assert.isTrue(true);
        done();
      };
      subject.onSearchBarShown();
    });
  });

  suite('onSearchBarHidden >', function() {
    test('should show search button again', function() {
      searchButton.classList.add('hidden');
      subject.onSearchBarHidden();
      assert.isFalse(searchButton.classList.contains('hidden'));
    });
  });

  suite('handleFocus >', function() {
    test('should switch focus to scrollable target', function() {
      var spy = this.sinon.spy(subject.cardScrollable, 'focus');
      subject.handleFocus(subject.cardScrollable);
      assert.isTrue(spy.calledOnce);
    });

    test('should call checkFocusedGroup for non-menu elements', function() {
      var stub = this.sinon.stub(subject, 'checkFocusedGroup');
      subject.handleFocus(settingsButton);
      assert.isTrue(stub.withArgs(settingsButton).calledOnce);
    });
  });

  // TODO: Test items:
  //   handleScrollableItemFocus >
  //     should focus specified item of scrollable
  //   handleScrollableItemUnfocus >
  //     should blur specified item of scrollable
  //   openSettings >
  //     should launch configure activity
  //   updateClock >
  //     should update clock display
  //   restartClock >
  //     should stop and start clock display again
});
