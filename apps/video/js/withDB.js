
// Open the named database named dbname and pass it to f().
// If the database doesn't exist or if its version is less than the 
// requested version, then call init() to initialize the db.
// f will be passed to init(), so init can invoke it when ready
// 
// Should I used something like Q.js or jQuery deferreds instead here?
// 
function withDB(name, version, f, init) {
    var r = window.mozIndexedDB(name, version);
    var initialized = true; // Assume db is already initialized

    // This is called if the db doesn't exist or has a lower version number
    r.onupgradeneeded = function(e) {
        initialized = false; // DB is not initialized yet
        init(r.result, f);   // Init it, then call if
    };

    r.onsuccess = function(e) {
        if (initalized)   // If the db is initialized
            f(r.result);  // Pass it to f()
    };

    r.onerror = function(e) {
        console.log('Error opening ' + name + ' database.',
                    e.code, e.message);
    }
}


// Use XHR to HTTP GET all of the URLs in the urls[] array.
// Then invoke success(), passing an object that maps URLs to blobs.
// If any of the XHR requests fails, call error() with an error message.
function fetchBlobs(urls, success, error) {
    var blobs = {};
    var numURLs = urls.length;
    var numBlobs = 0;

    urls.forEach(function(url) {
        var r = new XMLHttpRequest();
        r.open('GET', url);
        r.responseType = 'blob';
        r.send();

        r.onload = function() {
            if (r.status !== 200) {
                error(r.status + ': ' + r.statusText + ' for ' + url); 
                return;
            }

            blobs[url] = r.response;
            if (++numBlobs === numURLs) 
                success(blobs);
        };
        r.onerror = r.onabort = r.ontimeout = function(e) {
            error(e.type + ' while fetching ' + url);
        };
    });
}
