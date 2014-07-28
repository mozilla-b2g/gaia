# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=gallery` from the root gaia directory.)
endif

ifdef GAIA_DISTRIBUTION_DIR
	ifneq ($(wildcard $(GAIA_DISTRIBUTION_DIR)/gallery-config.js),)
		CP_USER_CONFIGURATION = cp $(GAIA_DISTRIBUTION_DIR)/gallery-config.js js/config/config.js
	endif
endif

ifeq ($(GAIA_OPTIMIZE), 1)
	GAIA_GALLERY_MINIFY?=uglify
else
	GAIA_GALLERY_MINIFY?=none
endif

-include $(PWD)/build/common.mk

.PHONY: all $(STAGE_APP_DIR)/js/main.js
all: $(STAGE_APP_DIR)/js/main.js

$(STAGE_APP_DIR):
	mkdir -p $(STAGE_APP_DIR)

$(STAGE_APP_DIR)/js/main.js: | $(STAGE_APP_DIR)
	$(CP_USER_CONFIGURATION)
	rm -rf $(STAGE_APP_DIR)/style
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/require_config.jslike optimize=$(GAIA_GALLERY_MINIFY)
