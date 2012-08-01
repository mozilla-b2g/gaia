onmessage = function(e) {
  postMessage({
    type: e.data.type,
    imagedata: edit(e.data.imagedata, e.data.edits)
  });
};

function edit(imagedata, edits) {
  var r, g, b, n, i, pixels, gamma;

  // If there is nothing to do, just return unedited pixels
  if (edits.gamma === 1 && edits.effect === 'none')
    return imagedata;

  // Precompute gamma correction
  gamma = new Uint8Array(256);
  for (i = 0; i < 256; i++) {
    if (edits.gamma === 1)
      gamma[i] = i;
    else
      gamma[i] = Math.round(Math.pow(i / 255, edits.gamma) * 255);
  }

  // Loop through all the pixels
  n = imagedata.width * imagedata.height * 4;
  pixels = imagedata.data;
  for (i = 0; i < n; i += 4) {
    // Gamma correct the pixel values
    r = gamma[pixels[i]];
    g = gamma[pixels[i + 1]];
    b = gamma[pixels[i + 2]];

    // Then handle the color effects
    switch (edits.effect) {
    case 'none':
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      break;
    case 'bw':
      pixels[i] = r * 0.299 + g * 0.587 + b * 0.114;
      pixels[i + 1] = pixels[i];
      pixels[i + 2] = pixels[i];
      break;
    case 'sepia':
      pixels[i] = r * .393 + g * .769 + b * .189;
      pixels[i + 1] = r * .349 + g * .686 + b * .168;
      pixels[i + 2] = r * .272 + g * .534 + b * .131;
      break;
    }
  }

  return imagedata;
}
