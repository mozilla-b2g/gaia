
B2G_HOMESCREEN=file://${GAIA}/homescreen.html
INJECTED_GAIA = "$(MOZ_OBJDIR)/_tests/testing/mochitest/browser/gaia"
TEST_PATH=gaia/tests/${TEST_FILE}


mochitest:
	test -L $(INJECTED_GAIA) || ln -s $(GAIA) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS=--browser-arg=""

# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use the install-gaia target of the B2G Makefile. But if you're
# working on just gaia itself, and you already have B2G firmware on your
# phone, and you have adb in your path, then you can use this target to
# update the gaia files and reboot your phone
ADB=adb

PROFILE := $$($(ADB) shell ls -d /data/b2g/mozilla/*.default | tr -d '\r')
PROFILE_DATA := profile
.PHONY: install-gaia
install-gaia: 
	$(ADB) start-server
	@for file in $$(ls $(PROFILE_DATA)); \
	do \
		data=$${file##*/}; \
		echo Copying $$data; \
		$(ADB) shell rm -r $(PROFILE)/$$data; \
		$(ADB) push profile/$$data $(PROFILE)/$$data; \
	done
	@for i in $$(ls); do $(ADB) push $$i /data/local/$$i; done
	echo 'Rebooting phone now'
	$(ADB) reboot

# Erase all the indexedDB databases on the phone, so 
# apps have to rebuild them.
.PHONY: delete-databases
delete-databases:
	$(ADB) shell rm -r /data/b2g/mozilla/*.default/indexedDB/*