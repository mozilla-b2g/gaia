/*global SelectionHandler
*/

'use strict';

require('/js/selection_handler.js');

suite('SelectionHandler', function() {
  const LENGTH = 10;
  var container, checkUncheckAllButton, selectionHandler, options;

  setup(function() {
    container = document.createElement('article');
    checkUncheckAllButton = document.createElement('button');

    var innerHTML = '';
    var idSet = new Set();
    for (var i = 0; i < LENGTH; i++) {
      innerHTML +=  '<label>' +
      '<input type="checkbox" value="' + i + '">' +
      '<span></span></label>';
      idSet.add(i);
    }
    container.innerHTML = innerHTML;

    options = {
      container: container,
      checkUncheckAllButton: checkUncheckAllButton,
      updateSelectionStatus: sinon.stub(),
      getIdIterator: sinon.stub().returns(idSet.values()),
      isInEditMode: sinon.stub()
    };
  });

  suite('create SelectionHandler instance', function() {
    test('throws if options is not valid', function() {
      assert.throws(() => new SelectionHandler());
      assert.throws(() => new SelectionHandler({}));
      assert.throws(() => new SelectionHandler({
        // One element missed
        container: container,
        // Methods
        updateSelectionStatus: sinon.stub(),
        getIdIterator: sinon.stub(),
        isInEditMode: sinon.stub()
      }));
    });

    test('correctly set selected Set', function() {
      var options = {
        container: container,
        checkUncheckAllButton: checkUncheckAllButton,
        updateSelectionStatus: sinon.stub(),
        getIdIterator: sinon.stub(),
        isInEditMode: sinon.stub()
      };
      selectionHandler = new SelectionHandler(options);

      assert.isTrue(selectionHandler.selected instanceof Set);

      for (var key in options) {
        assert.equal(options[key], selectionHandler[key]);
      }
    });
  });

  suite('onSelected', function() {
    setup(function() {
      options.isInEditMode.returns(true);
      selectionHandler = new SelectionHandler(options);
    });
    
    teardown(function() {
      container.innerHTML = '';
    });

    test('Early exist if not in edit mode', function() {
      selectionHandler.isInEditMode.returns(false);
      container.querySelectorAll('input')[0].click();

      sinon.assert.notCalled(selectionHandler.updateSelectionStatus);
      assert.equal(selectionHandler.selectedCount, 0);
    });

    test('input selected/unselected', function() {
      var target = container.querySelectorAll('input')[0];
      var event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      });

      target.dispatchEvent(event);

      sinon.assert.called(selectionHandler.updateSelectionStatus);
      assert.equal(selectionHandler.selectedCount, 1);
      assert.equal(selectionHandler.selectedList[0], target.value);

      target.dispatchEvent(event);

      sinon.assert.called(selectionHandler.updateSelectionStatus);
      assert.equal(selectionHandler.selectedCount, 0);
    });
  });

  suite('updateCheckboxes', function() {
    setup(function() {
      selectionHandler = new SelectionHandler(options);
    });

    test('checkbox UI should sync up with data', function() {
      var allInputs = container.querySelectorAll('input');
      var selectedIds = [1,2];

      selectedIds.forEach((id) => {
        selectionHandler.select(id);
      });
      
      // No checkbox selected on UI
      Array.prototype.forEach.call(allInputs, (input) => {
        assert.isFalse(input.checked);
      });

      selectionHandler.updateCheckboxes();

      // UI should sync up with selected data
      Array.prototype.forEach.call(allInputs, (input, index) => {
        assert.equal(
          input.checked,
          selectedIds.indexOf(index) > -1
        );
      });
    }); 
  });

  suite('toggleCheckedAll', function() {
    setup(function() {
      selectionHandler = new SelectionHandler(options);

      this.sinon.stub(selectionHandler, 'updateCheckboxes');
    });

    test('Should select all when not all data selected first', function() {
      selectionHandler.select(1);
      selectionHandler.toggleCheckedAll();

      assert.equal(selectionHandler.selectedCount, LENGTH);
    });

    test('Should unselect all when all selected first', function() {
      for (var id of selectionHandler.inputIdSet) {
        selectionHandler.select(id);
      }

      assert.equal(selectionHandler.selectedCount, LENGTH);

      selectionHandler.toggleCheckedAll();
      assert.equal(selectionHandler.selectedCount, 0);
    });
  });

  suite('cleanForm', function() {
    setup(function() {
      selectionHandler = new SelectionHandler(options);

      this.sinon.stub(selectionHandler, 'updateCheckboxes');
    });

    test('selected data cleared', function() {
      // 1 data added
      selectionHandler.select(1);
      assert.equal(selectionHandler.selectedCount, 1);

      // Data is cleared after cleanForm
      selectionHandler.cleanForm();
      assert.equal(selectionHandler.selectedCount, 0);
      sinon.assert.called(selectionHandler.updateCheckboxes);
    });
  });

  suite('allSelected', function() {
    setup(function() {
      selectionHandler = new SelectionHandler(options);
    });

    test('return false if none or some selected', function() {
      assert.isFalse(selectionHandler.allSelected());

      selectionHandler.select(0);
      assert.isFalse(selectionHandler.allSelected());
    });

    test('return true if all selected', function() {
      for (var id of selectionHandler.inputIdSet) {
        selectionHandler.select(id);
      }

      assert.isTrue(selectionHandler.allSelected());
    });
  });
});
