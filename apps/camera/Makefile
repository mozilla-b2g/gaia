# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=camera` from the root gaia directory.)
endif

CP_CONFIGURATION_FILE = cp js/config/config-default.js js/config/config.js

ifdef DEVICE_TIER
	ifeq ($(DEVICE_TIER), low)
		CP_CONFIGURATION_FILE = cp $(CURDIR)/js/config/config-lowend.js js/config/config.js
	endif
endif

ifdef GAIA_DISTRIBUTION_DIR
	ifneq ($(wildcard $(GAIA_DISTRIBUTION_DIR)/camera-config.js),)
		CP_CONFIGURATION_FILE = cp $(GAIA_DISTRIBUTION_DIR)/camera-config.js js/config/config.js
	endif
endif

-include $(PWD)/build/common.mk

.PHONY: all $(STAGE_APP_DIR)/js/main.js
all: $(STAGE_APP_DIR)/js/main.js

$(STAGE_APP_DIR):
	mkdir -p $(STAGE_APP_DIR)

$(STAGE_APP_DIR)/js/main.js: | $(STAGE_APP_DIR)
	$(CP_CONFIGURATION_FILE)
	rm -rf $(STAGE_APP_DIR)/style
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/require_config.jslike
