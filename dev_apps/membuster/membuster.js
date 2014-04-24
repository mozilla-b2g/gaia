var arr = [];
function bustSysmem() {
  setInterval(allocChunk, 1000);
}

var chunks = [ ]; // root the chunks
var nextChunkMB = 32;
var totalAllocMB = 0;
function allocChunk() {
  var allocSizeMB = nextChunkMB * 1024 * 1024;
  var array = new ArrayBuffer(allocSizeMB);

  // Ensure all pages are committed.
  var view = new Int32Array(array);
  for (var j = 0; j < view.length; j += 1024) {
    view[j] = 42;
  }

  totalAllocMB += nextChunkMB;
  log("Allocated "+ nextChunkMB +"MB; total so far is "+ totalAllocMB+ "MB");

  if (nextChunkMB > 1) {
    nextChunkMB >>= 1
  }

  chunks.push(array);
}

function bustGfxmem() {
  setInterval(allocCanvas, 1000);
}

var totalGfxMB = 0;
function allocCanvas() {
  var c = document.createElement("canvas");
  // We want to allocate 1MB of gfx mem.  Canvases are double buffered
  // and default to RGBA.  So we create one with 128K pixels.
  var w = 128, h = 1024;
  c.width = w;
  c.height = h;

  var ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
  ctx.rect(0, 0, w, h);
  ctx.fill();

  ++totalGfxMB;
  log("Allocated 1MB gfx memory; total so far is ~"+ totalGfxMB +"MB");

  document.getElementById("canvases").appendChild(c);
}

var logElt;
function log(msg) {
  if (!logElt) {
    logElt = document.getElementById("log");
  }
  logElt.textContent = msg;
  console.log(msg);
}

window.onload = function() {
  document.getElementById("sys").onclick = function() { bustSysmem(); };
  document.getElementById("gfx").onclick = function() { bustGfxmem(); };
};
