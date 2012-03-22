
GAIA_DIR?=$(CURDIR)
B2G_HOMESCREEN=file://$(GAIA_DIR)/homescreen.html

PROFILE_DIR?=$(CURDIR)

MOZ_TESTS = "$(MOZ_OBJDIR)/_tests/testing/mochitest"
INJECTED_GAIA = "$(MOZ_TESTS)/browser/gaia"

TEST_PATH=gaia/tests/${TEST_FILE}

mochitest:
	echo "Checking if the mozilla build has mochitests enabled..."
	test -d $(MOZ_TESTS) || (echo "Please ensure you don't have |ac_add_options --disable-tests| in your mozconfig." && exit 1)
	echo "Checking the injected Gaia..."
	test -L $(INJECTED_GAIA) || ln -s $(GAIA) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS=--browser-arg=""

# The targets below all require adb
# It should be in your path somewhere, or you can edit this line
# to specify its location.
ADB?=adb


# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use the install-gaia target of the B2G Makefile. But if you're
# working on just gaia itself, and you already have B2G firmware on your
# phone, and you have adb in your path, then you can use this target to
# update the gaia files and reboot b2g

PROFILE := $$($(ADB) shell ls -d /data/b2g/mozilla/*.default | tr -d '\r')
PROFILE_DATA := profile
.PHONY: install-gaia
install-gaia: copy-manifests
	$(ADB) start-server
	$(ADB) shell rm -r /data/local/*
	@for file in $$(ls $(PROFILE_DATA)); \
	do \
		data=$${file##*/}; \
		echo Copying $$data; \
		$(ADB) shell rm -r $(PROFILE)/$$data; \
		$(ADB) push profile/$$data $(PROFILE)/$$data; \
	done
	@for i in $$(ls); do $(ADB) push $$i /data/local/$$i; done
	@echo 'Rebooting b2g now'
	$(ADB) shell killall b2g

# Copy the app manifest files to the profile dir where the
# mozApps API can find them. For desktop usage, you must create
# a symbolic link from your profile directory to $GAIA/profile/webapps
copy-manifests:
	@mkdir -p profile/webapps
	@cp apps/webapps.json profile/webapps
	@cd apps; \
	for d in `find * -type d -maxdepth 0` ;\
	do \
		mkdir -p ../profile/webapps/$$d; \
		cp $$d/manifest.json ../profile/webapps/$$d  ;\
	done

# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
.PHONY: delete-databases
delete-databases:
	$(ADB) shell rm -r /data/b2g/mozilla/*.default/indexedDB/*

# Take a screenshot of the device and put it in screenshot.png
.PHONY: screenshot
screenshot:
	mkdir screenshotdata
	$(ADB) pull /dev/graphics/fb0 screenshotdata/fb0 
	dd bs=1920 count=800 if=screenshotdata/fb0 of=screenshotdata/fb0b
	ffmpeg -vframes 1 -vcodec rawvideo -f rawvideo -pix_fmt rgb32 -s 480x800 -i screenshotdata/fb0b -f image2 -vcodec png screenshot.png
	rm -rf screenshotdata

# Port forwarding to use the RIL daemon from the device
.PHONY: forward
forward:
	$(ADB) shell touch /data/local/rilproxyd
	$(ADB) shell killall rilproxy
	$(ADB) forward tcp:6200 localreserved:rilproxyd

# Build the offline cache database
.PHONY: offline
offline:
	$(MOZ_OBJDIR)/dist/bin/run-mozilla.sh $(MOZ_OBJDIR)/dist/bin/xpcshell -e 'const GAIA_DIR = "$(GAIA_DIR)"; const PROFILE_DIR = "$(PROFILE_DIR)"' offline-cache.js
