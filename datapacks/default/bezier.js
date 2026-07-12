(function (module) {
    module.Flats.Formats["default:bezier"] = {
        name : 'default:bezier',
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

                node.x = int.mouse.rel.x;
                node.y = int.mouse.rel.y;
            }
        },
        main : function (ctx, element, style) {
            let mouse = module.Interactor.mouse,
                nodes = element.nodes;

            /* Styling */
            ctx.lineWidth = 1 * 1/mouse.scale;
            ctx.fillStyle = style.fill.color;
            ctx.strokeStyle = style.stroke.color;

            /* Open path */
            ctx.beginPath();
            ctx.moveTo(nodes[0].x, nodes[0].y);
            ctx.bezierCurveTo(
                nodes[1].x, nodes[1].y, 
                nodes[2].x, nodes[2].y, 
                nodes[3].x, nodes[3].y, 
            );
            
            /* Close and render */
            ctx.fill();
            ctx.stroke();

            /* Check if mouse is inside drawing path */
            element.checkPath(ctx);

            if (element.interface.isActive) {
                ctx.save();
                ctx.beginPath();
                ctx.lineWidth = 1 * 1/mouse.scale;
                ctx.setLineDash([6 / mouse.scale, 6 / mouse.scale]);
                ctx.moveTo(nodes[0].x, nodes[0].y);
                ctx.lineTo(nodes[1].x, nodes[1].y);
                ctx.lineTo(nodes[2].x, nodes[2].y);
                ctx.lineTo(nodes[3].x, nodes[3].y);
                ctx.stroke();
                ctx.closePath();
                ctx.restore();
            }
        }
    }; 
})(this);
