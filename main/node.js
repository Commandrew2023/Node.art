/* * * * * * * * * * * *  PEREGRINE 2026  * * * * * * * * * * * */
/*
   /$$   /$$  /$$$$$$  /$$$$$$$  /$$$$$$$$     /$$$$$$  /$$$$$$ 
  | $$$ | $$ /$$__  $$| $$__  $$| $$_____/    |_  $$_/ /$$__  $$
  | $$$$| $$| $$  \ $$| $$  \ $$| $$            | $$  | $$  \ $$
  | $$ $$ $$| $$  | $$| $$  | $$| $$$$$         | $$  | $$  | $$
  | $$  $$$$| $$  | $$| $$  | $$| $$__/         | $$  | $$  | $$
  | $$\  $$$| $$  | $$| $$  | $$| $$            | $$  | $$  | $$
  | $$ \  $$|  $$$$$$/| $$$$$$$/| $$$$$$$$ /$$ /$$$$$$|  $$$$$$/
  |__/  \__/ \______/ |_______/ |________/|__/|______/ \______/ 
*/
/* --------------- EXPORTABLE ART CREATION TOOL --------------- */
/* ------------------------------------------------------------ */
/* ----------------------GETTING STARTED----------------------- */
/* ------------------------------------------------------------ */
/* ------------------------------------------------------------ */
/* ------------------- DISTRIBUTION POLICY -------------------- */
/*  > When you export, a comment crediting this tool will be 
      included for your convenience. Please, do not remove
      this comment.
    > If content is found on the Hotlist or any other page 
      that violates KA guidelines for user-generated drawings,
      I ask that anyone aware of these guidelines to flag
      that project and have it removed.
/*
/* ------------------------------------------------------------ */
/* ------------------------- DEV-BLOG ------------------------- */
/*
Start: 6.12.2026 (v0.00 pre)
----------------------------------------------------------------
DEVBLOG #1 [6.19.2026] (v0.01 pre)
- ADDED THE FOLLOWING FEATURES:
  : Anchor
    : Translation
    : Rotation
    : Resize
    : Anchor Icon
  : Snapper
    : Point
    : Line
- EDITED THE FOLLOWING FEATURES:
  : Anchor selection
  : Element rotation with respect to anchor rotation
- FIXED THE FOLLOWING FEATURES:
  : NONE
----------------------------------------------------------------
DEVBLOG #2 [6.21.2026] (v0.01 pre)
- ADDED THE FOLLOWING FEATURES:
  : UI html boxes
- EDITED THE FOLLOWING FEATURES:
  : Element, snapper, and anchor selection
- FIXED THE FOLLOWING FEATURES:
  : NONE
----------------------------------------------------------------
DEVBLOG #3 [6.22.2026] (v0.01 pre)
- ADDED THE FOLLOWING FEATURES:
  : PANES, CONTROLLER, and CANVAS html elements
  : Animation for opening and closing the PANES and CONTROLLER elements
  : RIBBONS navbar
  : RIBBONS toolbar
  : RIBBONS buttons with RIBBON page selection
  : RIBBON sub-labels and RIBBON sections
  : UI scaling (INCOMPLETE)
- EDITED THE FOLLOWING FEATURES:
  : Canvas scaling
  : Mouse location tracking
- FIXED THE FOLLOWING FEATURES:
  : Mouse location tracking 
*/


const canvas = document.querySelector("#draw");
const dims = canvas.getBoundingClientRect();
const canvasWrapper = document.querySelector("#canvas");
canvas.width = 800;
canvas.height = 800;
const ctx = canvas.getContext('2d');

// Code written by Gemini but modified to fit my needs {
Interactor.draggedItem.element = null;
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.drag-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
// }

/*const quad_format = new Format('default:ellipse');
const quad_element = new Element();
quad_element.nodes = [
    {x : 100, y : 100, hovered : false}, 
    {x : 100, y : 200, hovered : false}, 
    {x : 200, y : 200, hovered : false}, 
    {x : 200, y : 100, hovered : false}
];
quad_element.bindFormat(quad_format);*/



const poly_format = new Format('default:bezier_chain');
poly_format.attributes.style.stroke.color = 'orange';
const poly_element = new Element();
poly_element.setNodes([
    {x : 100, y : 50, hovered : false},
    {x : 150, y : 120, hovered : false}, 
    {x : 190, y : 120, hovered : false},
    {x : 240, y : 50, hovered : false},
    {x : 290, y : 120, hovered : false},
    {x : 350, y : 120, hovered : false},
    {x : 400, y : 50, hovered : false},
    {x : 450, y : 120, hovered : false},
    {x : 500, y : 120, hovered : false},
    {x : 500, y : 50, hovered : false}
]);
poly_element.bindFormat(poly_format);



