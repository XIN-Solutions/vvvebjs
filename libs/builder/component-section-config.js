(function() {

    const debug = false;

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
            <div class="modal fade" id="${MODAL_ID}" tabindex="-1" role="dialog" aria-labelledby="${MODAL_ID}Label" aria-hidden="true">
              <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document" style="height: auto">
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

            // wait for dom to settle and initialize configuration
            setTimeout(async () => {
                const formEl = bodyEl.querySelector('form');

                const resolverPromise = new Promise((resolve, _) => {

                    const formConfig = {
                        detail: {
                            config: componentConfig.config,
                            configResolver: resolve
                        },
                    };

                    // load configuration and provide configuration resolver promise to alpine component
                    // this will invoke @set on the alpine component on the form element.
                    formEl.dispatchEvent(new CustomEvent("set", formConfig));
                });

                // now we wait for someone to resolve the `configResolver` promise from within the dialog
                const outgoingDialogConfig = await resolverPromise;
                resolve(outgoingDialogConfig);
            }, 0);

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
                debug && console.log("[SectionConfigButtonInput] Successfully retrieved dialog content");
                return data;
            }
            else {
                debug && console.log("[SectionConfigButtonInput] Couldn't retrieve dialog content:", data);
                return null;
            }
        }
        catch (err) {
            console.error("[SectionConfigButtonInput] Couldn't retrieve the dialog content.");
            return null;
        }
    }

    /**
     * Attempt to safely parse the JSON
     * @param jsonStr {string} the json string to parse
     * @param defaultValue {*} the value that will be returned if something goes wrong.
     * @returns {*} the parsed value, or defaultValue if something wentw rong.
     */
    function safeJsonParse(jsonStr, defaultValue = undefined) {
        try {
            return JSON.parse(jsonStr);
        }
        catch (err) {
            console.log("[component-section-config] couldn't parse the json, returning default value. Caused by:", err.message);
            return defaultValue;
        }
    }

    /**
     * Call into /sections/parse-model to parse the section we're modifying and extract
     * the current model from it based on the currently annotated HTML.
     *
     * @param section {Element} the section element to parse
     * @returns {Promise<any|null>} the model
     */
    async function parseCurrentModel(section) {
        // parse the current section
        const parsedModelResponse = await fetch("/sections/parse-model", {
            method: "post",
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({html: section.outerHTML})
        });

        const parsedModel = await parsedModelResponse.json();
        if (parsedModel?.success) {
            return parsedModel?.section?.model;
        }
        return null;
    }

    /**
     * Render a section by first parsing the model captured by the current HTML, then calling the render endpoint with
     * that model and the `newConfig` values as its values.
     *
     * @param sectionEl {Element} the HTML element to analyse and replace
     * @param themeId {string} the theme identifier to render the section with.
     * @param group {string} the component group for this element
     * @param component {string} the component name for this element
     * @param newConfig {*} the new configuration to use for rendering.
     */
    async function renderSectionWithConfig(sectionEl, themeId, group, component, newConfig) {
        showLoadingAnimation();

        const ownerDoc = sectionEl.ownerDocument;

        try {

            const parsedModel = await parseCurrentModel(sectionEl);
            if (parsedModel == null) {
                alert("Could not parse the model for this section. Stopping to prevent data loss.");
                return;
            }

            // URL to request the new section from
            let params;
            if (meta?.page?.pageId) {
                params = '?pageId=' + meta.page.pageId;
            }

            const sectionUrl = `/sections/${themeId}/${group}/${component}/render` + (params ?? '');

            const sectionHtmlResponse = await fetch(sectionUrl, {
                method: 'post',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: parsedModel,
                    config: newConfig
                })
            });

            const sectionHtml = await sectionHtmlResponse.text();
            debug && console.log("Retrieved HTML: ", sectionHtml);

            // place section HTML inside a temporary div, so we can retrieve the section's inner HTML
            const tmpDiv = document.createElement('div');
            tmpDiv.innerHTML = sectionHtml;
            const innerElement = tmpDiv.firstElementChild;

            // copy across attributes from section
            for (const attr of innerElement.attributes) {
                if (!attr.name.startsWith('@')) {
                    sectionEl.setAttribute(attr.name, attr.value);
                }
            }

            // copy across new inner html.
            sectionEl.innerHTML = innerElement.innerHTML;

            // notify the body that a section was updated. There may be additional JavaScript
            // behaviours that need to execute (for example: a gallery requiring initialisation)
            ownerDoc.dispatchEvent(new CustomEvent("onSectionChange", {
                added: false,
                modified: true,
                section
            }));

            // hide the highlighted box.
            hideHighlightBox();
            Vvveb.Builder.selectNode(sectionEl);
            Vvveb.Builder.reloadComponent();
        }
        finally {
            hideLoadingAnimation();
        }
    }

    /**
     * Resolve section configuration context from a section element.
     *
     * @param sectionEl {Element} the section element
     * @returns {{ themeId: string, group: string, component: string, componentConfig: object, dialogUrl: string, componentInfo: { group: string, component: string, config: object } }|null}
     */
    function resolveSectionConfigContext(sectionEl) {
        const themeId = typeof meta !== "undefined" && meta?.theme?.id ? meta.theme.id : null;
        const componentAttr = sectionEl?.getAttribute?.("data-section-component");
        const componentConfig = safeJsonParse(sectionEl?.getAttribute?.("data-section-config"), {});
        const isBodyChild = sectionEl?.parentElement === sectionEl?.ownerDocument?.body;

        if (!themeId || !componentAttr || !isBodyChild) {
            return null;
        }

        const parts = componentAttr.split("/");
        const group = parts[0];
        const component = parts[1];

        if (!group || !component) {
            return null;
        }

        const dialogUrl = createDialogDetailsUrl(themeId, group, component);

        return {
            themeId,
            group,
            component,
            componentConfig,
            dialogUrl,
            componentInfo: {
                group,
                component,
                config: componentConfig
            }
        };
    }

    /**
     * Fetch dialog content, open the configuration modal, and re-render the section on Update.
     *
     * @param sectionEl {Element} the section element
     * @param prefetchedDialogData {object|undefined} optional pre-fetched dialog response
     * @returns {Promise<boolean>} true when the dialog was opened and updated
     */
    async function tryOpenSectionConfigDialog(sectionEl, prefetchedDialogData) {
        const context = resolveSectionConfigContext(sectionEl);
        if (!context) {
            return false;
        }

        const dialogData = prefetchedDialogData ?? await fetchDialogContent(context.dialogUrl);
        if (!dialogData) {
            return false;
        }

        const newConfig = await openSectionConfigModal(
            dialogData,
            "Component Configuration",
            context.componentInfo
        );

        await renderSectionWithConfig(
            sectionEl,
            context.themeId,
            context.group,
            context.component,
            newConfig || {}
        ).catch(
            (err) => console.error("Couldn't re-render section after configuration change", sectionEl, newConfig, err)
        );

        return true;
    }


    /**
     * Configuration definition of section configuration button
     */
    let SectionConfigButtonInput = {

        /**
         * Initialise section button input
         *
         * @param data
         * @param element
         * @returns {HTMLDivElement}
         */
        init: function(data, element) {
            debug && console.log("[SectionConfigButtonInput] Initialising section button: ", data, 'el', element);

            const container = document.createElement("div");
            const btn = createDialogButton(data.key);
            container.appendChild(btn);

            const context = resolveSectionConfigContext(element);
            if (!context) {
                debug && console.log("[SectionConfigButtonInput] Early return - validation failed:", {
                    themeId: typeof meta !== "undefined" && meta?.theme?.id ? meta.theme.id : null,
                    componentAttr: element?.getAttribute?.("data-section-component"),
                    isBodyChild: element?.parentElement === element?.ownerDocument?.body
                });

                return container;
            }

            debug && console.log("[SectionConfigButtonInput] Requesting dialog:", context.dialogUrl);

            fetchDialogContent(context.dialogUrl).then((dialogData) => {
                if (!dialogData) {
                    console.log("Didn't get any dialog data for this component.");
                    return;
                }

                btn.disabled = false;
                ensureSectionConfigModalInDom();

                btn.addEventListener("click", () => {
                    tryOpenSectionConfigDialog(element, dialogData);
                });
            });

            return container;
        },

        setValue: function(value) {
            debug && console.log("[SectionConfigButtonInput] Set value: ", value);
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

    Vvveb.SectionConfig = Vvveb.SectionConfig || {};
    Vvveb.SectionConfig.tryOpenSectionConfigDialog = tryOpenSectionConfigDialog;
    Vvveb.SectionConfig.tryOpen = tryOpenSectionConfigDialog;

})();
