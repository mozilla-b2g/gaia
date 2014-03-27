# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=email` from the root gaia directory.)
endif

.PHONY: $(STAGE_APP_DIR)/js/startup.js

all: $(STAGE_APP_DIR)/js/startup.js

$(STAGE_APP_DIR)/js/startup.js:
	@rm -rf $(STAGE_APP_DIR)
	@mkdir -p $(STAGE_APP_DIR)
	cp -rp ../../shared $(STAGE_APP_DIR)/shared
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/require_config.jslike
	$(XULRUNNERSDK) $(XPCSHELLSDK) build/make_gaia_shared.js
