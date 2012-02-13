// Video database schema:
// Database name: 'videos'
//   Object store: 'videos'
//     Record type: {
//        title: string
//        video: video blob
//        poster: image blob
//     }
//     Keypath: 'title'
// 

// The sample videos that we'll pre-install
const samples = [
    {
        title: 'Mozilla Manifesto',
        video: 'samples/manifesto.ogv',
        poster: 'samples/manifesto.png',
    },
    {
        title: 'Meet The Cubs',
        video: 'samples/meetthecubs.webm',
        poster: 'samples/meetthecubs.png',
    }
];

// When the document loads, get the videos database (version 1) and pass
// it to initUI. The first time we run, the DB will need to be created and
// populated with sample videos, so initDB will be called to do that.
window.addEventListener('DOMContentLoaded', function() {
    getDB('videos', 1, initVideosDB).whendone(buildUI);
});

// Return a promise to initialize the database
function initVideosDB(db) {
    var initDBPromise = Promise();

    if (db.objectStoreNames.contains('videos'))
        db.deleteObjectStore('videos');

    db.createObjectStore('videos', {
        keyPath: 'title'
    });

    // Now go fetch the sample video and poster data
    // And when it arrives, store it in the db

    var urls = [];  // URLs of the videos and poster images we need

    samples.forEach(function(s) { urls.push(s.video, s.poster); });

    getBlobs(urls)
        .then(function(blobs) {
            // Take the blobs and store them back into the 
            // samples array, overwriting the URLs from which they came
            for(var i = 0; i < samples.length; i++) {
                samples[i].video = blobs[i*2];
                samples[i].poster = blobs[i*2+1];
            }
            // Then return a promise to store the samples in the db
            return storeSamples(db, samples);
        })
        .whendone(function(v) { initDBPromise.resolve(); })
        .onfail(function(e) { initDBPromise.reject(e); });

    // Return a Promise to store all of the samples into the db
    function storeSamples(db) {
        var transaction = db.transaction("videos", IDBTransaction.READ_WRITE);
        var store = transaction.objectStore("videos");
        var promises = samples.map(function(s) { return storeSample(store,s); })
        return Promise.join(promises);
    }

    // Return a Promise to store a single sample record
    function storeSample(store, sample) {
        var p = Promise();
        var request = store.put(sample);
        request.onsuccess = function() { p.resolve(); };
        request.onerror = function(e) { p.reject(e); };
        return p;
    }

    return initDBPromise;
}

function buildUI(db) {
    var titles = [];
    var transaction = db.transaction('videos', IDBTransaction.READ_ONLY);
    var store = transaction.objectStore('videos');
    var cursor = store.openCursor(IDBKeyRange.lowerBound(0));
    cursor.onsuccess = function() {
        if (!cursor.result) {
            // no more values, so return without calling continue
            return; 
        }
        var record = cursor.result.value;
        insertPoster(record.title, record.poster, record.video);
        cursor.result.continue();
    };
        
    cursor.onerror = function(e) {
        promise.reject(e);
    };
}

function insertPoster(title, posterblob, videoblob) {

    var posterurl = window.URL.createObjectURL(posterblob);
    var videourl = window.URL.createObjectURL(videoblob);

    var poster = elt("li", { title: title },
                     elt('a', { href: '#'}, 
                         elt('img', {
                             src: posterurl,
                             'class': 'thumbnail'
                         })));

    poster.addEventListener("click", function(e) {
        showPlayer(videourl);
    });
    
    $('thumbnails').appendChild(poster);
}

// if this is true then the video tag is showing
// if false, then the gallery is showing
var playerShowing = false;

// Switch to the video gallery view
function showGallery() {
    $('thumbnails').classList.remove('hidden');
    $('videoFrame').classList.add('hidden');

    // If there is a player element, remove it
    $('videoBorder').innerHTML = '';

    playerShowing = false;
}

// Switch to the video player view and play the video!
function showPlayer(url) {
    $('thumbnails').classList.add('hidden');
    $('videoFrame').classList.remove('hidden');
    playerShowing = true;

    var player = elt('video', {
        id: 'player',
        src:url,
        autoplay:'autoplay',
        controls:'controls'
    });
    $('videoBorder').appendChild(player);

    setTimeout(function() {
        player.setAttribute('data-visible', 'true');
    }, 100);
}

window.addEventListener('keypress', function(evt) {
    if (playerShowing && evt.keyCode == evt.DOM_VK_ESCAPE) {
        showGallery();
        evt.preventDefault();
    }
});
