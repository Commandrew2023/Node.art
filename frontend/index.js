
const UI = {
    panes : {
        open : false
    },
    controller : {
        element_dropdowns : [],
        open : false
    },
    selectRibbon : function (name) {
        const ribbons = document.querySelectorAll(".ribbon");
        for (let r = 0; r < ribbons.length; r++) {
            const ribbon = ribbons[r];
            if (ribbon.getAttribute('ribbon') !== name) {
                ribbon.style.display = "none";
            } else {
                ribbon.style.display = "flex";
            }
        }
        const ribbon_buttons = document.querySelectorAll(".navbar-button");
        for (let b = 0; b < ribbon_buttons.length; b++) {
            const btn = ribbon_buttons[b];
            if (btn.getAttribute('ribbon') !== name) {
                btn.setAttribute("selected", "false");
            } else {
                btn.setAttribute("selected", "true");
            }
        }
    },
    selectPanelPage : function (name) {
        const panel_pages = document.querySelectorAll(".panel-page");
        for (let p = 0; p < panel_pages.length; p++) {
            const panel_page = panel_pages[p];
            if (panel_page.getAttribute('page') !== name) {
                panel_page.style.display = 'none';
            } else {
                panel_page.style.display = 'flex';
            }
        }
        const panel_page_buttons = document.querySelectorAll(".controller-button");
        for (let b = 0; b < panel_page_buttons.length; b++) {
            const btn = panel_page_buttons[b];
            if (btn.getAttribute('page') !== name) {
                btn.setAttribute("selected", "false");
            } else {
                btn.setAttribute("selected", "true");
            }
        }

        // Reset controller element addition
        Interactor.controller.adding.isActive = false;
        
    }
};

UI.selectRibbon('Save');
UI.selectPanelPage('Elements');

/* EVENT HANDLERS FOR LEFT & RIGHT PANEL BUTTONS */
(function () {
    const openPanelLeft = document.querySelector(".panel-button[side='left']");
    openPanelLeft.addEventListener('click', (e) => {
        const panesEl = document.querySelector("#panes");
        UI.panes.open = !UI.panes.open;
        if (UI.panes.open) {
            panesEl.style.animation = 'panesAppear 0.5s';
            openPanelLeft.innerHTML = `<span class='material-symbols-outlined'>arrow_back</span>`;
        } else {
            panesEl.style.animation = 'panesDisappear 0.5s';
            openPanelLeft.innerHTML = `<span class='material-symbols-outlined'>arrow_forward</span>`;
        }
    });
    const openPanelRight = document.querySelector(".panel-button[side='right']");
    openPanelRight.addEventListener('click', (e) => {
        const controllerEl = document.querySelector("#controller");
        UI.controller.open = !UI.controller.open;
        if (UI.controller.open) {
            controllerEl.style.animation = 'controllerAppear 0.5s';
            openPanelRight.innerHTML = `<span class='material-symbols-outlined'>arrow_forward</span>`;
        } else {
            controllerEl.style.animation = 'controllerDisappear 0.5s';
            openPanelRight.innerHTML = `<span class='material-symbols-outlined'>arrow_back</span>`;
        }
    });
})();

