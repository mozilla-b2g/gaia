/* global MocksHelper, LayoutManager, TextSelectionDialog */
'use strict';

mocha.globals(['TextSelectionDialog', 'System', 'BaseUI',
  'layoutManager']);

requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForTextSelectionDialog = new MocksHelper([ 'LayoutManager' ]).init();

suite('system/TextSelectionDialog', function() {
  var td, fragment;
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
  });

  teardown(function() {
    delete window.layoutManager;
    // navigator.mozL10n = realL10n;
    document.body.removeChild(fragment);
    fragment = null;
    td = null;
    mockDetail = {};
  });

  var fakeTextSelectInAppEvent = {
    type: 'mozChromeEvent',
    preventDefault: function() {},
    stopPropagation: function() {}
  };

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

  test('hide', function() {
    td.render();
    this.sinon.stub(td.element, 'blur');
    td.hide();
    assert.isFalse(td.element.classList.contains('visible'));
    assert.isTrue(td.element.blur.calledOnce);
  });

  test('_resetCutOrCopiedTimer', function() {
    var clock = this.sinon.useFakeTimers();
    td._hasCutOrCopied = true;
    td._resetCutOrCopiedTimeout = 'testTimer';
    td._resetCutOrCopiedTimer();
    
    clock.tick(td.RESET_CUT_OR_PASTE_TIMEOUT);
    assert.isFalse(td._hasCutOrCopied);
  });

  test('when select all, gecko should receive two selection change events',
    function() {
      var stubHide = this.sinon.stub(td, 'hide');
      mockDetail.detail.reasons = ['selectall'];
      mockDetail.detail.isCollapsed = true;
      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubHide.calledOnce, 'we should fileter first event by' +
        ' checking the length of selectedText');
    });

  test('when select all, and content contains br frame gecko will bubble up' +
       ' null reasons due to filter it',
    function() {
      var stubCalculateDialogPostion =
        this.sinon.stub(td, 'calculateDialogPostion');
      var stubHide = this.sinon.stub(td, 'hide');
      mockDetail.detail.reasons = [];
      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubHide.calledOnce, 'we should not call hide');
      assert.isFalse(stubCalculateDialogPostion.calledOnce, 'we should not' +
        ' call calculateDialogPostion');
    });

  suite('Value selector', function() {
    setup(function() {
      td._injected = true;
    });

    test('is hidden', function() {
      var stubShow = this.sinon.stub(td, 'show');
      td.handleEvent({ type: 'value-selector-hidden' });
      assert.isFalse(td._ignoreSelectionChange);

      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isTrue(stubShow.calledOnce, 'dialog should display');
    });

    test('is shown', function() {
      var stubShow = this.sinon.stub(td, 'show');
      td.handleEvent({ type: 'value-selector-showed' });
      assert.isTrue(td._ignoreSelectionChange);

      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);
      assert.isFalse(stubShow.calledOnce, 'dialog should not display');
    });
  });

  suite('Single click on text, and selection area is collapsed', function() {
    test('has not done anything before click', function() {
      var stubHide = this.sinon.stub(td, 'hide');
      mockDetail.detail.isCollapsed = true;

      mockDetail.detail.reasons = ['mouseup'];
      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);

      assert.isTrue(stubHide.calledOnce);
    });

    test('has cut or copied before click', function() {
      var clock = this.sinon.useFakeTimers();
      var stubHide = this.sinon.stub(td, 'hide');
      var stubCalculateDialogPostion =
        this.sinon.stub(td, 'calculateDialogPostion').returns({});

      td._hasCutOrCopied = true;
      mockDetail.detail.isCollapsed = true;
      mockDetail.detail.reasons = ['mouseup'];
      mockDetail.detail.commands.canPaste = true;
      fakeTextSelectInAppEvent.detail = mockDetail;
      td.handleEvent(fakeTextSelectInAppEvent);

      assert.isFalse(stubHide.calledOnce);
      assert.isTrue(stubCalculateDialogPostion.calledOnce);
      clock.tick(td.SHORTCUT_TIMEOUT);
      assert.isTrue(stubHide.calledOnce);
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
      var numOfSelectOptions = 3;
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
      td.app = false;
      var result =
        td.calculateDialogPostion(positionDetail, numOfSelectOptions, false);
      assert.deepEqual(result, {
        top: positionDetail.rect.top * positionDetail.zoomFactor -
          td.TEXTDIALOG_HEIGHT - td.DISTANCE_FROM_MENUBOTTOM_TO_SELECTEDAREA +
          positionDetail.offsetY,
        left: ((positionDetail.rect.left + positionDetail.rect.right) *
          positionDetail.zoomFactor - numOfSelectOptions *
          td.TEXTDIALOG_WIDTH)/ 2 + positionDetail.offsetX
      });
    });

    test('if utility bubble can overlay the header, and not app', function() {
      var numOfSelectOptions = 3;
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
      td.app = false;
      var result =
        td.calculateDialogPostion(positionDetail, numOfSelectOptions, false);
      assert.deepEqual(result, {
        top: positionDetail.rect.bottom * positionDetail.zoomFactor +
          td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + positionDetail.offsetY,
        left: ((positionDetail.rect.left + positionDetail.rect.right) *
          positionDetail.zoomFactor -
          numOfSelectOptions * td.TEXTDIALOG_WIDTH)/ 2 + positionDetail.offsetX
      });
    });

    test('if utility bubble can overlay the header and zoom factor is 2 ',
      function() {
        var numOfSelectOptions = 3;
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
        var result =
          td.calculateDialogPostion(positionDetail, numOfSelectOptions, false);
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
          left: windowWidth - numOfSelectOptions * td.TEXTDIALOG_WIDTH +
            positionDetail.offsetX
        });
      });

    test('if utility bubble can overlay the left boundary',
      function() {
        var numOfSelectOptions = 3;
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
        var result =
          td.calculateDialogPostion(positionDetail, numOfSelectOptions, false);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + positionDetail.offsetY,
          left: positionDetail.offsetX
        });
      });

    test('if utility bubble can overlay the right boundary',
      function() {
        var numOfSelectOptions = 3;
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
        var result =
          td.calculateDialogPostion(positionDetail, numOfSelectOptions, false);
        assert.deepEqual(result, {
          top: positionDetail.rect.bottom * positionDetail.zoomFactor +
            td.DISTANCE_FROM_SELECTEDAREA_TO_MENUTOP + positionDetail.offsetY,
          left: windowWidth + positionDetail.offsetX -
            numOfSelectOptions * td.TEXTDIALOG_WIDTH
        });
      });

  });

});
