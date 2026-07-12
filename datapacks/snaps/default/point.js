(function (module) {
    module.Flats.Snaps["default:point"] = {
        minNodes : 1,
        maxNodes : 1,
        nodes : {},
        test : function (snapper, point) {
            let int = module.Interactor;
            if (Element.dist(snapper.nodes[0], point) < (snapper.attributes.width) * 1/int.mouse.scale) {
                return {
                    x : snapper.nodes[0].x,
                    y : snapper.nodes[0].y
                };
            } else return null;
        },
        main : function (snapper, ctx) {
            // No extra graphics need to be drawn. This is only a single node.
        }
    };
})(this);
