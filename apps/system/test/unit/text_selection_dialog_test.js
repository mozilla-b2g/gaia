/* global MocksHelper, MockService, TextSelectionDialog,
          MockSettingsListener */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForTextSelectionDialog = new MocksHelper([
  'SettingsListener',
  'Service'
]).init();

suite('system/TextSelectionDialog', function() {
  var td, fragment;
  var fakeTextSelectInAppEvent;
  mocksForTextSelectionDialog.attachTestHelpers();
  var mockDetail = {};
  setup(function(done) {
    MockService.mLayoutManager_width = 360;
    MockService.mLayoutManager_height = 480;
    mockDetail = {
      type: 'selectionstatechanged',
      detail: {
        commands: {},
        rect: {},
        states: []
      },
      isCollapsed: false
    };

    requireApp('system/js/base_ui.js');

    requireApp('system/js/text_selection_dialog.js',
      function() {
        fragment = document.createElement('div');
        fragment.id = 'text-selection-dialog-root';
        document.body.appendChild(fragment);
        td = new TextSelectionDialog();
        fragment.innerHTML = td.view();
        td._isCommandSendable = true;
        done();
      }
    );

    fakeTextSelectInAppEvent = {
      type: 'mozChromeEvent',
      preventDefault: function() {},
      stopPropagation: function() {}
    };
  });

  teardown(function() {
    // navigator.mozL10n = realL10n;
    document.body.removeChild(fragment);
    fragment = null;
    td = null;
    mockDetail = {};
  });

  function verifyClickableOptions(config) {
    var lastOption;
    for (var item1 in config) {
      if(config[item1]) {
        lastOption = item1;
        mockDetail.detail.commands['can' + item1] = true;
      } else {
        mockDetail.detail.commands['can' + item1] = false;
      }
    }

    mockDetail.detail.states = ['mouseup'];
    mockDetail.detail.visible = true;

    fakeTextSelectInAppEvent.detail = mockDetail;
    td.handleEvent(fakeTextSelectInAppEvent);

    if (lastOption) {
      assert.equal(td.element.classList.contains('visible'), true,
      'dialog should display');
    } else {
      assert.equal(td.element.classList.contains('visible'), false,
      'dialog should display');
      return;
    }

    for (var item2 in config) {
      var element = td.elements[item2.toLowerCase()];
      if (config[item2]) {
        assert.equal(element.classList.contains('hidden'),
          false, 'option of ' + item2 + ' should display');
      } else {
        assert.equal(element.classList.contains('hidden'),
          true, 'option of ' + item2 + ' should be hidden');
      }
    }
    assert.equal(
      td.elements[lastOption.toLowerCase()].classList.contains('last-option'),
      true, 'last-option class should be added to the last element of array');
  }

  function emitClickEvent(ele) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('click', true, false, null);
    ele.dispatchEvent(evt);
  }

  test('switch settings value of copypaste.enabled', function() {
    var stubStart = this.sinon.stub(td, 'start');
    var stubStop = this.sinon.stub(td, 'stop');
    MockSettingsListener.mTriggerCallback('copypaste.enabled', false);
    assert.isTrue(stubStop.calledOnce);

    MockSettingsListener.mTriggerCallback('copypaste.enabled', true);
    assert.isTrue(stubStart.calledOnce);
  });

  test('_doCommand', function(done) {
    this.sinon.stub(td, 'close');
    window.addEventListener('mozContentEvent',
      function onReceiveMozContentEvent(evt) {
        window.removeEventListener('mozContentEvent', onReceiveMozContentEvent);
        assert.deepEqual(evt.detail, {
          type: 'do-command',
          cmd: 'testCommand'
        });
        done();
      });

    td._doCommand(fakeTextSelectInAppEvent, 'testCommand');
    assert.isTrue(td.close.calledOnce,
      'should call close when trigger _doCommand');
  });

  test('_doCommand, when _isCommandSendable is false', function() {
    this.sinon.stub(td, 'close');
    td._isCommandSendable = false;
    td._doCommand();
    assert.isFalse(td.close.calledOnce,
      'should not call close');
  });

  test('when user press a button and move finger out of it', function() {
    td.render();
    td._isCommandSendable = false;
    td.elements.cut.dispatchEvent(new CustomEvent('mousedown'));
    assert.isTrue(td._isCommandSendable, 'should set _isCommandSendable true' +
      ' when mousedown');
    td.elements.cut.dispatchEvent(new CustomEvent('mouseout'));
    assert.isFalse(td._isCommandSendable, 'should set _isCommandSendable' +
      ' false when mouseleave');
  });

  test('copyHandler', function() {
    var stubDoCommand = this.sinon.stub(td, '_doCommand');
    var stubResetCutOrCopiedTimer =
      this.sinon.stub(td, '_resetCutOrCopiedTimer');
    td.copyHandler(null);
    assert.isTrue(td._hasCutOrCopied);
    assert.isTrue(stubDoCommand.calledWith(null, 'copy'));
    assert.isTrue(stubResetCutOrCopiedTimer.calledOnce);
  });

  test('cutHandler', function() {
    var stubDoCommand = this.sinon.stub(td, '_doCommand');
    var stubResetCutOrCopiedTimer =
      this.sinon.stub(td, '_resetCutOrCopiedTimer');
    td.cutHandler(null);
    assert.isTrue(td._hasCutOrCopied);
    assert.isTrue(stubDoCommand.calledWith(null, 'cut'));
    assert.isTrue(stubResetCutOrCopiedTimer.calledOnce);
  });

  test('pasteHandler', function() {
    var stubDoCommand = this.sinon.stub(td, '_doCommand');
    var stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
    td._resetCutOrCopiedTimeout = 'testtimer';
    td.pasteHandler(null);
    assert.isFalse(td._hasCutOrCopied);
    assert.isTrue(stubDoCommand.calledWith(null, 'paste'));
    assert.isTrue(stubClearTimeout.calledWith(td._resetCutOrCopiedTimeout));
  });

  test('close', function() {
    td._transitionState = 'opened';
    td.render();
    var stubHide = this.sinon.stub(td, 'hide');
    this.sinon.stub(td.element, 'blur');
    this.sinon.stub(td, '_resetShortcutTimeout');
    td.close();
    assert.isTrue(stubHide.calledOnce);
    assert.isTrue(td._resetShortcutTimeout.called);
    assert.isTrue(td.element.blur.called);
  });

  test('updateDialogPosition', function() {
    td.element = document.createElement('div');
    var stubChangeTransitionState = this.sinon.stub(td,
      '_changeTransitionState');
    this.sinon.stub(td, 'calculateDialogPostion').returns(
      {top: 123, left: 321});
    td.updateDialogPosition();
    assert.equal(td.element.style.top, '123px');
    assert.equal(td.element.style.left, '321px');
    assert.isTrue(stubChangeTransitionState.calledWith('opened'));
  });

  test('_resetCutOrCopiedTimer', function() {
    var clock = this.sinon.useFakeTimers();
    td._hasCutOrCopied = true;
    td._resetCutOrCopiedTimeout = 'testTimer';
    td._resetCutOrCopiedTimer();
    
    clock.tick(td.RESET_CUT_OR_PASTE_TIMEOUT);
    assert.isFalse(td._hasCutOrCopied);
  });

  test('_resetShortcutTimeout', function() {
    td._shortcutTimeout = 'timeout';
    this.sinon.stub(window, 'clearTimeout');
    td._resetShortcutTimeout();
    assert.isTrue(window.clearTimeout.calledWith('timeout'));
    assert.isTrue(td._shortcutTimeout === null);
  });

  test('_triggerShortcutTimeout', function() {
    this.sinon.stub(td, '_resetShortcutTimeout');
    this.sinon.stub(td, 'close');
    var clock = this.sinon.useFakeTimers();

    td._triggerShortcutTimeout();
    clock.tick(td.SHORTCUT_TIMEOUT);
    assert.isTrue(td.close.called);
    assert.isTrue(td._resetShortcutTimeout.called);
  });

  suite('handleEven selectionstatechanged event', function() {
    var stubClose, stubHide, stubShow, stubRender, stubEvent;
    var testDetail;
    setup(function() {
      stubClose = this.sinon.stub(td, 'close');
      stubHide = this.sinon.stub(td, 'hide');
      stubShow = this.sinon.stub(td, 'show');
      stubRender = this.sinon.stub(td, 'render');
      stubEvent = this.sinon.stub(fakeTextSelectInAppEvent, 'preventDefault');
      testDetail = {
        visible: true,
        isCollapsed: true,
        states: ['selectAll', 'mouseup'],
        rect: {
          top: 20,
          bottom: 30,
          left: 10,
          right: 20
        },
        commands: {
          canPaste: true,
          canSelectAll: true
        }
      };

      fakeTextSelectInAppEvent.detail = {
        type: 'selectionstatechanged',
        detail: testDetail
      };
    });

    teardown(function() {
      td._hasCutOrCopied = false;
    });

    test('tap on other place, and the caret is collapsed',
      function() {
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isFalse(stubShow.calledOnce);
        assert.isTrue(stubHide.calledOnce);
      });

    test('tap the caret in collapsed mode',
      function() {
        var stubTriggerShortcutTimeout =
          this.sinon.stub(td, '_triggerShortcutTimeout');
        testDetail.states = ['taponcaret'];
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isFalse(testDetail.commands.canSelectAll);
        assert.isTrue(stubShow.calledWith(testDetail));
        assert.isTrue(stubTriggerShortcutTimeout.called);
      });

    test('copy some text and tap on other place, and the caret is collapsed',
      function() {
        td._hasCutOrCopied = true;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubShow.calledWith(testDetail));
        assert.isFalse(testDetail.commands.canSelectAll);
        assert.isTrue(stubEvent.calledOnce);
        assert.deepEqual(td.textualmenuDetail, testDetail);
      });

    test('receive event without mouseup nor selectAll, and the caret is ' +
      'collapsed', function() {
        testDetail.states = [];
        td.handleEvent(fakeTextSelectInAppEvent); 
        assert.isFalse(stubShow.calledOnce);
        assert.isTrue(testDetail.commands.canSelectAll);
        assert.isTrue(stubEvent.calledOnce);
        assert.deepEqual(td.textualmenuDetail, testDetail);
      });

    test('when the focus element is blurred', function() {
      testDetail.states = ['blur'];
      testDetail.visible = true;
      testDetail.isCollapsed = false;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubHide.calledOnce);
    });

    test('should hide bubble if user call selection.collapseToEnd() by script',
      function() {
        testDetail.states = ['collapsetoend'];
        testDetail.visible = true;
        testDetail.isCollapsed = false;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubHide.calledOnce);
      });

    test('should hide bubble if rect has no size but get mouseup reason',
      // In editable div, we may receive this event while bubble is displaying
      // and tapping on other context.
      function() {
        testDetail.visible = true;
        testDetail.isCollapsed = false;
        testDetail.rect.top = testDetail.rect.bottom;
        testDetail.rect.left = testDetail.rect.right;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubHide.calledOnce);
      });

    test('with no states', function() {
      testDetail.states = [];
      testDetail.visible = true;
      testDetail.isCollapsed = false;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubClose.calledOnce);
      assert.isFalse(stubHide.calledOnce);
      assert.isFalse(stubShow.calledOnce);
      assert.isFalse(stubRender.calledOnce);
    });

    test('should do nothing if rect has no size with no mouseup reason',
      function() {
        testDetail.states = ['mousedown'];
        testDetail.visible = true;
        testDetail.isCollapsed = false;
        testDetail.rect.top = testDetail.rect.bottom;
        testDetail.rect.left = testDetail.rect.right;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isFalse(stubClose.calledOnce);
        assert.isFalse(stubHide.calledOnce);
        assert.isFalse(stubShow.calledOnce);
        assert.isFalse(stubRender.calledOnce);
      });

    test('should do nothing if no commands', function() {
      testDetail.commands = {};
      testDetail.visible = true;
      testDetail.isCollapsed = false;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubClose.calledOnce);
      assert.isFalse(stubHide.calledOnce);
      assert.isFalse(stubShow.calledOnce);
      assert.isFalse(stubRender.calledOnce);
    });

    test('should render when first show', function() {
      testDetail.visible = true;
      testDetail.isCollapsed = false;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubRender.calledOnce);
      assert.isTrue(td._injected);
    });

    test('should not render when bubble has showed before', function() {
      td._injected = true;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubRender.calledOnce);
    });

    test('should call close when timeout of shortcut has reached and ' +
          'single-tap on the context', function() {
        testDetail.isCollapsed = true;
        td._hasCutOrCopied = false;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubHide.calledOnce);
      });

    test('should call close when selection is not visible', function() {
        testDetail.isCollapsed = false;
        td._hasCutOrCopied = false;
        testDetail.visible = false;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubHide.calledOnce);
      });

    test('should show bubble if states has updateposition and bubble is not ' +
         'closed', function() {
        testDetail.isCollapsed = false;
        td._hasCutOrCopied = false;
        td.textualmenuDetail = true;
        testDetail.visible = true;
        testDetail.states = ['updateposition'];
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubShow.calledWith(testDetail));
      });

   test('should show bubble if states has updateposition and bubble is ' +
        'closed', function() {
        testDetail.isCollapsed = false;
        td._hasCutOrCopied = false;
        testDetail.visible = true;
        testDetail.states = ['updateposition'];
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isFalse(stubShow.calledWith(testDetail));
      });

    test('should show bubble when states has selectall', function() {
      // When user click selectAll button, gecko will send a selectchange event
      // with no mouseup reason.
      testDetail.states = ['selectall'];
      testDetail.isCollapsed = false;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubShow.calledWith(testDetail));
    });

    test('should close paste bubble in 3 seconds if user tap on context and' +
         ' has cut/copied before', function() {

      var fakeTimer = this.sinon.useFakeTimers();
      td._hasCutOrCopied = true;
      testDetail.isCollapsed = true;
      td.handleEvent(fakeTextSelectInAppEvent);
      fakeTimer.tick(td.SHORTCUT_TIMEOUT);
      assert.isTrue(stubClose.calledOnce);
    });
  });

  suite('Scrollviewchange', function() {
    test('scroll start', function() {
      var stubShangeTransitionState = this.sinon.stub(td,
        '_changeTransitionState');
      td._transitionState = 'opened';
      fakeTextSelectInAppEvent.detail = {
        type: 'scrollviewchange',
        detail: {
          state: 'started'
        }
      };
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.equal(td._scrolling, true);
      assert.isTrue(stubShangeTransitionState.calledWith('closed'));
    });

    test('scroll stop', function() {
      var stubUpdateDialogPosition = this.sinon.stub(td,
        'updateDialogPosition');
      td._scrolling = true;
      fakeTextSelectInAppEvent.detail = {
        type: 'scrollviewchange',
        detail: {
          state: 'stopped'
        }
      };
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(td._scrolling);
      assert.isTrue(stubUpdateDialogPosition.calledOnce);
    });
  });

  suite('_elementEventHandler', function() {
    test('on mousedown', function() {
      var stubPreventDefault = this.sinon.stub(fakeTextSelectInAppEvent,
        'preventDefault');
      td._isCommandSendable = false;
      fakeTextSelectInAppEvent.type = 'mousedown';
      td._elementEventHandler(fakeTextSelectInAppEvent);
      assert.isTrue(td._isCommandSendable);
      assert.isTrue(stubPreventDefault.calledOnce);
      delete fakeTextSelectInAppEvent.type;
    });

    test('on transitionend', function() {
      var stubChangeTransitionState = this.sinon.stub(td,
        '_changeTransitionState');
      td._transitionState = 'closing';
      td._elementEventHandler({ type: 'transitionend' });
      assert.isTrue(stubChangeTransitionState.calledWith('closed'));
    });

    test('on click', function() {
      var fakeEvt = {
        type: 'click',
        target: {
          dataset: {
            action: 'cut'
          }
        }
      };
      var stubCutHandler = this.sinon.stub(td,
        'cutHandler');
      td._elementEventHandler(fakeEvt);
      assert.isTrue(stubCutHandler.calledWith(fakeEvt));
    });

    test('on mouseout', function() {
      td._isCommandSendable = true;
      td._elementEventHandler({ type: 'mouseout' });
      assert.isFalse(td._isCommandSendable);
    });
  });

  suite('_changeTransitionState', function() {
    setup(function() {
      td.element = document.createElement('div');
    });

    test('change state to opened', function() {
      td._changeTransitionState('opened');
      assert.isTrue(td.element.classList.contains('active'));
      assert.isTrue(td.element.classList.contains('visible'));
      assert.equal(td._transitionState, 'opened');
    });

    test('change state to opened', function() {
      td.element.classList.add('visible');
      td._changeTransitionState('closing');
      assert.isFalse(td.element.classList.contains('visible'));
      assert.equal(td._transitionState, 'closing');
    });

    test('change state to opened', function() {
      td.element.classList.add('active');
      td._changeTransitionState('closed');
      assert.isFalse(td.element.classList.contains('active'));
      assert.equal(td._transitionState, 'closed');
    });
  });

  suite('Value selector', function() {
    var stubEvent;
    setup(function() {
      stubEvent = this.sinon.stub(fakeTextSelectInAppEvent, 'preventDefault');
      td._injected = true;
    });

    test('is hidden', function() {
      td.handleEvent({ type: 'value-selector-hidden' });
      assert.isFalse(td._ignoreSelectionChange);

      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubEvent.calledOnce);
    });

    test('is shown', function() {
      td.handleEvent({ type: 'value-selector-shown' });
      assert.isTrue(td._ignoreSelectionChange);

      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubEvent.calledOnce);
    });
  });

  suite('cases to close/hide bubble', function() {
    setup(function() {
      this.sinon.stub(td, 'close');
    });

    test('pressing home', function() {
      td.handleEvent({ type: 'home' });
      assert.isTrue(td.close.called);
    });

    test('active app is changed', function() {
      td.handleEvent({ type: 'activeappchanged' });
      assert.isTrue(td.close.called);
    });

    test('hierarchychanged', function() {
      td.handleEvent({ type: 'hierarchychanged' });
      assert.isTrue(td.close.called);
    });
  });

  test('tap on touch caret', function() {
    td.textualmenuDetail = 'test';
    var stubTriggerShortcutTimeout = this.sinon.stub(td,
      '_triggerShortcutTimeout');
    var stubShow = this.sinon.stub(td, 'show');
    td.handleEvent({
      type: 'mozChromeEvent',
      detail: {
        type: 'touchcarettap'
      }
    });
    assert.isTrue(stubTriggerShortcutTimeout.calledOnce);
    assert.isTrue(stubShow.calledWith(td.textualmenuDetail));
  });

  suite('check functionality of each button', function() {
    var stubDoCommand;
    setup(function() {
      stubDoCommand = sinon.stub(td, '_doCommand');
      td.start();
    });

    teardown(function() {
      td.stop();
      stubDoCommand = null;
    });

    test('option display', function() {
      verifyClickableOptions({
        'Paste': false,
        'Copy': false,
        'Cut': true,
        'SelectAll': true
      });

      verifyClickableOptions({
        'Paste': true,
        'Copy': false,
        'Cut': false,
        'SelectAll': false
      });
    });

    test('option handler, selectAll', function() {
      verifyClickableOptions({
        'Paste': true,
        'Copy': true,
        'Cut': true,
        'SelectAll': true
      });
      emitClickEvent(td.elements.selectall);
      assert.equal(stubDoCommand.getCall(0).args[1], 'selectall');
    });

    test('option handler, paste', function() {
      verifyClickableOptions({
        'Paste': true,
        'Copy': true,
        'Cut': true,
        'SelectAll': true
      });
      emitClickEvent(td.elements.paste);
      assert.equal(stubDoCommand.getCall(0).args[1], 'paste');
    });

    test('option handler, cut', function() {
      verifyClickableOptions({
        'Paste': true,
        'Copy': true,
        'Cut': true,
        'SelectAll': true
      });
      emitClickEvent(td.elements.cut);
      assert.equal(stubDoCommand.getCall(0).args[1], 'cut');
    });

    test('option handler, copy', function() {
      verifyClickableOptions({
        'Paste': true,
        'Copy': true,
        'Cut': true,
        'SelectAll': true
      });
      emitClickEvent(td.elements.copy);
      assert.equal(stubDoCommand.getCall(0).args[1], 'copy');
    });
  });

  suite('dialog position', function() {
    var windowHeight;
    var windowWidth;
    setup(function() {
      windowHeight = MockService.mLayoutManager_height;
      windowWidth = MockService.mLayoutManager_width;
      td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP = 12;
      td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA = 43;
      td.DISTANCE_FROM_BOUNDARY = 5;
      td.TEXTDIALOG_WIDTH = 52;
      td.TEXTDIALOG_HEIGHT = 48;
    });

    test('if space is enough', function() {
      var positionDetail = {
        rect: {}
      };
      positionDetail.rect.top = windowHeight - 120;
      positionDetail.rect.bottom = windowHeight - 20;
      positionDetail.rect.left = windowWidth - 300;
      positionDetail.rect.right = windowWidth - 100;
      positionDetail.zoomFactor = 1;
      positionDetail.offsetY = 20;
      positionDetail.offsetX = 15;
      td.textualmenuDetail = positionDetail;
      td.numOfSelectOptions = 3;
      var result =
        td.calculateDialogPostion(0, 0);
      assert.deepEqual(result, {
        top: positionDetail.rect.top * positionDetail.zoomFactor -
          td.TEXTDIALOG_HEIGHT - td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA +
          positionDetail.offsetY,
        left: ((positionDetail.rect.left + positionDetail.rect.right) *
          positionDetail.zoomFactor - td.numOfSelectOptions *
          td.TEXTDIALOG_WIDTH)/ 2 + positionDetail.offsetX
      });
    });

    test('if utility bubble can overlay the header, and not app', function() {
      var positionDetail = {
        rect: {}
      };
      positionDetail.rect.top = 10;
      positionDetail.rect.bottom = windowHeight - 100;
      positionDetail.rect.left = windowWidth - 300;
      positionDetail.rect.right = windowWidth - 100;
      positionDetail.zoomFactor = 1;
      positionDetail.offsetY = 20;
      positionDetail.offsetX = 15;
      td.textualmenuDetail = positionDetail;
      td.numOfSelectOptions = 3;

      var result =
        td.calculateDialogPostion(0, 0);
      assert.deepEqual(result, {
        top: positionDetail.rect.bottom * positionDetail.zoomFactor +
          td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + positionDetail.offsetY,
        left: ((positionDetail.rect.left + positionDetail.rect.right) *
          positionDetail.zoomFactor -
          td.numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2 +
          positionDetail.offsetX
      });
    });

    test('if utility bubble can overlay the header and zoom factor is 2 ',
      function() {
        var positionDetail = {
          rect: {}
        };
        positionDetail.rect.top = 10;
        positionDetail.rect.bottom = windowHeight - 100;
        positionDetail.rect.left = windowWidth - 300;
        positionDetail.rect.right = windowWidth - 100;
        positionDetail.zoomFactor = 2;
        positionDetail.offsetY = 20;
        positionDetail.offsetX = 15;
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;
        var result =
          td.calculateDialogPostion(0, 0);
        var posTop;
        if (positionDetail.rect.bottom * positionDetail.zoomFactor >=
          windowHeight) {
          posTop = (positionDetail.rect.top * positionDetail.zoomFactor +
            windowHeight - td.TEXTDIALOG_HEIGHT) / 2 + positionDetail.offsetY;
        } else {
          posTop = ((positionDetail.rect.top + positionDetail.rect.bottom) *
            positionDetail.zoomFactor - td.TEXTDIALOG_HEIGHT) / 2 +
            positionDetail.offsetY;
        }
        assert.deepEqual(result, {
          top: posTop,
          left: windowWidth - td.numOfSelectOptions * td.TEXTDIALOG_WIDTH +
            positionDetail.offsetX - td.DISTANCE_FROM_BOUNDARY
        });
      });

    test('if utility bubble can overlay the left boundary',
      function() {
        var positionDetail = {
          rect: {}
        };
        positionDetail.rect.top = 10;
        positionDetail.rect.bottom = windowHeight - 100;
        positionDetail.rect.left = 10;
        positionDetail.rect.right = 20;
        positionDetail.zoomFactor = 1;
        positionDetail.offsetY = 20;
        positionDetail.offsetX = 15;
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;
        var result =
          td.calculateDialogPostion(0, 0);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + positionDetail.offsetY,
          left: positionDetail.offsetX + td.DISTANCE_FROM_BOUNDARY
        });
      });

    test('if utility bubble can overlay the right boundary',
      function() {
        var positionDetail = {
          rect: {}
        };
        positionDetail.rect.top = 10;
        positionDetail.rect.bottom = windowHeight - 100;
        positionDetail.rect.left = windowWidth - 10;
        positionDetail.rect.right = windowWidth;
        positionDetail.zoomFactor = 1;
        positionDetail.offsetY = 20;
        positionDetail.offsetX = 15;
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;
        var result =
          td.calculateDialogPostion(0, 0);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + positionDetail.offsetY,
          left: windowWidth + positionDetail.offsetX -
            td.numOfSelectOptions * td.TEXTDIALOG_WIDTH -
            td.DISTANCE_FROM_BOUNDARY
        });
      });

  });
});
