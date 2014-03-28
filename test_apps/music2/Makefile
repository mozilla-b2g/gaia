METADATA_SCRIPTS = \
 ../../shared/js/blobview.js \
 js/metadata.js

concatenated_scripts: js/metadata_scripts.js

js/metadata_scripts.js: Makefile $(METADATA_SCRIPTS)
	cat $(METADATA_SCRIPTS) > js/metadata_scripts.js
