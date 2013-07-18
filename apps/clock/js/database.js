(function(exports) {
  'use strict';

  // ===========================================================
  // SchemaVersion Object

  var schemaVersions = new Map();
  var schemaVersionNamedRetrieval = new Map();

  var addSchemaVersion = function(schemaVersion) {
    var versionMap = schemaVersionNamedRetrieval.get(schemaVersion.name);
    if (!versionMap) {
      versionMap = new Map();
      schemaVersionNamedRetrieval.set(schemaVersion.name, versionMap);
    }
    versionMap.set(schemaVersion.version, schemaVersion);
  };

  function SchemaVersion(databaseName, version, options) {
    /**
     * SchemaVersion (constructor)
     *
     * Parameter databaseName {string} - database name.
     * Parameter version {number} - version integer n, where 0 < n < 2^53.
     * Parameter options {Object}
     *            an object containing:
     *       initializer {function} - a function that initializes a new
     *            schema version
     *       upgrader {function} - a function that converts this schema
     *            version to schema version n+1
     *       downgrader {function} - a function that converts this schema
     *            version to schema version n-1.
     *
     * References to SchemaVersion's are maintained automatically
     */
    this.name = databaseName;
    this.version = version;
    Utils.extend(this, {
      initializer: null,
      upgrader: null,
      downgrader: null
    }, options);
    addSchemaVersion(this);
    schemaVersions.set(this, true);
  }

  SchemaVersion.getSchemaVersions = function(databaseName) {
    /**
     * getSchemaVersions
     *
     * return the SchemaVersion objects for a particular databaseName
     */
    var ret = [];
    var databaseMap = schemaVersionNamedRetrieval.get(databaseName);
    if (databaseMap) {
      for (var i of databaseMap) {
        ret.push(i[1]);
      }
    }
    return ret.sort(Utils.data.keyedCompare('version'));
  };

  SchemaVersion.getAllSchemaVersions = function() {
    /**
     * getAllSchemaVersions
     *
     * return all the SchemaVersion objects
     */
    var ret = [];
    for (var i of schemaVersions) {
      ret.push(i[0]);
    }
    return ret;
  };

  SchemaVersion.removeSchemaVersions = function(databaseName) {
    if (!databaseName) {
      schemaVersions.clear();
      schemaVersionNamedRetrieval.clear();
    } else {
      schemaVersionNamedRetrieval.delete(databaseName);
    }
  };

  // ===========================================================
  // SchemaVersion Prototype

  SchemaVersion.prototype = {
    register: function sv_register(database) {
      if (this.initializer) {
        database.addInitializer(this.version, this.initializer);
      } else {
        throw new Error('Cannot add a Schema without an initializer');
      }
      if (this.upgrader) {
        database.addUpgrader(this.version, this.upgrader);
      }
      if (this.downgrader) {
        database.addDowngrader(this.version, this.downgrader);
      }
    }
  };

  // ===========================================================
  // Database Object

  function Database(options) {
    /**
     * Database (constructor)
     *
     * Parameter options {Object}
     *            an object containing:
     *       name {string} -- database name
     *       version {number} -- version integer n, where 0 < n < 2^53
     *       schemas {list<string>} -- a list of strings containing
     *            URLs (typically a db/schema_{version}.js naming scheme)
     *            that define the database Schemas. These will be lazy
     *            loaded when the effective version !== the source version.
     */
    Utils.extend(this, {
      initializers: [],
      upgraders: [],
      downgraders: []
    }, options);
  }

  // ===========================================================
  // Database Singletons

  var databaseSingletons = new Map();

  Database.constructSingleton = function(options) {
    if (!databaseSingletons.has(options.name)) {
      databaseSingletons.put(options.name, new Database(options));
    }
  };

  Database.getSingleton = function(name) {
    return databaseSingletons.get(name);
  };

  // ===========================================================
  // Database Object Private Methods

  var addHelper = function(listName) {
    return function(version, fn) {
      var added = {
        version: version,
        fn: fn
      };
      Utils.data.sortedRemove(added, this[listName],
        Utils.data.keyedCompare('version'));
      Utils.data.sortedInsert(added, this[listName],
        Utils.data.keyedCompare('version', true));
    };
  };

  var removeHelper = function(listName) {
    return function(version) {
      var removed = { version: version };
      Utils.data.sortedRemove(removed, this[listName],
        Utils.data.keyedCompare('version'));
    };
  };

  // ===========================================================
  // Database Object Prototype

  Database.prototype = {
    addInitializer: addHelper('initializers'),
    removeInitializer: removeHelper('initializers'),
    addUpgrader: addHelper('upgraders'),
    removeUpgrader: removeHelper('upgraders'),
    addDowngrader: addHelper('downgraders'),
    removeDowngrader: removeHelper('downgraders'),

    get effectiveVersionName() {
      return '__effectiveVersion__';
    },

    setLatestVersion: function(version, transaction, callback) {
      var db = transaction.db;
      if (Array.prototype.indexOf.call(db.objectStoreNames,
        this.effectiveVersionName) !== -1) {
        db.deleteObjectStore(this.effectiveVersionName);
      }
      var ev = db.createObjectStore(this.effectiveVersionName);
      var req = ev.put({ number: version }, 0);
      req.onsuccess = function(ev) {
        callback && callback(null);
      };
      req.onerror = function(ev) {
        callback && callback(req.error);
      };
    },

    getLatestVersion: function(databaseName, callback) {
      /**
       * getLatestVersion
       *
       * Parameter databaseName {string} -- database name to query
       *        (optional).
       * Parameter callback {function} -- callback to call with
       *            (err, versionNumber, effectiveNumber).
       */
      if (arguments.length === 1 && typeof arguments[0] === 'function') {
        // if no databaseName was passed, use `this`
        databaseName = this.name;
        callback = arguments[0];
      }
      var ignoreError = false;
      var req = indexedDB.open(databaseName, Math.pow(2, 53) - 1);
      var getEffective = (function(transaction, callback) {
        var db = transaction.db;
        var ev = transaction.objectStore(this.effectiveVersionName);
        var req = ev.get(0);
        req.onsuccess = function(ev) {
          callback && callback(null, req.result['number']);
        };
        req.onerror = function(ev) {
          callback && callback(req.error);
        };
      }).bind(this);
      req.onupgradeneeded = function(ev) {
        // req.result.version < 2^53 - 1
        if (ev.oldVersion === 0) {
          try {
            req.result.close();
            callback && callback(null, ev.oldVersion, 0);
          } finally {
            ignoreError = true;
            ev.target.transaction.abort();
          }
          return;
        }
        getEffective(ev.target.transaction, function(err, effective) {
          try {
            if (!err) {
              callback && callback(null, ev.oldVersion, effective);
            } else {
              callback && callback(null, ev.oldVersion, null);
            }
          } finally {
            req.result.close();
            ignoreError = true;
            ev.target.transaction.abort();
          }
        });
      };
      req.onsuccess = (function(ev) {
        // req.result.version === 2^53 - 1
        var trans = req.result.transaction(
          this.effectiveVersionName, 'readonly');
        getEffective(trans, function(err, effective) {
          try {
            callback && callback(null, req.result.version, effective);
          } finally {
            req.result.close();
            ignoreError = true;
            trans.abort();
          }
        });
      }).bind(this);
      req.onerror = req.onblocked = function(ev) {
        ev.preventDefault();
        if (!ignoreError) {
          callback && callback(
            new Error('Error retrieving indexedDB version #'));
        }
      };
    },

    // ===========================================================
    // Database initializing and upgrading

    loadSchemas: function(callback) {
      /**
       * loadSchemas
       *
       * Parameter callback {function} - called after all
       *            schemas are loaded.
       *
       * Lazily loads schemas and then calls the callback.
       * SchemaVersions that were defined with a different
       * databaseName must be loaded manually.
       */
      LazyLoader.load(this.schemas, function() {
        SchemaVersion.getSchemaVersions(this.name).forEach(
          function(el) {
          el.register(this);
        }.bind(this));
        callback && callback();
      }.bind(this));
    },

    initialize: function(transaction, newVersion, callback) {
      /**
       * initialize
       *
       * Parameter transaction {IDBTransaction} - versionchanged
       *        transaction.
       * Parameter newVersion {number} - integer effective version.
       * Parameter callback {function} - function to be called after
       *            the database is initialized.
       */
      var db = transaction.db;
      var objectStores = db.objectStoreNames;
      for (var i = 0; i < objectStores.length; i++) {
        db.deleteObjectStore(objectStores[i]);
      }
      var init = Utils.data.binarySearch({ 'version': newVersion },
        this.initializers,
        Utils.data.keyedCompare('version'));
      if (init.match) {
        var setVersion = (function() {
          this.setLatestVersion(newVersion, transaction, callback);
        }).bind(this);
        this.initializers[init.index].fn(transaction, setVersion);
      } else {
        callback(new Error('no initializer for ' + newVersion));
      }
    },

    upgrade: function(transaction, oldVersion, newVersion, callback) {
      /**
       * upgrade
       *
       * Parameter transaction {IDBTransaction} - versionchanged
       *        transaction.
       * Parameter oldVersion {number} - integer old effective version.
       * Parameter newVersion {number} - integer effective version.
       * Parameter callback {function} - function to be called after
       *            the database is initialized.
       */
      var mutators, direction;
      if (newVersion === oldVersion) {
        return;
      } else if (newVersion > oldVersion) {
        mutators = this.upgraders;
        direction = 1;
      } else {
        mutators = this.downgraders;
        direction = -1;
      }
      var first = Utils.data.binarySearch({version: oldVersion}, mutators,
        Utils.data.keyedCompare('version'));
      var plan = [], last = null;
      if (first.match) {
        var applicableMutator = function(m, dir, version) {
          // don't upgrade past the target
          if (dir === 1) {
            return m.version < version;
          } else {
            return m.version > version;
          }
        };
        for (var i = first.index;
             i >= 0 && i < mutators.length &&
               applicableMutator(mutators[i], direction, newVersion);
             i += direction) {
          if (last && Math.abs(last - mutators[i].version) > 1) {
            plan.splice(0, plan.length);
            break;
          }
          plan.push(mutators[i]);
          last = mutators[i].version;
        }
      }
      if (plan.length === 0) {
        this.initialize(transaction, newVersion, callback);
        return;
      }
      var gen = Utils.async.generator(function(err) {
        this.setLatestVersion(newVersion, transaction, function(err) {
          callback && callback(err);
        });
      }.bind(this));
      var done = gen();
      try {
        for (var i = 0; i < plan.length; i++) {
          plan[i].fn.call(transaction, transaction, gen());
        }
        done();
      } catch (err) {
        console.log('Upgrade error:', err.message, err.fileName,
          err.lineNumber);
        this.initialize(transaction, newVersion, callback);
      }
    },

    query: function(callback) {
      var opener = (function(actualVersion, effectiveVersion) {
        var req = indexedDB.open(this.name, actualVersion);
        req.onsuccess = function(event) {
          req.result.onversionchange = function(event) {
            req.result.close();
          };
          callback && callback(null, req.result);
        };
        req.onerror = function(event) {
          event.preventDefault();
          callback && callback(req.error);
        };
        req.onupgradeneeded = (function(event) {
          this.upgrade(event.target.transaction, effectiveVersion,
            this.version, function(err) {
            if (err) {
              event.target.transaction.abort();
            }
          });
        }).bind(this);
      }).bind(this);
      var loaderOpener = function(upgrading, version, effective) {
        if (upgrading) {
          this.loadSchemas(opener.bind(this, version, effective));
        } else {
          opener.call(this, version, effective);
        }
      };
      this.getLatestVersion(this.name, function(err, version, effective) {
        var upgrading = false;
        if (version === 0 || effective !== this.version) {
          version++;
          upgrading = true;
        }
        loaderOpener.call(this, upgrading, version, effective);
      }.bind(this));
    }
  };

  exports.SchemaVersion = SchemaVersion;
  exports.Database = Database;

})(this);
