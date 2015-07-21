/* global MocksHelper, MockService, AppTextSelectionDialog,
          MockSettingsListener */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_statusbar.js');

var mocksForAppTextSelectionDialog = new MocksHelper([
  'SettingsListener',
  'Service'
]).init();

suite('system/AppTextSelectionDialog', function() {
  var td, fragment;
  var fakeTextSelectInAppEvent;
  mocksForAppTextSelectionDialog.attachTestHelpers();
  var mockDetail = {};
  setup(function(done) {
    MockService.mockQueryWith('LayoutManager.width', 360);
    MockService.mockQueryWith('LayoutManager.height', 480);
    MockService.mockQueryWith('Statusbar.height', 50);
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

    requireApp('system/js/app_text_selection_dialog.js',
      function() {
        fragment = document.createElement('div');
        fragment.id = 'text-selection-dialog-root';
        document.body.appendChild(fragment);
        td = new AppTextSelectionDialog();
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
    mockDetail = {
      detail: {}
    };
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
    mockDetail.detail.collapsed = false;
    mockDetail.type = 'caretstatechanged';
    mockDetail.detail.caretVisible = true;
    mockDetail.detail.selectionVisible = true;
    fakeTextSelectInAppEvent.detail = mockDetail;
    td.handleEvent(fakeTextSelectInAppEvent);

    if (lastOption) {
      assert.equal(td.element.classList.contains('visible'), true,
      'dialog should display');
    } else {
      assert.equal(td.element.classList.contains('visible'), false,
      'dialog should not display');
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
          type: 'copypaste-do-command',
          cmd: 'testCommand'
        });
        done();
      });

    td._doCommand(fakeTextSelectInAppEvent, 'testCommand', true);
    assert.isTrue(td.close.calledOnce,
      'should call close when trigger _doCommand');
  });

  test('_doCommand in app', function() {
    this.sinon.stub(td, 'close');
    td.app = true;
    td.textualmenuDetail = {
      sendDoCommandMsg: function() {}
    };
    this.sinon.stub(td.textualmenuDetail, 'sendDoCommandMsg');
    td._doCommand(fakeTextSelectInAppEvent, 'testCommand', true);
    assert.isTrue(td.textualmenuDetail.sendDoCommandMsg
      .calledWith('testCommand'));
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

  test('_doCommand, when _isCommandSendable is true and close dialog directly',
    function() {
      this.sinon.stub(td, 'close');
      td._doCommand(fakeTextSelectInAppEvent, 'testCommand', true);
      assert.isTrue(td.close.calledOnce,
        'should call close');
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
        selectionVisible: true,
        caretVisible: true,
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
        type: 'caretstatechanged',
        detail: testDetail
      };
    });

    teardown(function() {
      td._hasCutOrCopied = false;
    });

    test('tap on other place, and the caret is collapsed',
      function() {
        testDetail.collapsed = true;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isFalse(stubShow.calledOnce);
        assert.isTrue(stubHide.calledOnce);
      });

    test('press caret', function() {
      testDetail.reason = 'presscaret';
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubHide.calledOnce, 'should hide bubble since user would' +
        ' like to move caret');
    });

    test('copy some text and tap on other place, and the caret is collapsed',
      function() {
        testDetail.collapsed = true;
        testDetail.reason = 'taponcaret';
        td._hasCutOrCopied = true;
        this.sinon.stub(td, '_triggerShortcutTimeout');
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubShow.calledWith(testDetail));
        assert.isFalse(testDetail.commands.canSelectAll);
        assert.isTrue(td._triggerShortcutTimeout.calledOnce);
      });

    test('should render when first show', function() {
      td._injected = false;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubRender.calledOnce);
      assert.isTrue(td._injected);
    });

    test('should not render when bubble has showed before', function() {
      td._injected = true;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubRender.calledOnce);
    });

    test('should call hide when timeout of shortcut has reached and ' +
          'single-tap on the context', function() {
        testDetail.collapsed = true;
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubHide.calledOnce);
      });

    test('should call hide when selection is changed to invisible', function() {
        testDetail.caretVisibe = false;
        testDetail.reason = 'visibilitychange';
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

   test('should hide bubble if states has updateposition but not has been cut' +
        ' or copied', function() {
        testDetail.collapsed = true;
        testDetail._hasCutOrCopied = false;
        testDetail.reason = 'updateposition';
        td.handleEvent(fakeTextSelectInAppEvent);
        assert.isTrue(stubHide.calledOnce);
      });

    test('should close paste bubble in 3 seconds if user tap on context and' +
         ' has cut/copied before', function() {

      var fakeTimer = this.sinon.useFakeTimers();
      testDetail.reason = 'longpressonemptycontent';
      td._hasCutOrCopied = true;
      testDetail.collapsed = true;
      td.handleEvent(fakeTextSelectInAppEvent);
      fakeTimer.tick(td.SHORTCUT_TIMEOUT);
      assert.isTrue(stubClose.calledOnce);
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
      windowHeight = MockService.mockQueryWith('LayoutManager.height');
      windowWidth = MockService.mockQueryWith('LayoutManager.width');
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
      td.textualmenuDetail = positionDetail;
      td.numOfSelectOptions = 3;
      var result =
        td.calculateDialogPostion(0, 0);
      assert.deepEqual(result, {
        top: positionDetail.rect.top * positionDetail.zoomFactor -
          td.TEXTDIALOG_HEIGHT - td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA,
        left: ((positionDetail.rect.left + positionDetail.rect.right) *
          positionDetail.zoomFactor - td.numOfSelectOptions *
          td.TEXTDIALOG_WIDTH)/ 2
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
      td.textualmenuDetail = positionDetail;
      td.numOfSelectOptions = 3;

      var result =
        td.calculateDialogPostion(0, 0);
      assert.deepEqual(result, {
        top: positionDetail.rect.bottom * positionDetail.zoomFactor +
          td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP,
        left: ((positionDetail.rect.left + positionDetail.rect.right) *
          positionDetail.zoomFactor -
          td.numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2
      });
    });

    test('if the utility bubble is triggerer in app and appChrome is maxmized',
      function() {
        var positionDetail = {
          rect: {}
        };
        td.app = {
          appChrome: {
            isMaximized: function() {
              return true;
            },
            height: 40
          }
        };
        positionDetail.rect.top = 10;
        positionDetail.rect.bottom = windowHeight - 100;
        positionDetail.rect.left = windowWidth - 300;
        positionDetail.rect.right = windowWidth - 100;
        positionDetail.zoomFactor = 1;
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;

        var result =
          td.calculateDialogPostion(0, 0);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + td.app.appChrome.height,
          left: ((positionDetail.rect.left + positionDetail.rect.right) *
            positionDetail.zoomFactor -
            td.numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2
        });
      });

    test('if the utility bubble is triggerer in app and appChrome is ' +
         'not maxmized',
      function() {
        var positionDetail = {
          rect: {}
        };
        td.app = {
          appChrome: {
            isMaximized: function() {
              return false;
            }
          }
        };
        positionDetail.rect.top = 10;
        positionDetail.rect.bottom = windowHeight - 100;
        positionDetail.rect.left = windowWidth - 300;
        positionDetail.rect.right = windowWidth - 100;
        positionDetail.zoomFactor = 1;
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;

        var result =
          td.calculateDialogPostion(0, 0);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + 50,
          left: ((positionDetail.rect.left + positionDetail.rect.right) *
            positionDetail.zoomFactor -
            td.numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2
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
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;
        var result =
          td.calculateDialogPostion(0, 0);
        var posTop;
        if (positionDetail.rect.bottom * positionDetail.zoomFactor >=
          windowHeight) {
          posTop = (positionDetail.rect.top * positionDetail.zoomFactor +
            windowHeight - td.TEXTDIALOG_HEIGHT) / 2;
        } else {
          posTop = ((positionDetail.rect.top + positionDetail.rect.bottom) *
            positionDetail.zoomFactor - td.TEXTDIALOG_HEIGHT) / 2;
        }
        assert.deepEqual(result, {
          top: posTop,
          left: windowWidth - td.numOfSelectOptions * td.TEXTDIALOG_WIDTH -
            td.DISTANCE_FROM_BOUNDARY
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
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;
        var result =
          td.calculateDialogPostion(0, 0);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP,
          left: td.DISTANCE_FROM_BOUNDARY
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
        td.textualmenuDetail = positionDetail;
        td.numOfSelectOptions = 3;
        var result =
          td.calculateDialogPostion(0, 0);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP,
          left: windowWidth -
            td.numOfSelectOptions * td.TEXTDIALOG_WIDTH -
            td.DISTANCE_FROM_BOUNDARY
        });
      });

  });
});