/* HANDLING PANEL DROPDOWNS */
(function () {
    const panelDropdowns = document.querySelectorAll('.panel-dropdown');
    for (let i = 0; i < panelDropdowns.length; i++) {
        const dropdown = panelDropdowns[i],
              label = dropdown.querySelector('.panel-dropdown-label');
        label.addEventListener('click', (e) => {
            const target = e.currentTarget,
                  opened = target.getAttribute('opened'),
                  body = target.nextElementSibling,
                  tag = target.querySelector('.dropdown-indicator'),
                  uuid = body.querySelector('.element-uuid').innerText;
                
            // Exit if element is blocking the dropdown opening
            if (e.target.getAttribute('block-dropdown') === 'true') return;

            Interactor.element.uuid = uuid;
            if (opened === 'false' || opened === null) {
                target.setAttribute('opened', 'true');
                target.setAttribute('draggable','false');
                body.style.display = 'flex';
                tag.innerHTML = 'keyboard_arrow_down';
                Interactor.element.uuid = uuid;
            } else {
                target.setAttribute('opened', 'false');
                target.setAttribute('draggable','true');
                body.style.display = 'none';
                tag.innerHTML = 'keyboard_arrow_right';
                Interactor.element.uuid = null;
            }
        });
    }
    setInterval(() => {
        const panelDropdowns = document.querySelectorAll('.panel-dropdown');
        for (let i = 0; i < panelDropdowns.length; i++) {
            const dropdown = panelDropdowns[i],
                  label = dropdown.querySelector('.panel-dropdown-label'),
                  body = dropdown.querySelector('.panel-dropdown-body'),
                  tag = label.querySelector('.dropdown-indicator'),
                  uuid = dropdown.querySelector('.element-uuid').innerText;
            if (uuid === Interactor.element.uuid) {
                dropdown.setAttribute('opened', 'true');
                dropdown.setAttribute('draggable','false');
                body.style.display = 'flex';
                tag.innerHTML = 'keyboard_arrow_down';
            } else {
                dropdown.setAttribute('opened', 'false');
                dropdown.setAttribute('draggable','true');
                body.style.display = 'none';
                tag.innerHTML = 'keyboard_arrow_right';
            }
        }
    }, 1);
    const pages = document.querySelectorAll('.panel-page');
    for (var i = 0; i < 1; i++) {
        let container = pages[i];
        if (container.getAttribute('added-dragging') !== 'true') {
            container.setAttribute('added-dragging','true');

            container.addEventListener('dragstart', (e) => {
                if (e.target.parentNode.classList.contains('drag-item')) {
                    Interactor.draggedItem.element = e.target.parentNode;
                    Interactor.draggedItem.target = 'elements';
                    e.target.classList.add('dragging');
                }
            });

            container.addEventListener('dragend', (e) => {
                if (e.target.parentNode.classList.contains('drag-item')) {
                    e.target.parentNode.classList.remove('dragging');
                    let innerElements = container.querySelectorAll('.panel-dropdown');
                    Interactor.draggedItem.order = [];
                    for (let i = 0; i < innerElements.length; i++) {
                        let innerElement = innerElements[i];
                        Interactor.draggedItem.order.push(innerElement.querySelector('.element-uuid').innerText);
                    }
                    Flats.reorder.elements();
                    Interactor.draggedItem.element = null;
                }
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
                if (afterElement == null) {
                    e.currentTarget.appendChild(Interactor.draggedItem.element);
                } else {
                    e.currentTarget.insertBefore(Interactor.draggedItem.element, afterElement);
                }
            });
        }
    }
})();




function UpdatePanels () {
    const panesEl = document.querySelector("#panes"),
          controllerEl = document.querySelector("#controller"),
          canvasEl = document.querySelector("#canvas");

    let canvasWidth = 100,
        panesWidth = 0,
        controllerWidth = 0;
    if (UI.panes.open) {
        panesWidth = 20;
        canvasWidth -= 20;
        panesEl.style.display = "flex";
    }
    if (UI.controller.open) {
        controllerWidth = 20;
        canvasWidth -= 20;
        controllerEl.style.display = "flex";
    }

    panesEl.style.minWidth = `calc(${panesWidth}vw)`;
    panesEl.style.width = `calc(${panesWidth}vw)`;
    controllerEl.style.minWidth = `calc(${controllerWidth}vw)`;
    controllerEl.style.width = `calc(${controllerWidth}vw)`;
    //canvasEl.style.width = `calc(${canvasWidth}vw)`;

    if (['P','p'].includes(Interactor.keyboard.key.name)) {
        panesEl.style.animation = 'panesAppear 0.5s';
        UI.panes.open = true;
    }
    if (['C','c'].includes(Interactor.keyboard.key.name)) {
        controllerEl.style.animation = 'controllerAppear 0.5s';
        UI.controller.open = true;
    }
}

setInterval(() => {
    UpdatePanels();
}, 1)


