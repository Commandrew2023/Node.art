(function (module) {
    module.Flats.Snaps["default:line"] = {
        minNodes : 2,
        maxNodes : 2,
        nodes : {},
        test : function (snapper, point) {
            let int = module.Interactor,
                nodes = snapper.nodes;
            let line_vec = new module.Vector(nodes[1].x - nodes[0].x, nodes[1].y - nodes[0].y),
                point_vec = new module.Vector(point.x - nodes[0].x, point.y - nodes[0].y),
                proj = line_vec.project(point_vec),
                proj_bas = proj.basis(),
                proj_len = proj.mag();
            proj.add(nodes[0]);
            if (Element.dist(proj, point) < (snapper.attributes.width) * 1/int.mouse.scale && proj_bas.equals(line_vec.basis()) && proj_len <= line_vec.mag()) {
                return {
                    x : proj.x,
                    y : proj.y
                };
            } else return null;
        },
        main : function (snapper, ctx) {
            let int = module.Interactor,
                nodes = snapper.nodes;

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(249, 206, 106, 0.5)';
            ctx.moveTo(nodes[0].x, nodes[0].y);
            ctx.lineTo(nodes[1].x, nodes[1].y);
            ctx.setLineDash([6 / int.mouse.scale, 6 / int.mouse.scale]);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
    };
})(this);
