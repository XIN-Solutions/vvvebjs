(function() {

    /**
     * Create a dialog button
     * @param buttonKey the name of the component
     * @returns {HTMLButtonElement}
     */
    function createDialogButton(buttonKey) {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-primary";
        btn.disabled = true;
        btn.innerHTML = '<i class="la la-cog la-lg"></i> Component Configuration';
        btn.setAttribute("data-key", buttonKey || "section-config");
        return btn;
    }

    /**
     * Create dialog details url.
     * @param themeId {string} the theme identifier
     * @param group {string} name of the group for this component
     * @param component {string} component identifier.
     * @returns {string} the URL to fetch from.
     */
    function createDialogDetailsUrl(themeId, group, component) {
        return (
            "/sections/" + encodeURIComponent(themeId) +
            "/" + encodeURIComponent(group) +
            "/" + encodeURIComponent(component) +
            "/dialog"
        );
    }

    const MODAL_ID = "SectionConfigModal";

    function getSectionConfigModalHtml() {
        return /*html*/`
            <div class="modal fade flatly-bs" id="${MODAL_ID}" tabindex="-1" role="dialog" aria-labelledby="${MODAL_ID}Label" aria-hidden="true">
              <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title fw-normal" id="${MODAL_ID}Label">Component Configuration</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body section-config-modal-body" style="padding: 30px;"></div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary btn-icon" data-bs-dismiss="modal">
                      <i class="la la-times"></i>
                      <span>Cancel</span>
                    </button>
                    <button type="button" class="btn btn-primary btn-icon" data-section-config-update>
                      <i class="la la-check"></i>
                      <span>Update</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
        `;
    }

    function ensureSectionConfigModalInDom() {
        if (!document.getElementById(MODAL_ID)) {
            document.body.append(generateElements(getSectionConfigModalHtml())[0]);

            const modalEl = document.getElementById(MODAL_ID);

            modalEl.addEventListener("click", (e) => {
                const target = e.target.closest("[data-section-config-update]");
                if (!target) {
                    return;
                }
                e.preventDefault();
                const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                modal.hide();
                displayToast("bg-success", "Updated", "Component configuration updated.");
            });
        }
    }

    function updateButtonCallback(event) {
        const modalForm = event.target.closest(".modal").querySelector("form");
        modalForm.dispatchEvent(new CustomEvent('get'));
    }


    /**
     * Open the section configuration mail
     *
     * @param data {object} the loaded dialog object
     * @param data.html {string} the HTML for this object
     * @param data.success {boolean} the success
     *
     * @param title {string} the title of the dialog
     * @param componentConfig {{ group: string, component: string, config: object }} the configuration of the component
     */
    function openSectionConfigModal(data, title, componentConfig) {
        return new Promise((resolve, reject) => {
            ensureSectionConfigModalInDom();

            const bodyEl = document.querySelector(`#${MODAL_ID} .section-config-modal-body`);
            const titleEl = document.querySelector(`#${MODAL_ID} .modal-title`);
            const updateButtonEl = document.querySelector(`#${MODAL_ID} [data-section-config-update]`);

            if (bodyEl) {
                bodyEl.innerHTML = data.html || "";
            }
            if (titleEl) {
                titleEl.textContent = title || "Component Configuration";
            }


            const modalEl = document.getElementById(MODAL_ID);
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();

            // remove any existing click handlers
            updateButtonEl.removeEventListener("click", updateButtonCallback);

            // add new update click handler
            updateButtonEl.addEventListener("click", updateButtonCallback);

            // wait for dom to settle and initialise configuration
            setTimeout(async () => {
                const formEl = bodyEl.querySelector('form');

                const resolverPromise = new Promise((resolve, _) => {

                    const formConfig = {
                        detail: {
                            config: componentConfig.config,
                            configResolver: resolve
                        },
                    };

                    /*
                      next:

                        ////// -----------------------------

                        3. store configuration onto section
                        4. rerender section html with new config
                     */

                    // load configuration and provide configuration resolver promise to alpine component
                    formEl.dispatchEvent(new CustomEvent("set", formConfig));
                });

                const outgoingDialogConfig = await resolverPromise;
                resolve(outgoingDialogConfig);
            }, 0);

        });

    }

    /**
     * Assign the event handler
     * @param btn {Element} the button to be added to
     * @param data {object}
     * @param data.html {string}
     * @param data.success {boolean}
     * @param componentInfo {{ group: string, component: string, config: object }}
     */
    function assignEventHandlerToButton(btn, data, componentInfo) {
        btn.disabled = false;

        ensureSectionConfigModalInDom();

        btn.addEventListener("click", async () => {
            const dialogCfg = await openSectionConfigModal(data, "Component Configuration", componentInfo);
            console.log("Output: ", dialogCfg);
        });
    }

    /**
     * Fetch the dialog content.
     *
     * @param dialogUrl {string} where to fetch the details from
     * @param btn {Element} where to attach the resulting information to.
     */
    async function fetchDialogContent(dialogUrl) {
        try {
            const response = await fetch(dialogUrl)
            const data = await response.json();
            if (data.success && data.html) {
                console.log("[SectionConfigButtonInput] Successfully retrieved dialog content");
                return data;
            }
            else {
                console.log("[SectionConfigButtonInput] Couldn't retrieve dialog content:", data);
                return null;
            }
        }
        catch (err) {
            console.error("[SectionConfigButtonInput] Couldn't retrieve the dialog content.");
            return null;
        }
    }

    let SectionConfigButtonInput = {

        /**
         * Initialise section button input
         *
         * @param data
         * @param element
         * @returns {HTMLDivElement}
         */
        init: function(data, element) {
            console.log("[SectionConfigButtonInput] Initialising section button: ", data, 'el', element);

            const container = document.createElement("div");
            const btn = createDialogButton(data.key);
            container.appendChild(btn);

            // extract relevant information from context.
            const themeId = typeof meta !== "undefined" && meta?.theme?.id ? meta.theme.id : null;
            const componentAttr = element?.getAttribute?.("data-section-component");
            const isBodyChild = element?.parentElement === element?.ownerDocument?.body;

            if (!themeId || !componentAttr || !isBodyChild) {
                console.log("[SectionConfigButtonInput] Early return - validation failed:", {
                    themeId: themeId,
                    componentAttr: componentAttr,
                    isBodyChild: isBodyChild
                });

                return container;
            }

            // extract component name information from component attribute.
            const parts = componentAttr.split("/");
            const group = parts[0];
            const component = parts[1];

            // validate they are correct.
            if (!group || !component) {
                console.log("[SectionConfigButtonInput] Invalid component format - missing group or component:", {
                    componentAttr: componentAttr,
                    group: group,
                    component: component
                });

                return container;
            }

            const dialogUrl = createDialogDetailsUrl(themeId, group, component);
            console.log("[SectionConfigButtonInput] Requesting dialog:", dialogUrl);

            // go get the dialog
            fetchDialogContent(dialogUrl)
                .then((dialogData) => {

                    // nothing retrieved? exit.
                    if (!dialogData) {
                        console.log("Didn't get any dialog data for this component.");
                        return;
                    }

                    // TODO: get the component info
                    const componentInfo = {
                        group,
                        component,
                        config: {
                            "badgeType": "danger",
                            "imagePosition": "right",
                            "displayMode": "detailed",
                            "enableAnimation": true,
                            "featureTitle": "Lorem ipsum dolor sit amet. 1",
                            "featureDescription": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus ullamcorper, dui vitae ullamcorper rutrum. 2"
                        }
                    };

                    // assign to modal button.
                    assignEventHandlerToButton(btn, dialogData, componentInfo);
                });

            return container;
        },

        setValue: function(value) {
            console.log("[SectionConfigButtonInput] Set value: ", value);
        },
    };

    const SectionConfigComponent = {
        name: "Section Config",
        attributes: ["data-section-component"],
        image: "icons/icon.svg",

        properties: [
            {
                name: "",
                key: "section-config",
                sort: 0,
                inputtype: SectionConfigButtonInput,
                data: {
                    text: "Component Configuration"
                }
            }
        ]
    };

    Vvveb.Components.add("elements/section-config", SectionConfigComponent);
    // Vvveb.Components.extend("_base", "_base", SectionConfigComponent);

})();
