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

            /*if (element.interface.isActive) {
                ctx.save();
                ctx.beginPath();
                ctx.lineWidth = 1 * 1/mouse.scale;
                ctx.setLineDash([6 / mouse.scale, 6 / mouse.scale]);
                ctx.moveTo(verts[0].x, verts[0].y);
                ctx.lineTo(verts[1].x, verts[1].y);
                ctx.lineTo(verts[2].x, verts[2].y);
                ctx.lineTo(verts[3].x, verts[3].y);
                ctx.lineTo(verts[0].x, verts[0].y);
                ctx.stroke();
                ctx.closePath();
                ctx.restore();
            }*/
        },
        $fixEdges : function (element) {
            let int = module.Interactor,
                verts = element.attributes.transforms.scale.verts,
                node = element.getNode(int.element.node.uuid, true);
            
            /*element.nodes[0].x = verts[0].x;
            element.nodes[0].y = verts[0].y;
            element.nodes[1].x = verts[1].x;
            element.nodes[1].y = verts[1].y;
            element.nodes[2].x = verts[2].x;
            element.nodes[2].y = verts[2].y;
            element.nodes[3].x = verts[3].x;
            element.nodes[3].y = verts[3].y;*/
            /*if (!!node) {
                switch (node.index) {
                    case 0:
                        element.nodes[1].x = verts[1];
                        element.nodes[3].y = node.node.y;
                    break;
                    case 1:
                        element.nodes[0].x = node.node.x;
                        element.nodes[2].y = node.node.y;
                    break;
                    case 2:
                        element.nodes[3].x = node.node.x;
                        element.nodes[1].y = node.node.y;
                    break;
                    case 3:
                        element.nodes[2].x = node.node.x;
                        element.nodes[0].y = node.node.y;
                    break;
                }
            }*/
        },
        dropdown_fields : {
            /*'UUID' : {
                'type' : 'text'
            },
            'Pivot-X' : {
                'type' : 'input',
                'element_identifier' : 'element-pivot-x',
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.calculateResize();
                        element.calculateCenter();
                        element.movePivot(parseFloat(target.value || '0'), null);
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-pivot-x');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = Math.floor(element.attributes.transforms.pivot.x * 1000) / 1000;
                        }
                    }}
                ]
            },
            'Pivot-Y' : {
                'type' : 'input',
                'element_identifier' : 'element-pivot-y',
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.calculateResize();
                        element.calculateCenter();
                        element.movePivot(null, parseFloat(target.value || '0'));
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-pivot-y');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = Math.floor(element.attributes.transforms.pivot.y * 1000) / 1000;
                        }
                    }}
                ]
            },
            'Width' : {
                'type' : 'input',
                'element_identifier' : 'element-width',
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.calculateResize();
                        element.calculateCenter();
                        if (Math.abs(target.value) > 0.0001) {
                            element.moveResize(target.value, null);
                        }
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-width');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = Math.floor(element.attributes.transforms.scale.width * 1000) / 1000;
                        }
                    }}
                ]
            },
            'Height' : {
                'type' : 'input',
                'element_identifier' : 'element-height',
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.calculateResize();
                        element.calculateCenter();
                        if (Math.abs(target.value) > 0.0001) {
                            element.moveResize(null, target.value);
                        }
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-height');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = Math.floor(element.attributes.transforms.scale.height * 1000) / 1000;
                        }
                    }}
                ]
            },
            'Fill-Color' : {
                'type' : 'input',
                'input_type' : 'color',
                'tags' : [{name:'alpha',value:true}],
                'element_identifier' : 'element-fill-color',
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.attributes.format.attributes.style.fill.color = target.value;
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-fill-color');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = element.attributes.format.attributes.style.fill.color;
                        }
                    }}
                ]
            },
            'Fill-Opacity' : {
                'type' : 'input',
                'input_type' : 'range',
                'element_identifier' : 'element-fill-opacity',
                'tags' : [{name:'min',value:'0'},{name:'max',value:'255'}],
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.attributes.format.attributes.style.fill.opacity = Math.floor(parseFloat(target.value));
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-fill-opacity');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = element.attributes.format.attributes.style.fill.opacity;
                        }
                    }}
                ]
            },
            'Stroke-Color' : {
                'type' : 'input',
                'input_type' : 'color',
                'element_identifier' : 'element-stroke-color',
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.attributes.format.attributes.style.stroke.color = target.value;
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-stroke-color');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = element.attributes.format.attributes.style.stroke.color;
                        }
                    }}
                ]
            },
            'Stroke-Opacity' : {
                'type' : 'input',
                'input_type' : 'range',
                'element_identifier' : 'element-stroke-opacity',
                'tags' : [{name:'min',value:'0'},{name:'max',value:'255'}],
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.attributes.format.attributes.style.stroke.opacity = Math.floor(parseFloat(target.value));
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-stroke-opacity');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = element.attributes.format.attributes.style.stroke.opacity;
                        }
                    }}
                ]
            },
            'Stroke-Width' : {
                'type' : 'input',
                'input_type' : 'number',
                'element_identifier' : 'element-stroke-width',
                'events' : [
                    {type:'input',callback:function (e) {
                        const target = e.currentTarget,
                                uuid = target.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid);
                        element.attributes.format.attributes.style.stroke.width = target.value;
                    }}
                ],
                'loops' : [
                    {interval:1,callback:function (d) {
                        const inputElement = d.DOM_Element.querySelector('.element-stroke-width');
                        if (document.activeElement !== inputElement) {
                            const element = Flats.get.element(d.uuid);
                            inputElement.value = element.attributes.format.attributes.style.stroke.width;
                        }
                    }}
                ]
            }*/
        }
    }; 
})(this);
