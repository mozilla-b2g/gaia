// Return a new, unresolved Promise object.
// Can be used with or without new()
function Promise() {
    return Object.create(Promise.prototype);
}

// Functions that return promises call this method when the value is ready
// It in turn triggers any handlers that were passed to whendone().
Promise.prototype.resolve = function(value) {
    if (!this.done) {
        this.done = true;
        this.value = value;
        if (this.resolveHandlers) {
            this.resolveHandlers.forEach(function(handler) {
                try { handler(value); }
                catch(e) { /* ignore errors */ }
            });
        }
    }
};

// Functions that return promises call this method to break their promise
// when an error occurs that prevents them from returning a value.
// This method triggers any handlers that were passed to onfail().
Promise.prototype.reject = function(error) {
    if (!this.done) {
        this.done = true;
        this.error = error;
        if (this.rejectHandlers) {
            this.rejectHandlers.forEach(function(handler) {
                try { handler(error); }
                catch(e) { /* ignore errors */ }
            });
        }
    }
};

// Add a handler to be invoked when the promised value is ready.
// If then promise has already resolved, the handler is called immediately.
Promise.prototype.whendone = function(handler) {
    if (this.done) {
        if (this.value)
            handler(this.value);
    }
    else {
        if (this.resolveHandlers)
            this.resolveHandlers.push(handler);
        else 
            this.resolveHandlers = [handler];
    }
    return this;  // for chainability
};

// Add a handler to be invoked if the promise is broken.
// If then promise has already been broken, the handler is called immediately.
Promise.prototype.onfail = function(handler) {
    if (this.done) {
        if (this.error)
            handler(this.error);
    }
    else {
        if (this.rejectHandlers)
            this.rejectHandlers.push(handler);
        else 
            this.rejectHandlers = [handler];
    }
    return this;  // for chainability
};

// Return a promise to call next() with the value of this promise.
// The value returned by next() is used to resolve the returned promise.
Promise.prototype.then = function(next) {
    var p = new Promise();

    this.whendone(function(value) { p.resolve(next(value)); });
    this.onfail(function(error) { p.reject(error); });

    return p;
};

// Use this to make a synchronous value seem asynchronous
Promise.value = function(value) {
    var p = Promise();
    p.resolve(value);
    return p;
};

// Given an array of promises, return a promise for an array of 
// the values that each of the promises resolve to.
// If any one of the individual promises is rejected, then
// the joined promise is rejected and no successful values are returned.
Promise.join = function(promises) {
    var joinedPromise = Promise();

    var numPromises = promises.length;
    var numResolved = 0;
    var values = [];

    promises.forEach(function(p, index) {
        p.whendone(function(value) {
            values[index] = value;
            if (++numResolved === numPromises) 
                joinedPromise.resolve(values);
        });
        p.onfail(function(error) {
            joinedPromise.reject(error);
        });
    });

    return joinedPromise;
};


//
// Start opening the IndexedDB with the given name and version
// and return a Promise that will be resolved with the database object
// when it is ready.
// 
// If the database does not exist yet, or if its version number is
// lower, then the init() function will be called to initialize the
// database.  init() must itself return a promise.
//
function getDB(name, version, init) {
    var p = new Promise();
    var r = window.mozIndexedDB.open(name, version);
    var initialized = true; // Assume db is already initialized

    // This is called if the db doesn't exist or has a lower version number
    r.onupgradeneeded = function(e) {
        initialized = false; // DB is not initialized yet
        var db = r.result;
        init(db).whendone(function(v) { p.resolve(db); });
    };

    r.onsuccess = function(e) {
        var db = r.result;
        if (initialized)   // If the db is initialized
            p.resolve(db); // resolve the promise
    };

    r.onerror = function(e) {
        p.reject(e);
    };

    return p;
}

// Return a Promise to get the specified URL as a Blob
function getBlob(url) {
    var p = new Promise();
    var r = new XMLHttpRequest();
    r.open('GET', url);
    r.responseType = 'blob';
    r.send();
    r.onload = function() {
        if (r.status === 200) {
            p.resolve(r.response);
        }
        else {
            p.reject(r.status + ' ' + r.statusText + ' for ' + url);
        }
    }
    r.onerror = r.onabort = r.ontimeout = function(e) {
        p.reject(e.type + ' while fetching ' + url);
    };

    return p;
}

// Given an array of URLs, return a Promise for a matching array of blobs
function getBlobs(urls) {
    var promises = urls.map(function(url) { return getBlob(url); });
    return Promise.join(promises);
}


function $(id) { return document.getElementById(id); }
function elt(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) {
        for(var a in attrs)
            e.setAttribute(a, attrs[a]);
    }

    if (kids) {
        if (typeof kids === "string") {
            e.appendChild(document.createTextNode(kids));
        }
        else if (Array.isArray(kids)) {
            kids.forEach(function(k) {
                if (typeof k === "string")
                    e.appendChild(document.createTextNode(k));
                else
                    e.appendChild(k);
            });
        }
        else {
            e.appendChild(kids);
        }
    }

    return e;
}