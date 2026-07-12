(function (module) {
    module.Flats.Formats["default:bezier_chain"] = {
        name : 'default:bezier_chain',
        minNodes : 4,
        maxNodes : Infinity,
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

            let repeats = Math.floor(element.nodes.length / 3);  
            for (let i = 0; i < repeats; i++) {
                let c = i * 3;

                /* Styling */
                ctx.lineWidth = 1 * 1/mouse.scale;
                ctx.fillStyle = style.fill.color;
                ctx.strokeStyle = style.stroke.color;

                /* Open path */
                ctx.beginPath();
                ctx.moveTo(nodes[c + 0].x, nodes[c + 0].y);
                ctx.bezierCurveTo(
                    nodes[c + 1].x, nodes[c + 1].y, 
                    nodes[c + 2].x, nodes[c + 2].y, 
                    nodes[c + 3].x, nodes[c + 3].y, 
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
                    ctx.moveTo(nodes[c + 0].x, nodes[c + 0].y);
                    ctx.lineTo(nodes[c + 1].x, nodes[c + 1].y);
                    ctx.lineTo(nodes[c + 2].x, nodes[c + 2].y);
                    ctx.lineTo(nodes[c + 3].x, nodes[c + 3].y);
                    ctx.stroke();
                    ctx.closePath();
                    ctx.restore();
                }
            }
        }
    }; 
})(this);
