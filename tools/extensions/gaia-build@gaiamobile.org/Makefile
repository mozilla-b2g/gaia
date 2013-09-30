xpi:
	zip gaia-build@gaiamobile.org.xpi -r bootstrap.js install.rdf chrome.manifest content/

run:
	mkdir -p profile/extensions/
	echo "../../" > profile/extensions/gaia-build@gaiamobile.org
	$(FIREFOX) -profile $(shell pwd)/profile -no-remote about:gaia
