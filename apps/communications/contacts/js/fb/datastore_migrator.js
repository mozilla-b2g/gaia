var DatastoreMigration = function(db) {
  var active = false;
  var ongoingMigration = false;
  var migrator;
  var idleObserver;
  var self = this;

  // Only really needed for testing purposes
  Object.defineProperty(this, 'db', {
    set: function(val) {
      if (migrator) {
        migrator.db = val;
      }
    }
  });

  var IdleObserver = function() {
    var self = this;

    this._files = [
      '/shared/js/fb/fb_request.js',
      'js/fb/fb_data.js'
    ];

    // 3 seconds idle time
    this.time = 3;

    this.onidle = function() {
      LazyLoader.load(self._files, function() {
        onidle();
      });
    };

    this.onactive = function() {
      LazyLoader.load(self._files, function() {
        onactive();
      });
    };
  };

  function DatastoreMigrator(db) {
    var IDB_NAME = 'Gaia_Facebook_Friends';
    var objStoreName;

    var SLICE_SIZE = 5;
    var initialized = false;

    var datastore, database = db;

    var self = this;

    var existsDatabase = true;
    this.saveErrors = false;

    // Only really needed for testing purposes
    Object.defineProperty(this, 'db', {
      set: function(val) {
        database = val;
        initialized = true;
      }
    });

    function sliceEnd(hasMore) {
      if (!hasMore) {
        // No more records present
        window.console.info('FB Migration: All records have been migrated');
        // Close the database
        database.close();
        if (!self.saveErrors) {
          var req = window.indexedDB.deleteDatabase(IDB_NAME);
          req.onsuccess = function() {
            window.console.info('FB Migration: ',
                                'Now the indexedDB has been deleted');
          };
          req.onerror = function() {
            window.console.error('FB Migration: ',
                                 'Error while deleting indexedDB: ',
                                 req.error.name);
          };
        }
        else {
          window.console.warn('There are save errors. ', 'DB not deleted');
        }
      }
      if (typeof self.onfinished === 'function') {
        self.onfinished(hasMore, self.saveErrors);
      }
    }

    this.migrateSlice = function migrateSlice() {
      var toBeMigrated = [];
      var pendingRecords = true;
      var self = this;

      openIndexedDB(function() {
        var transaction = database.transaction([objStoreName], 'readwrite');
        var objectStore = transaction.objectStore(objStoreName);

        var req = objectStore.openCursor();

        req.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor && toBeMigrated.length < SLICE_SIZE) {
            var obj = cursor.value;
            toBeMigrated.push(obj);
            cursor.continue();
          }
          else {
            if (!cursor) {
              pendingRecords = false;
            }
            migrateRecords(toBeMigrated, function() {
              sliceEnd(pendingRecords);
            });
          }
        };

        req.onerror = function() {
          window.console.error('FB Migration: ',
                               'Error while requesting a cursor: ',
                               req.error.name);
          if (typeof self.onerror === 'function') {
            self.onerror();
          }
        };
      });
    };

    this.reset = function() {
      existsDatabase = true;
      initialized = false;
      this.saveErrors = false;
      database = null;
    };

    function migrateRecords(list, cb) {
      if (list.length === 0) {
        cb();
        return;
      }

      var numResponses = 0;
      for (var j = 0; j < list.length; j++) {
        migrateRecord(list[j], function() {
          numResponses++;
          if (numResponses === list.length) {
            cb();
          }
        });
      }
    }

    function removeRecord(obj, cb) {
      // Now deleting from indexedDB
      var trans = database.transaction([objStoreName], 'readwrite');
      var objectStore = trans.objectStore(objStoreName);

      var req = objectStore.delete(obj.uid);
      req.onsuccess = cb;
      req.onerror = function() {
        window.console.error('FB Migration: Error while deleting indexedDB: ',
                              obj.uid, ': ', req.error.name);
        cb();
      };
    }

    function migrateRecord(obj, cb) {
      var req = fb.contacts.save(obj);

      req.onsuccess = function() {
        window.console.info('FB Migration: indexed DB Record migrated: ',
                            obj.uid);
        contacts.List.refreshFb(obj.uid);
        removeRecord(obj, cb);
      };

      req.onerror = function() {
        window.console.error('FB Migration: Error while saving to datastore: ',
                             obj.uid, req.error.name);
        if (req.error.name === 'AlreadyExists') {
          // Then that record was already migrated and it is safe to delete it
          removeRecord(obj, cb);
        }
        else {
          self.saveErrors = true;
          cb();
        }
      };
    }

    function openIndexedDB(cb) {
      if (database) {
        cb();
        return;
      }

      var req = window.indexedDB.open(IDB_NAME);

      req.onupgradeneeded = function() {
        existsDatabase = false;
      };

      req.onsuccess = function() {
        if (!existsDatabase) {
          // Delete it as indexedDB will have created it
          window.console.warn('FB Migration: The database does not exist');
          window.indexedDB.deleteDatabase(IDB_NAME);

          if (typeof self.onfinished === 'function') {
            self.onfinished(false);
          }
          return;
        }
        database = req.result;
        objStoreName = database.objectStoreNames[0];

        cb();
      };

      req.onerror = function() {
        window.console.error('Indexed DB cannot be opened: ', req.error.name);
        if (typeof self.onerror === 'function') {
          self.onerror();
        }
      };
    }
  }

  var start = function start() {
    idleObserver = new IdleObserver();
    navigator.addIdleObserver(idleObserver);
  };

  this.start = start;

  var stop = function stop() {
    navigator.removeIdleObserver(idleObserver);
    if (migrator) {
      migrator.reset();
    }
    if (typeof self.onmigrationdone === 'function') {
      self.onmigrationdone();
    }
  };

  this.stop = stop;

  function onactive() {
    active = true;
  }

  function sliceFinished(hasMore, saveErrors) {
    if (!hasMore && !saveErrors) {
      // And annotate in a cookie that migration was done
      utils.cookie.update({
        fbMigrated: true
      });
      stop();
    }
    else if (saveErrors && !hasMore) {
      // The process is finished for the moment though there are errors
      if (typeof self.onmigrationdone === 'function') {
        self.onmigrationdone(true);
      }
      ongoingMigration = false;
    }
    else {
      if (typeof self.onslicemigrated === 'function') {
        self.onslicemigrated();
      }
      if (!active) {
        ongoingMigration = true;
        // If still inactive next slice is migrated
        migrator.migrateSlice();
      }
      else {
        ongoingMigration = false;
      }
    }
  }

  var onidle = function onidle() {
    active = false;
    if (ongoingMigration) {
      return;
    }
    window.console.info('Idle event!!!. FB Migration about to start');
    ongoingMigration = true;
    if (!migrator) {
      migrator = new DatastoreMigrator(db);
      migrator.onfinished = sliceFinished;
      migrator.onerror = function() {
        ongoingMigration = false;
        migrator.reset();
        if (typeof self.onerror === 'function') {
          self.onerror({
            name: 'Migration Error'
          });
        }
      };
    }
    migrator.saveErrors = false;
    migrator.migrateSlice();
  };

  // Mainly needed for testing purposes
  this.onidle = onidle;
};
