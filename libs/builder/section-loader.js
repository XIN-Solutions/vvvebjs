(async function() {

    const DEBUG = true;
    const THEME_ID = meta.theme.id;

    const log = (msg, ...args) => {
        if (DEBUG) {
            console.log("[section-bootstrap] " + msg, ...args);
        }
    };

    async function initializeSection(section) {
        section.setAttribute("data-section-loading", true);
        section.dataset.sectionInitialized = "true";

        const dataSectionComponent = section.getAttribute("data-section-component");

        if (!dataSectionComponent) {
            log("Section missing data-section-component attribute:", section.id);
            return;
        }

        const [group, component] = dataSectionComponent.split("/");
        if (!group || !component) {
            log("Section has invalid data-section-component format (expected 'group/component'):", section.id);
            return;
        }

        if (!THEME_ID) {
            log("Theme ID not set");
            section.innerHTML = '<p style="color: red;">Error: theme not configured</p>';
            return;
        }

        log("Initializing section:", section.id, "group:", group, "component:", component);

        let model = {};
        try {
            const raw = section.getAttribute("data-section-model");
            if (raw) model = JSON.parse(raw);
        } catch (e) {}

        const url = "/sections/" + encodeURIComponent(THEME_ID) + "/" + encodeURIComponent(group) + "/" + encodeURIComponent(component) + "/render";

        log("Fetching section from URL:", url);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: model, config: {} })
            });
            log("Fetch response status:", response.status);

            if (!response.ok) {
                throw new Error("Failed to render section: " + response.status);
            }

            const html = await response.text();
            log("Received HTML length:", html.length);

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const newContent = doc.body.firstChild || doc.body;

            newContent.setAttribute("data-section-initialized", true);

            section.outerHTML = newContent.outerHTML || html;
            log("Section rendered successfully:", section.id);
        }
        catch (err) {
            console.error("[section-bootstrap] Failed to render section:", err);
            section.innerHTML = '<p style="color: red;">Error loading section: ' + err.message + '</p>';
        }
    }

    function setupSectionObserver(targetDocument) {
        log("Setting up MutationObserver on document:", targetDocument.title || "iframe");

        setInterval(() => {
            targetDocument.body
                .querySelectorAll("[data-section-component]")
                .forEach((section) => {
                    if (section.hasAttribute("data-section-initialized") || section.hasAttribute("data-section-loading")) {
                        return;
                    }
                    initializeSection(section);
                });
        }, 100);
    }

    if (typeof Vvveb !== "undefined" && Vvveb.Builder) {

        const sleep = (ms) => new Promise((resolve, reject) => {
            setTimeout(resolve, ms);
        });

        // wait for the framedoc to load. not great, but better than shimming.
        while (!Vvveb.Builder.frameDoc) {
            await sleep(100);
        }

        if (Vvveb.Builder.frameDoc && Vvveb.Builder.frameDoc.body) {
            log("Iframe already available, setting up observer immediately");
            setupSectionObserver(Vvveb.Builder.frameDoc);
        }
    }

})().catch(err => console.error(err));