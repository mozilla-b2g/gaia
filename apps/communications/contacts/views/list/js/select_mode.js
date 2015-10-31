/* global ListUI */
/* global ListUtils */
/* global HeaderUI */
/* global utils */
/* global ContactsService */
/* global LazyLoader */
/* global BulkDelete */
/* global ContactsExporter */
/* global ContactsSDExport */
/* global ContactsBTExport */
/* global ContactsSIMExport */
/* global IccHandler */
/* global Loader */
/* global Search */
/* global Overlay */

(function(exports) {
  'use strict';

  var loaded = false,
      fastScroll,
      scrollable,
      monitor = null,
      deselectAll = null,
      selectAll = null,
      // Used when we click on select all but the list
      // is still loading contacts.
      // Will allow new contacts created to be selected
      // even if we unselect some of them
      selectAllPending = false,
      inSelectMode = false,
      selectForm = null,
      selectActionButton = null,
      groupList = null,
      searchList = null,
      currentlySelected = 0,
      isDangerSelectList = false,
      selectedContacts = {},
      exportButtonHandler = null;

  /*
    Returns back the list to it's normal behaviour
  */
  function exitSelectMode(canceling) {
    isDangerSelectList = false;

    window.dispatchEvent(new CustomEvent('exitSelectMode'));

    document.getElementById('settings-button').classList.remove('hide');
    document.getElementById('add-contact-button').classList.remove('hide');

    selectForm.addEventListener('transitionend', function handler() {
      selectForm.removeEventListener('transitionend', handler);
      window.setTimeout(function() {
        selectForm.classList.add('hide');
      });
    });

    selectActionButton.removeEventListener('click', exportButtonHandler);
    exportButtonHandler = null;

    selectForm.classList.remove('in-edit-mode');
    selectForm.classList.remove('contacts-select');

    inSelectMode = false;
    selectAllPending = false;
    currentlySelected = 0;
    deselectAllContacts();

    deselectAll.disabled = true;
    selectAll.disabled = false;

    selectActionButton.disabled = true;

    // Not in select mode
    groupList.classList.remove('selecting');
    searchList.classList.remove('selecting');
    scrollable.classList.remove('selecting');
    fastScroll.classList.remove('selecting');
    utils.alphaScroll.toggleFormat('normal');

    updateRowsOnScreen();
  }

  /*
    Controls the buttons for select all and deselect all
    when in select mode, when we click in a row or in the
    mass selection buttons.

    Second parameter is a boolean that indicates if a row was
    selected or unselected
  */
  function handleSelection(evt) {
    var action = null;
    if (evt) {
      evt.preventDefault();
      action = evt.target.id;
    }

    var selectAllDisabled = false;
    var deselectAllDisabled = false;
    currentlySelected = countSelectedContacts();

    switch (action) {
      case 'deselect-all':
        selectAllPending = false;
        deselectAllContacts();
        currentlySelected = 0;
        deselectAllDisabled = true;
        break;
      case 'select-all':
        selectAllPending = true && !loaded;
        selectAllContacts();
        currentlySelected = ListUI.total;
        selectAllDisabled = true;
        break;
      default:
        // We checked in a row, check the mass selection/deselection buttons
        selectAllDisabled = currentlySelected == ListUI.total;
        deselectAllDisabled = currentlySelected === 0;
        break;
    }

    updateRowsOnScreen();

    selectActionButton.disabled = currentlySelected === 0;
    selectAll.disabled = selectAllDisabled;
    deselectAll.disabled = deselectAllDisabled;
    updateSelectCount(currentlySelected);
  }

  /*
    If we perform a selection over the list of contacts
    and we don't have all the info yet, we send a promise
    to the select action.
  */
  function createSelectPromise() {
    var promise = {
      canceled: false,
      _selected: [],
      resolved: false,
      successCb: null,
      errorCb: null,
      resolve: function resolve(values) {
        var self = this;
        setTimeout(function onResolve() {
          // If we have the values parameter we can directly
          // resolve this promise
          if (values) {
            self._selected = values;
            self.resolved = true;
            if (self.successCb) {
              self.successCb(values);
            }
            return;
          }

          // We don't know if we render all the contacts and their checks,
          // so fetch ALL the contacts and remove those one we un selected
          // remember this is a promise, so is already async.
          var notSelectedIds = {};
          for (var id in selectedContacts) {
            if (!selectedContacts[id]) {
              notSelectedIds[id] = true;
            }
          }
          var notSelectedCount = Object.keys(notSelectedIds).length;

          ContactsService.getAll(function(e, contacts) {
            if (e) {
              self.reject();
              return;
            }
            contacts.forEach(function onContact(contact) {
              if (notSelectedCount === 0 ||
                notSelectedIds[contact.id] === undefined) {
                self._selected.push(contact.id);
              }
            });
            self.resolved = true;
            if (self.successCb) {
              self.successCb(self._selected);
            }
          });
        }, 0);
      },
      reject: function reject() {
        this.canceled = true;

        if (this.errorCb) {
          this.errorCb();
        }
      },
      set onsuccess(callback) {
        if (this.resolved) {
          callback(this._selected);
        } else {
          this.successCb = callback;
        }
      },
      set onerror(callback) {
        if (this.canceled) {
          callback();
        } else {
          this.errorCb = callback;
        }
      }
    };

    return promise;
  }

  function doSelectFromList(operation) {
    inSelectMode = true;
    scrollable = document.querySelector('#groups-container');
    fastScroll = document.querySelector('nav[data-type="scrollbar"]');
    if (selectForm === null) {
      selectForm = document.getElementById('selectable-form');
      selectActionButton = document.getElementById('select-action');
      selectActionButton.disabled = true;
      selectAll = document.getElementById('select-all');
      selectAll.addEventListener('click', handleSelection);
      deselectAll = document.getElementById('deselect-all');
      deselectAll.addEventListener('click', handleSelection);

      selectForm.querySelector('#selectable-form-header').
                    addEventListener('action', exitSelectMode.bind(null, true));
    }

    scrollable.classList.add('selecting');
    fastScroll.classList.add('selecting');
    utils.alphaScroll.toggleFormat('short');

    var title = 'DeleteTitle';
    switch (operation.action) {
      case 'delete':
        exportButtonHandler = doDeleteAction;
        break;
      case 'export':
        title = 'exportContactsAction';
        exportButtonHandler = doExportAction.bind(null, operation);
        break;
    }

    selectActionButton.addEventListener('click', exportButtonHandler);

    selectActionButton.setAttribute('data-l10n-id', title);

    updateSelectCount(0);
    selectForm.classList.remove('hide');
    selectForm.addEventListener('transitionend', function handler() {
      selectForm.removeEventListener('transitionend', handler);
      selectForm.classList.add('in-edit-mode');
    });

    // Give the opportunity to paint
    window.setTimeout(function() {
      selectForm.classList.add('contacts-select');
    });

    // Setup the list in selecting mode (the search one as well)
    if (groupList == null) {
      groupList = document.getElementById('groups-list');
    }
    groupList.classList.add('selecting');
    if (searchList == null) {
      searchList = document.getElementById('search-list');
    }
    searchList.classList.add('selecting');
    updateRowsOnScreen();

    if (ListUI.total === 0) {
      var emptyPromise = createSelectPromise();
      emptyPromise.resolve([]);
    }
  }

  function updateRowsOnScreen() {
    // Update style of nodes on screen
    if (monitor != null) {
      monitor.pauseMonitoringMutations();
    }
    var row;
    for (var id in ListUI.rowsOnScreen) {
      for (var group in ListUI.rowsOnScreen[id]) {
        row = ListUI.rowsOnScreen[id][group];
        ListUtils.updateRowStyle(row, true);
        ListUtils.updateSingleRowSelection(row, id);
      }
    }
    if (monitor != null) {
      monitor.resumeMonitoringMutations(false);
    }
  }

  // Update the selection status given a list of ids
  function updateRowSelection(idToUpdate) {
    for (var id in ListUI.rowsOnScreen) {
      for (var group in ListUI.rowsOnScreen[id]) {
        var row = ListUI.rowsOnScreen[id][group];
        if (idToUpdate === id) {
          ListUtils.updateSingleRowSelection(row, id);
        }
      }
    }
  }

  function selectAllContacts() {
    for (var id in selectedContacts) {
      selectedContacts[id] = true;
    }
  }

  function deselectAllContacts() {
    for (var id in selectedContacts) {
      selectedContacts[id] = false;
    }
  }

  function countSelectedContacts() {
    var counter = 0;
    for (var id in selectedContacts) {
      if (selectedContacts[id]) {
        counter++;
      }
    }

    return counter;
  }

  function updateSelectCount(count) {
    HeaderUI.updateSelectCountTitle(count);
  }

  /*
    Grab the selected items, if selected, and perform
    the action specified when we entered in select mode.

    We will return a promise, that will be inmediatelly
    fullfiled when we select manually the contacts.

    If we click in select all, the promise will be resolved
    in the future, once all contacts are fetched and the
    ones selected are filtered.
  */
  function doDeleteAction() {
    LazyLoader.load(
      [
        '/contacts/js/contacts_bulk_delete.js',
        '/contacts/js/contacts_remover.js',
        '/shared/js/contacts/import/utilities/status.js',
        '/shared/js/confirm.js',
        document.getElementById('confirmation-message')
      ], function() {
        updateSelectCount(0);
        var selectionPromise = createSelectPromise();

        // If we are in the middle of a pending select all
        // (we clicked and the list is still not completely loaded)
        // we fire the resolve of the promise without parameters,
        // indicating that we need to fetch again the contacts
        // and remove from the final result those one that
        // were unchecked (if any)
        if (selectAllPending) {
          BulkDelete.performDelete(selectionPromise, exitSelectMode);
          selectionPromise.resolve();
          return;
        }

        var ids = [];
        for (var id in selectedContacts) {
          if (selectedContacts[id]) {
            ids.push(id);
          }
        }

        if (ids.length === 0) {
          return;
        }

        BulkDelete.performDelete(selectionPromise, exitSelectMode);
        selectionPromise.resolve(ids);
      });
  }

  function doExportAction(operation) {
    switch (operation.destination) {
      case 'sim':
        var iccId = operation.iccId;

        LazyLoader.load(['/contacts/js/export/sim.js',
          '/contacts/js/utilities/icc_handler.js',
          '/contacts/js/export/contacts_exporter.js',
          '/shared/js/contacts/import/utilities/status.js',
          '/shared/js/confirm.js',
          document.getElementById('confirmation-message')],
          function() {
            // TODO promise like init function?
            IccHandler.init();
            doExport(new ContactsSIMExport(IccHandler.getIccById(iccId)));
          }
        );
        break;
      case 'sd':
        LazyLoader.load(
          [
            '/shared/js/device_storage/get_storage_if_available.js',
            '/shared/js/device_storage/get_unused_filename.js',
            '/shared/js/contact2vcard.js',
            '/shared/js/setImmediate.js',
            '/contacts/js/export/sd.js',
            '/contacts/js/export/contacts_exporter.js',
            '/shared/js/contacts/import/utilities/status.js'
          ],
          function() {
            doExport(new ContactsSDExport());
          }
        );
        break;
      case 'bluetooth':
        LazyLoader.load(
          [
            '/shared/js/device_storage/get_storage_if_available.js',
            '/shared/js/device_storage/get_unused_filename.js',
            '/shared/js/contact2vcard.js',
            '/shared/js/setImmediate.js',
            '/contacts/js/export/bt.js',
            '/contacts/js/export/contacts_exporter.js',
            '/shared/js/contacts/import/utilities/status.js'
          ],
          function() {
            doExport(new ContactsBTExport());
          }
        );
        break;
    }
  }

  function doExport(strategy) {
    // Resolve the promise, meanwhile show an overlay to
    // warn the user of the ongoin operation, dismiss it
    // once we have the result
    Loader.utility('Overlay', function _loaded() {
      Overlay.showSpinner('preparing-contacts');

      var selectionPromise = createSelectPromise();
      selectionPromise.onsuccess = function onSuccess(ids) {
        // Once we start the export process we can exit from select mode
        // This will have to evolve once export errors can be captured
        exitSelectMode();
        var exporter = new ContactsExporter(strategy);
        exporter.init(ids, function onExporterReady() {
          // Leave the contact exporter to deal with the overlay
          exporter.start();
        });
      };
      selectionPromise.onerror = function onError() {
        exitSelectMode();
        Overlay.hide();
      };

      // If we are in the middle of a pending select all
      // (we clicked and the list is still not completely loaded)
      // we fire the resolve of the promise without parameters,
      // indicating that we need to fetch again the contacts
      // and remove from the final result those one that
      // were unchecked (if any)
      if (selectAllPending) {
        selectionPromise.resolve();
        return;
      }

      var ids = [];
      for (var id in selectedContacts) {
        if (selectedContacts[id]) {
          ids.push(id);
        }
      }

      if (ids.length === 0) {
        return;
      }

      selectionPromise.resolve(ids);
    });
  }

  function onContactClicked(id) {
    selectedContacts[id] = !selectedContacts[id];
    updateRowSelection([id]);
    handleSelection(null);
    if (Search && Search.isInSearchMode()) {
      Search.selectRow(id, selectedContacts[id]);
    }
  }

  exports.SelectMode = {
    'init': function init(operation) {
      Loader.view('Search', function viewLoaded() {
        doSelectFromList(operation);
      });
    },
    get isInSelectMode() {
      return inSelectMode;
    },
    get selectedContacts() {
      return selectedContacts;
    },
    get selectAllPending() {
      return selectAllPending;
    },
    set selectAllPending(value) {
      selectAllPending = value;
    },
    'onContactClicked': onContactClicked
  };

})(window);