const point_snapper = new Snapper('default:line');
point_snapper.setNodes([
    {x : 100, y : 100},
    {x : 300, y : 300}
]);
point_snapper.setWidth(10);


let anchor1 = new Anchor(300, 300);
anchor1.addDropdown();
Flats.Anchors.push(anchor1);


Flats.Snappers.push(point_snapper);

//Flats.Elements.push(poly_element);
for (let i = 0; i < 2; i++) {
    let quad_format = new Format('default:poly');
    let quad_element = new Element();
    quad_element.nodes = [
        {x : 100, y : 100, hovered : false}, 
        {x : 100, y : 200, hovered : false}, 
        {x : 200, y : 200, hovered : false}, 
        {x : 200, y : 100, hovered : false},
        /*{x : 100, y : 100, hovered : false}, 
        {x : 100, y : 200, hovered : false}, 
        {x : 200, y : 200, hovered : false}, 
        {x : 200, y : 100, hovered : false},
        {x : 100, y : 100, hovered : false}, 
        {x : 100, y : 200, hovered : false}, 
        {x : 200, y : 200, hovered : false}, 
        {x : 200, y : 100, hovered : false}*/
    ];
    quad_element.bindFormat(quad_format);
    quad_element.addDropdown();
    anchor1.elements.push(quad_element);
    Flats.Elements.push(quad_element);
}
var Andrew_sus = 0
let x = Andrew_sus;

let controller1 = new Controller();
controller1.addDropdown();
Flats.Controllers.push(controller1);

let win = new Window();
win.build();
Flats.Windows.push(win);


let loop = setInterval(function () {
        Interactor.reset_cursor();

        ctx.beginPath();
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "rgb(100, 100, 100)");
        grad.addColorStop(1, "rgb(250, 250, 250)");
        ctx.fillStyle = grad;
        ctx.rect(0, 0, canvas.width, canvas.height);//400, 400);//window.innerWidth, window.innerHeight);
        ctx.fill();
        ctx.closePath();

        Interactor.update(canvas);

        var offset = Camera.offset
        var mouseRef = Camera.mouseRef;
        var s = Camera.scale;

        var mouse = Camera.toRel(Interactor.mouse.abs.x, Interactor.mouse.abs.y);
        Interactor.mouse.rel.x = mouse.x;
        Interactor.mouse.rel.y = mouse.y;
        Interactor.snapper.checkKey();

        ctx.translate(mouseRef.x, mouseRef.y);
        ctx.scale(s, s);
        ctx.translate(offset.x, offset.y);

        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.rect(0, 0, 400, 400);
        ctx.fill();
        ctx.closePath();


        ctx.beginPath();
        ctx.fillStyle = 'red';
        ctx.ellipse(238.38834764831844, 238.38834764831842, 10, 10, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();


        for (let i = 0; i < Flats.Elements.length; i++) {
            const element = Flats.Elements[i];
            element.run();
            element.render(ctx);
        }

        for (let i = 0; i < Flats.Anchors.length; i++) {
            const anchor = Flats.Anchors[i];
            anchor.run();
            anchor.checkPivotSelect();
        }

        for (let i = 0; i < Flats.Elements.length; i++) {
            const element = Flats.Elements[i];
            element.renderNodes(ctx);
            element.renderUI(ctx);
            element.clearCheck();
        }
        
        for (let i = 0; i < Flats.Anchors.length; i++) {
            const anchor = Flats.Anchors[i];
            anchor.renderUI(ctx);
            anchor.clearCheck();
        }

        for (let i = 0; i < Flats.Snappers.length; i++) {
            const snapper = Flats.Snappers[i];
            snapper.update();
            snapper.hoverNodes();
            snapper.grabNodes();
            snapper.render(ctx);
        }

        Interactor.select_stack.selectTop();

        ctx.translate(-offset.x, -offset.y);
        ctx.scale(1 / s, 1 / s);
        ctx.translate(-mouseRef.x, -mouseRef.y);

        Interactor.set_cursor();
        Interactor.clear_selector_on_cycle();
        Interactor.select_stack.recycle();
}, 1);
