# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=email` from the root gaia directory.)
endif

-include $(PWD)/build/common.mk

ifeq ($(GAIA_OPTIMIZE), 1)
	GAIA_EMAIL_MINIFY?=uglify2
else
	GAIA_EMAIL_MINIFY?=none
endif

.PHONY: all clean $(STAGE_APP_DIR)/js/mail_app.js

all: $(STAGE_APP_DIR)/js/mail_app.js
clean:
	rm -rf $(STAGE_APP_DIR)

$(STAGE_APP_DIR)/js/mail_app.js:
	@rm -rf $(STAGE_APP_DIR)
	@mkdir -p $(STAGE_APP_DIR)/shared/js

	cp -p ../../shared/js/*.js $(STAGE_APP_DIR)/shared/js
	cp -rp ../../shared/style $(STAGE_APP_DIR)/shared

	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/email.build.js optimize=$(GAIA_EMAIL_MINIFY)
	@rm -rf $(STAGE_APP_DIR)/build
	@rm $(STAGE_APP_DIR)/build.txt
	@rm $(STAGE_APP_DIR)/js/tmpl_builder.js
	@rm -rf $(STAGE_APP_DIR)/Makefile
	@rm $(STAGE_APP_DIR)/README.md
	@rm -rf $(STAGE_APP_DIR)/test
	$(XULRUNNERSDK) $(XPCSHELLSDK) build/make_gaia_shared.js
