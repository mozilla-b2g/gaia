# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=camera` from the root gaia directory.)
endif

-include $(PWD)/build/common.mk

.PHONY: all $(STAGE_APP_DIR)/js/main.js
all: $(STAGE_APP_DIR)/js/main.js

$(STAGE_APP_DIR):
	mkdir -p $(STAGE_APP_DIR)

$(STAGE_APP_DIR)/js/main.js: | $(STAGE_APP_DIR)
	@$(call run-js-command,app/build)
	rm -rf $(STAGE_APP_DIR)/shared
	rm -rf $(STAGE_APP_DIR)/style
	cp -rp ../../shared $(STAGE_APP_DIR)/
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/require_config.jslike

