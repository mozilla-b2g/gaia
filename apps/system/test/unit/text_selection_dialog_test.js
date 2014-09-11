/* global MocksHelper, LayoutManager, TextSelectionDialog */
'use strict';

mocha.globals(['TextSelectionDialog', 'System', 'BaseUI',
  'layoutManager']);

requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForTextSelectionDialog = new MocksHelper([ 'LayoutManager' ]).init();

suite('system/TextSelectionDialog', function() {
  var td, fragment;
  var fakeTextSelectInAppEvent;
  mocksForTextSelectionDialog.attachTestHelpers();
  var mockDetail = {};
  setup(function(done) {
    window.layoutManager = new LayoutManager();
    window.layoutManager.start();
    window.layoutManager.width = 360;
    window.layoutManager.height = 480;
    mockDetail = {
      type: 'selectionchange',
      detail: {
        commands: {},
        rect: {},
        reasons: []
      },
      isCollapsed: false
    };

    requireApp('system/js/system.js');
    requireApp('system/js/base_ui.js');

    requireApp('system/js/text_selection_dialog.js',
      function() {
        fragment = document.createElement('div');
        fragment.id = 'TextSelectionDialogRoot';
        document.body.appendChild(fragment);
        td = new TextSelectionDialog();
        fragment.innerHTML = td.view();
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
    delete window.layoutManager;
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

    mockDetail.detail.reasons = ['mouseup'];

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

  function emitMouseDownEvent(ele) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('mousedown', true, false, null);
    ele.dispatchEvent(evt);
  }

  test('_doCommand', function(done) {
    this.sinon.stub(td, 'hide');
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
    assert.isTrue(td.hide.calledOnce,
      'should callhide when trigger _doCommand');
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
    td.render();
    var stubHide = this.sinon.stub(td, 'hide');
    td._isShowed = true;
    this.sinon.stub(td.element, 'blur');
    td.close();
    assert.isTrue(stubHide.calledOnce);
    assert.isFalse(td._isShowed);
  });

  test('updateDialogPosition', function() {
    td.element = document.createElement('div');
    this.sinon.stub(td, 'calculateDialogPostion').returns(
      {top: 123, left: 321});
    td.updateDialogPosition(123, 321);
    assert.equal(td.element.style.top, '123px');
    assert.equal(td.element.style.left, '321px');
    assert.isTrue(td.element.classList.contains('visible'));
    assert.isTrue(td._isShowed);
  });

  test('_resetCutOrCopiedTimer', function() {
    var clock = this.sinon.useFakeTimers();
    td._hasCutOrCopied = true;
    td._resetCutOrCopiedTimeout = 'testTimer';
    td._resetCutOrCopiedTimer();
    
    clock.tick(td.RESET_CUT_OR_PASTE_TIMEOUT);
    assert.isFalse(td._hasCutOrCopied);
  });

  suite('_onSelectionChange', function() {
    var stubClose, stubHide, stubShow, stubRender, stubEvent;
    var testDetail;
    setup(function() {
      stubClose = this.sinon.stub(td, 'close');
      stubHide = this.sinon.stub(td, 'hide');
      stubShow = this.sinon.stub(td, 'show');
      stubRender = this.sinon.stub(td, 'render');
      stubEvent = this.sinon.stub(fakeTextSelectInAppEvent, 'preventDefault');
      testDetail = {
        isCollapsed: true,
        reasons: ['selectAll', 'mouseup'],
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
        detail: testDetail
      };
    });

    teardown(function() {
      td._hasCutOrCopied = false;
    });

    test('tap on text, and user has cut/copied before', function() {
      td._hasCutOrCopied = true;
      td._onSelectionChange(fakeTextSelectInAppEvent);
      assert.isTrue(stubShow.calledWith(testDetail));
      assert.isFalse(testDetail.commands.canSelectAll);
      assert.isTrue(stubEvent.calledOnce);
    });

    test('should hide bubble if rect has no size but get mouseup reason',
      // In editable div, we may receive this event while bubble is displaying
      // and tapping on other context.
      function() {
        testDetail.rect.top = testDetail.rect.bottom;
        testDetail.rect.left = testDetail.rect.right;
        td._onSelectionChange(fakeTextSelectInAppEvent);
        assert.isTrue(stubHide.calledOnce);
      });

    test('with no reasons', function() {
      testDetail.reasons = [];
      td._onSelectionChange(fakeTextSelectInAppEvent);
      assert.isFalse(stubClose.calledOnce);
      assert.isFalse(stubHide.calledOnce);
      assert.isFalse(stubShow.calledOnce);
      assert.isFalse(stubRender.calledOnce);
    });

    test('should do nothing if rect has no size with no mouseup reason',
      function() {
        testDetail.reasons = ['mousedown'];
        testDetail.rect.top = testDetail.rect.bottom;
        testDetail.rect.left = testDetail.rect.right;
        td._onSelectionChange(fakeTextSelectInAppEvent);
        assert.isFalse(stubClose.calledOnce);
        assert.isFalse(stubHide.calledOnce);
        assert.isFalse(stubShow.calledOnce);
        assert.isFalse(stubRender.calledOnce);
      });

    test('should do nothing if no commands', function() {
      testDetail.commands = {};
      td._onSelectionChange(fakeTextSelectInAppEvent);
      assert.isFalse(stubClose.calledOnce);
      assert.isFalse(stubHide.calledOnce);
      assert.isFalse(stubShow.calledOnce);
      assert.isFalse(stubRender.calledOnce);
    });

    test('should render when first show', function() {
      td._onSelectionChange(fakeTextSelectInAppEvent);
      assert.isTrue(stubRender.calledOnce);
      assert.isTrue(td._injected);
    });

    test('should not render when bubble has showed before', function() {
      td._injected = true;
      td._onSelectionChange(fakeTextSelectInAppEvent);
      assert.isFalse(stubRender.calledOnce);
    });

    test('should call close when timeout of shortcut has reached and ' +
          'single-tap on the context', function() {
        testDetail.isCollapsed = true;
        td._hasCutOrCopied = false;
        td._onSelectionChange(fakeTextSelectInAppEvent);
        assert.isTrue(stubClose.calledOnce);
      });

    test('should show bubble when reasons has selectall', function() {
      // When user click selectAll button, gecko will send a selectchange event
      // with no mouseup reason.
      testDetail.reasons = ['selectall'];
      testDetail.isCollapsed = false;
      td._onSelectionChange(fakeTextSelectInAppEvent);
      assert.isTrue(stubShow.calledWith(testDetail));
    });

    test('should close paste bubble in 3 seconds if user tap on context and' +
         ' has cut/copied before', function() {

      var fakeTimer = this.sinon.useFakeTimers();
      td._hasCutOrCopied = true;
      testDetail.isCollapsed = true;
      td._onSelectionChange(fakeTextSelectInAppEvent);
      fakeTimer.tick(td.SHORTCUT_TIMEOUT);
      assert.isTrue(stubClose.calledOnce);
    });
  });

  suite('Scrollviewchange', function() {
    test('scroll start', function() {
      fakeTextSelectInAppEvent.detail = {
        type: 'scrollviewchange',
        detail: {
          state: 'started',
          scrollX: 123,
          scrollY: 321
        }
      };
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.equal(td._previousOffsetX, 123);
      assert.equal(td._previousOffsetY, 321);
    });

    test('scroll stop', function() {
      var stubUpdateDialogPosition = this.sinon.stub(td,
        'updateDialogPosition');
      td._previousOffsetX = 23;
      td._previousOffsetY = 21;
      td._isShowed = true;
      fakeTextSelectInAppEvent.detail = {
        type: 'scrollviewchange',
        detail: {
          state: 'stopped',
          scrollX: 123,
          scrollY: 321
        }
      };
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.equal(stubUpdateDialogPosition.getCall(0).args[0], 100);
      assert.equal(stubUpdateDialogPosition.getCall(0).args[1], 300);

      assert.equal(td._previousOffsetX, 0);
      assert.equal(td._previousOffsetY, 0);
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
      td.handleEvent({ type: 'value-selector-showed' });
      assert.isTrue(td._ignoreSelectionChange);

      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubEvent.calledOnce);
    });
  });

  suite('check functionality of each button', function() {
    var stubDoCommand;
    setup(function() {
      stubDoCommand = sinon.stub(td, '_doCommand');
    });

    teardown(function() {
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
      emitMouseDownEvent(td.elements.selectall);
      assert.equal(stubDoCommand.getCall(0).args[1], 'selectall');
    });

    test('option handler, paste', function() {
      verifyClickableOptions({
        'Paste': true,
        'Copy': true,
        'Cut': true,
        'SelectAll': true
      });

      emitMouseDownEvent(td.elements.paste);
      assert.equal(stubDoCommand.getCall(0).args[1], 'paste');
    });

    test('option handler, cut', function() {
      verifyClickableOptions({
        'Paste': true,
        'Copy': true,
        'Cut': true,
        'SelectAll': true
      });

      emitMouseDownEvent(td.elements.cut);
      assert.equal(stubDoCommand.getCall(0).args[1], 'cut');
    });

    test('option handler, copy', function() {
      verifyClickableOptions({
        'Paste': true,
        'Copy': true,
        'Cut': true,
        'SelectAll': true
      });

      emitMouseDownEvent(td.elements.copy);
      assert.equal(stubDoCommand.getCall(0).args[1], 'copy');
    });
  });

  suite('dialog position', function() {
    var windowHeight;
    var windowWidth;
    setup(function() {
      windowHeight = window.layoutManager.height;
      windowWidth = window.layoutManager.width;
      td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP = 12;
      td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA = 34;
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
            positionDetail.offsetX
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
          left: positionDetail.offsetX
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
            td.numOfSelectOptions * td.TEXTDIALOG_WIDTH
        });
      });

  });
});
