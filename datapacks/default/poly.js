(function (module) {
    module.Flats.Formats["default:ellipse"] = {
        name : 'default:ellipse',
        minNodes : 4,
        maxNodes : 4,
        nodes : {
            mouseOn : {
                color : 'yellow'
            },
            mouseOff : {
                color : 'green'
            },
            width : 5,
            height : 5,
            $move : function (element, node) {
                let int = module.Interactor;

                //node.x = int.mouse.rel.x;
                //node.y = int.mouse.rel.y;
            }
        },
        export : {
            script : function (element) {
                let nodes = element.nodes,
                    center = element.attributes.transforms.scale.center,
                    angle = element.attributes.transforms.rotation.radians * 180 / Math.PI,
                    width = Element.dist(nodes[0], nodes[3]),
                    height = Element.dist(nodes[0], nodes[1]);
                return `pushMatrix();
translate(#center);
rotate(#angle);
fill(#fill_color);
stroke(#stroke_color);
strokeWeight(#stroke_width);
ellipse(0, 0, #width, #height);
popMatrix();`;
            }
        },
        main : function (ctx, element, style) {
            let mouse = module.Interactor.mouse,
                trans = element.attributes.transforms,
                verts = trans.scale.verts,
                nodes = element.nodes,
                format = element.attributes.format;

            this.$fixEdges(element);

            ctx.save();

            /* Styling */
            ctx.fillStyle = format.getColor('fill');
            ctx.lineWidth = style.stroke.width;
            ctx.strokeStyle = format.getColor('stroke');
            

            /* Open path */
            ctx.beginPath();
            let x = (nodes[0].x + nodes[1].x + nodes[2].x + nodes[3].x) / 4,
                y = (nodes[0].y + nodes[1].y + nodes[2].y + nodes[3].y) / 4,
                width = Element.dist(nodes[0], nodes[3]) / 2,
                height = Element.dist(nodes[0], nodes[1]) / 2;
            ctx.translate(x, y);
            ctx.rotate(trans.rotation.radians);
            ctx.ellipse(0, 0, width, height, 0, 0, 2 * Math.PI);
            ctx.rotate(-trans.rotation.radians);
            ctx.translate(-x, -y);

            /* Close and render */
            ctx.fill();
            ctx.stroke();

            /* Check if mouse is inside drawing path */
            element.checkPath(ctx);

            ctx.restore();
        },
        $fixEdges : function (element) {},
        dropdown_fields : {}
    }; 
})(this);
