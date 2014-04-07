# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=camera` from the root gaia directory.)
endif

-include $(PWD)/build/common.mk

.PHONY: all clean $(STAGE_APP_DIR)/resources/gaia_commit.txt $(STAGE_APP_DIR)/resources/support.json $(STAGE_APP_DIR)/resources/sensors.json $(STAGE_APP_DIR)/js/main.js

all: $(STAGE_APP_DIR)/resources/gaia_commit.txt $(STAGE_APP_DIR)/resources/support.json $(STAGE_APP_DIR)/resources/sensors.json $(STAGE_APP_DIR)/js/main.js

clean:
	rm -rf $(STAGE_APP_DIR)

# Generate a text file containing the current changeset of Gaia
$(STAGE_APP_DIR)/resources/gaia_commit.txt: | $(STAGE_APP_DIR)
	mkdir -p $(STAGE_APP_DIR)/resources
ifneq ($(wildcard ${GAIA_DIR}/gaia_commit_override.txt),)
	cp ${GAIA_DIR}/gaia_commit_override.txt $(STAGE_APP_DIR)/resources/gaia_commit.txt
else ifneq ($(wildcard ${GAIA_DIR}/.git),)
	git --git-dir=${GAIA_DIR}/.git log -1 --format="%H%n%ct" HEAD > $(STAGE_APP_DIR)/resources/gaia_commit.txt
else
	echo 'Unknown Git commit; build date shown here.' > $(STAGE_APP_DIR)/resources/gaia_commit.txt; \
		date +%s >> $(STAGE_APP_DIR)/resources/gaia_commit.txt;
endif

$(STAGE_APP_DIR): clean
	mkdir -p $(STAGE_APP_DIR)

$(STAGE_APP_DIR)/js/main.js: | $(STAGE_APP_DIR)
	cp -rp ../../shared $(STAGE_APP_DIR)/shared
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/require_config.jslike

$(STAGE_APP_DIR)/resources/support.json $(STAGE_APP_DIR)/resources/sensors.json: build/build.js $(STAGE_APP_DIR)
	@$(call run-js-command,app/build)
