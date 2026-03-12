
(function() {

    const debug = false;

    const DefaultItems = [
        {
            value: null,
            text: "Select Item To Show"
        },
    
    ];
    
    /**
     * Initialise the multiple section selections
     */
    function initialiseMultipleSection(node) {
        const nodeItems = node?.multiple?.getItems() ?? [];

        const tiles = nodeItems.map((item) => ({
            value: item.index, 
            text: item.title
        }));

        debug && console.log("mulsection init", node, tiles);

        const select = document.querySelector('[data-key="item-number"] select');

        setTimeout(() => {
            select.innerHTML = '';
            [...DefaultItems, ...tiles].forEach(item => {
                const option = document.createElement('option');
                option.value = item.value;
                option.text = item.text;
                select.appendChild(option);
            });
        }, 0);

    }

    const ComponentMultipleHandler = {
    
        name: "Multiple Section",
        attributes: ['data-multiple'],
        image: "icons/stream-solid.svg",

        init: initialiseMultipleSection,
    
        properties: [
            {
                name: "Item",
                key: "item-number",
                sort: base_sort++,
                inputtype: SelectInput,
    
                data: {
                    options: DefaultItems,
                },
    
                /**
                 * Someone selected the dropdown option? 
                 */
                onChange: function(node, value) {
                    node?.multiple?.showItem(value);
                    return node;
                }
    
            },

            {
                name: "",
                key: "item-remove",
                sort: base_sort++,
                inputtype: ButtonInput,
                events: ['click'],
                data: {
                    text: "Remove Item", 
                    icon: "la-minus",
                },		
    
                onChange: function(node) {
                    const dropdown = document.querySelector('[data-key="item-number"] select');
                    node?.multiple?.removeItem(dropdown.value);
                    initialiseMultipleSection(node);
                    return node;
                },

            },

            {
                name: "",
                key: "item-add",
                sort: base_sort++,
                inputtype: ButtonInput,
                events: ['click'],
                data: {text:"Add Item", icon:"la-plus"},		
    
                onChange: function(node) {
                    node?.multiple?.addItem();
                    initialiseMultipleSection(node);
                    return node;
                },

            }
        ]   
    };



    /**
     * Just before 'save' is executed, we need to destroy the slick instance so that we can scrape the 'real' html
     */
    document.addEventListener("onSaveRequest", function(event) {
        let doc = event.detail?.pageDoc;
        const multiples = [...doc.querySelectorAll("[data-multiple]")];
        for (const el of multiples) {
            const multiple = el.multiple;
            if (!multiple) {
                continue;
            }

            multiple.destroy();
        }
    });
    
    /**
     * Then after we got the HTML, let's reinitialise it so the user can interact with it again.
     */
    document.addEventListener("onSaveComplete", function(event) {
        let doc = event.detail?.pageDoc;
        const multiples = [...doc.querySelectorAll("[data-multiple]")];
        for (const el of multiples) {
            const multiple = el.multiple;
            if (!multiple) {
                continue;
            }
            multiple.reinitialise();
        }
    });
    
    /**
     * Register the multiple section logic.
     */
    Vvveb.Components.add("elements/multiple-section", ComponentMultipleHandler);
    

})();
