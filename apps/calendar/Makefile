-include $(PWD)/build/common.mk

.PHONY: $(STAGE_APP_DIR)

$(STAGE_APP_DIR):
	rm -rf $(STAGE_APP_DIR)
	cp -r "$(CURDIR)" "$(STAGE_APP_DIR)"
	@$(call run-js-command,app/build)

.PHONY: web_assets
web_assets:
	web_assets install $$PWD
