'use strict';
/* global Folder, navigator, MockL10n, document, MocksHelper,
   XScrollable, MozActivity, SpatialNavigator, CardManager, MessageHandler,
   Home, SearchBar, FilterManager, Edit, Utils, Application, MockMozActivity */

require('/bower_components/evt/index.js');
require('/shared/js/uuid.js');
require('/shared/js/smart-screen/cards/card.js');
require('/shared/js/smart-screen/cards/application.js');
require('/shared/js/smart-screen/cards/deck.js');
require('/shared/js/smart-screen/cards/folder.js');
require('/shared/js/smart-screen/clock.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('mock_card_manager.js');
require('mock_search_bar.js');
require('mock_menu_group.js');
require('mock_message_handler.js');
require('mock_x_scrollable.js');
require('mock_card_filter.js');
require('mock_edit.js');
require('mock_animations.js');
require('mock_utils.js');
require('mock_filter_manager.js');
require('/shared/test/unit/mocks/smart-screen/mock_spatial_navigator.js');
require('/shared/test/unit/mocks/smart-screen/mock_key_navigation_adapter.js');
require('/shared/test/unit/mocks/mock_l10n.js');
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
  'FilterManager'
]).init();

suite('home', function() {
  var realL10n = navigator.mozL10n;
  var realMozActivity = window.MozActivity;
  var searchButton, settingsButton, editButton, timeElem;
  var filterTabGroup, filterAllButton;
  var settingsGroup;
  var subject;
  var fakeTimer;

  mocksHelperForHomeTest.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    searchButton = document.createElement('button');
    searchButton.id = 'search-button';
    document.body.appendChild(searchButton);

    settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    document.body.appendChild(settingsButton);

    editButton = document.createElement('button');
    editButton.id = 'edit-button';
    document.body.appendChild(editButton);

    timeElem = document.createElement('div');
    timeElem.id = 'time';
    document.body.appendChild(timeElem);

    filterTabGroup = document.createElement('menu-group');
    filterTabGroup.once = function() {};
    filterTabGroup.open = function() {};
    filterTabGroup.close = function() {};
    filterTabGroup.id = 'filter-tab-group';
    filterAllButton = document.createElement('smart-button');
    filterAllButton.id = 'filter-all-button';
    filterTabGroup.appendChild(filterAllButton);
    document.body.appendChild(filterTabGroup);

    settingsGroup = document.createElement('settings-group');
    settingsGroup.once = function() {};
    settingsGroup.open = function() {};
    settingsGroup.close = function() {};
    settingsGroup.id = 'settings-group';
    document.body.appendChild(settingsGroup);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.removeChild(searchButton);
    document.body.removeChild(settingsButton);
    document.body.removeChild(editButton);
    document.body.removeChild(timeElem);
    document.body.removeChild(filterTabGroup);

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
    subject.edit = new Edit();
    subject.cardListElem = document.createElement('div');
    subject.spatialNavigator.m_focusedElement = document.createElement('div');
    subject.isNavigable = true;
    subject.settingsButton = settingsButton;
    subject.editButton = editButton;
    subject.searchButton = searchButton;
    subject.settingsGroup = settingsGroup;

    fakeTimer = this.sinon.useFakeTimers();
    window.MozActivity = MockMozActivity;
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

      test('should set focus back on current focused element',
      function(done) {
        subject.spatialNavigator.focus = done;
        subject.onVisibilityChange();
        assert.isTrue(Utils.holdFocusForAnimation.calledOnce);
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

      test('should reset filter', function() {
        var spy = this.sinon.spy(subject.filterManager, 'resetFilter');
        subject.onVisibilityChange();
        assert.isTrue(spy.calledOnce);
      });
    });
  });

  suite('initClock >', function() {
    test('should set time after time elapsed', function() {
      subject.initClock();
      var stub = this.sinon.stub(subject, 'updateClock');
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

    test('should toggle edit mode on edit button', function() {
      subject.handleFocus(editButton);

      subject.edit.toggleEditMode = this.sinon.stub();
      subject.onEnter();
      assert.isTrue(subject.edit.toggleEditMode.calledOnce);
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

    test('should switch focus to next focus for normal target', function() {
      var spy = this.sinon.spy(editButton, 'focus');
      subject.handleFocus(subject.editButton);
      assert.isTrue(spy.calledOnce);
    });

    test('should open menu for menu group target', function() {
      var stub = this.sinon.stub(subject, 'handleFocusMenuGroup');
      subject.handleFocus(filterTabGroup);
      assert.isTrue(stub.calledOnce);
    });

    test('should call checkFocusedGroup for non-menu elements', function() {
      var stub = this.sinon.stub(subject, 'checkFocusedGroup');
      subject.handleFocus(settingsButton);
      assert.isTrue(stub.withArgs(settingsButton).calledOnce);
    });
  });

  suite('checkFocusedGroup >', function() {
    test('should close group menu when blur', function() {
      subject.handleFocusMenuGroup(filterTabGroup);
      var stub = this.sinon.stub(filterTabGroup, 'close');
      subject.checkFocusedGroup();
      assert.isTrue(stub.calledOnce);
    });

    test('should keep settings menu open when switching back from edit mode',
    function() {
      subject.handleFocusMenuGroup(settingsGroup);
      var stub = this.sinon.stub(settingsGroup, 'close');
      subject.edit.mode = 'edit';
      subject.handleFocus(subject.cardScrollable);
      subject.checkFocusedGroup(settingsGroup);
      assert.isFalse(stub.called);

      subject.edit.mode = '';
      subject.handleFocus(settingsGroup);
      subject.checkFocusedGroup(settingsGroup);
      assert.isFalse(stub.called);
    });
  });

  // TODO: Test items:
  //   handleFocusMenuGroup >
  //     should switch navigable target to child elements of menu on open
  //     should switch navigable target back to menu iteslf on close
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
