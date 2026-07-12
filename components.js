(function () {
  module.Camera = {
      offset : {
          x : 0,
          y : 0
      },
      mouseRef : {
          x : 0,
          y : 0
      },
      fromRel : function (x, y) {
          return {
              x : x * this.scale + (this.mouseRef.x + this.offset.x * this.scale),
              y : y * this.scale + (this.mouseRef.y + this.offset.y * this.scale)
          };
      },
      toRel : function (x, y) {
          return {
              x : (x - (this.mouseRef.x + this.offset.x * this.scale)) / this.scale,
              y : (y - (this.mouseRef.y + this.offset.y * this.scale)) / this.scale
          };
      },
      scale : 1.00
  };

  /* Graphical element class. I got to lazy and didn't implement inheritance for the anchors so the file size is going to be massive (ugh). */
  class Element {
      constructor () {
          /* ID generation checked against other elements */
          this.uuid = module.AlternativeCrypto.randomUUID({
              objects : module.Flats.Elements,
              key : 'uuid'
          });
          
          /* Rendering Properties */
          this.attributes = {
              name : 'Unknown Element',
              dropdown : null,
              anchor : null,
              format : null,
              transforms : {
                  pivot : {
                      x : 120,
                      y : 150,
                      hovered : false
                  },
                  scale : {
                      verts : [
                          { x : 0, y : 0 },
                          { x : 0, y : 0 },
                          { x : 0, y : 0 },
                          { x : 0, y : 0 }
                      ],
                      center : {
                          x : 0,
                          y : 0
                      },
                      width : 32,
                      height : 32
                  },
                  rotation : {
                      radians : 0,
                      hovered : false,
                  }
              }
          };

          /* Internal UI Status */
          this.interface = {
              isHovered : false,
              isActive  : false,
              isResizing : false,
              isTranslating : false,
              isRotating : false,

              context : {
                  x : 0,
                  y : 0
              },
              resize_calculation : {
                  rel : true,
              },
              disabled_sides : [],
              passes_check : false,
              hold_until_reclick : false
          };

          /* Interactable Nodes */
          this.nodes = [];

          /* Field Copies for Transformations */
          this.transforms_copy = {};
          this.nodes_copy = [];
      }

      /* Utility Methods */
      static dist (p1, p2) {
          return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      }
      static range (size) {
          return new Uint8Array(size);
      }
      static rotatePoints (pivot, points, angle) {
          points.forEach(point => {
              let cur_a = Math.atan2(point.y - pivot.y, point.x - pivot.x),
                  cur_d = Element.dist(pivot, point);
              point.x = pivot.x + cur_d * Math.cos(cur_a + angle);
              point.y = pivot.y + cur_d * Math.sin(cur_a + angle);
          });
          return points;
      }

      /* Element Methods */
      addDropdown () {
          const format = this.attributes.format;
          this.attributes.dropdown = new module.ElementDropdown(
              this.attributes.name || format.attributes.format?.name || 'Unknown',
              this.uuid,
              format.attributes.format.dropdown_fields || {}
          );
          this.attributes.dropdown.load();
          this.attributes.dropdown.loadFields();
      }
      copy () {
          this.transforms_copy = structuredClone({...this.attributes.transforms});
          this.nodes_copy = structuredClone(this.nodes.map(node => {return {x : node.x, y : node.y}}));
      }
      select () {
          let int = module.Interactor;

          /* Check for current interactions and set new interaction */
          if (this.holding('none') && int.element.node.uuid === null) {
              int.reset();
              int.element.uuid = this.uuid;
              int.element.selected_on_cycle = true;
              
              this.interface.isActive = true;

              /* Interactor Event */
              int.element.event.select();
              this.interface.hold_until_reclick = true;
          }
      }
      checkPath (ctx) {
          let int = module.Interactor, 
              abs = module.Interactor.mouse.abs;
          
          let passes = false;
          if (int.mouse.pressed && int.mouse.button === 0 && this.holding('none')) {
              if (ctx.isPointInPath(abs.x, abs.y)) {
                  passes = true;
                  int.select_stack.add(this);
              }
          }

          this.interface.passes_check = this.interface.passes_check || passes;
          if (this.holding('any')) {
              this.interface.passes_check = false;
          }
      }
      clearCheck () {
          this.interface.passes_check = false;
          this.interface.disabled_sides = [];
      }
      holding (type) {
          let int = module.Interactor;
          return int.holding(type);
      }


      /* Node Methods */
      insertNode (node, index=-1, beforeNode=null, afterNode=null) {
          node.uuid = node.uuid || module.AlternativeCrypto.randomUUID({
              objects : this.nodes,
              key : 'uuid'
          });
          if (index === -1) {
              index = this.nodes.length;
          } else if (index === null) {
              const UUIDs  = this.nodes.map(node => node.uuid),
                    before = UUIDs.indexOf(beforeNode),
                    after  = UUIDs.indexOf(afterNode);
              if (before > -1) {
                  this.nodes.splice(before, 0, node);
              } else if (after > -1) {
                  this.nodes.splice(after - 1, 0, node);
              } else {
                  this.nodes.splice(this.nodes.length, 0, node);
              }
          } else {
              this.nodes.splice(index, 0, node);
          }
      }
      removeNode (uuid) {
          for (let i = 0; i < this.nodes.length; i++) {
              if (this.nodes[i].uuid === uuid) {
                  this.nodes.splice(i, 1);
                  return;
              }
          }
      }
      setNodes (nodes) {
          this.nodes = nodes;
      }
      getNode (uuid, withIndex=false) {
          /* Iterate nodes for node matching 'uuid' */
          for (let i = 0; i < this.nodes.length; i++) {
              if (this.nodes[i].uuid === uuid) {
                  if (!withIndex) {
                      return this.nodes[i];
                  } else {
                      return {
                          node : this.nodes[i],
                          index : i
                      };
                  }
              }
          }
          return null;
      }
      idNodes () {
          this.nodes.forEach(node => {
              node.uuid = module.AlternativeCrypto.randomUUID({
                  objects : this.nodes,
                  key : 'uuid'
              })
          });
      }
      createNode () {
          return {
              x : 0,
              y : 0,
              hovered : false
          };
      }
      formatNodes () {
          let that = this,
              format = this.attributes.format;

          /* Ensure minimum number of nodes */
          if (this.nodes.length < format.minNodes) {
              for (let n in this.range(format.minNodes - this.nodes.length)) {
                  this.createNode();
              }
          }

          /* Iterate nodes and merge formatting */
          this.nodes.forEach((node, i) => {
              /* Check if element format exists */
              if (!!format) {
                  let n = format.attributes.format.nodes;

                  /* Check if format includes node attributes */
                  if (!!n) {
                      /* Individual Attributes */
                      if (n instanceof Array) {
                          if (n[i] !== null) {
                              module.mergeObjects(n[i], that.nodes[i]);
                          }
                      } 
                      /* Universal Attributes */
                      else {
                          that.nodes[i] = module.mergeObjects(n, that.nodes[i]);
                      }
                  }
              }
          });
      }
      renderNodes (ctx) {
          let int = module.Interactor;

          if (int.element.uuid !== this.uuid) return;

          this.nodes.forEach(node => {
              let hovered = (node.hovered || int.element.node.uuid === node.uuid || node.force_hover);

              /* No Stroke */
              ctx.strokeStyle = '#00000000';

              /* Hoever Coloration Effect */
              ctx.fillStyle = node[hovered ? 'mouseOn' : 'mouseOff'].color;

              /* Render Node */
              ctx.beginPath();
              ctx.ellipse(node.x, node.y, node.width * 1/int.mouse.scale, node.height * 1/int.mouse.scale, 0, 0, 2 * Math.PI);
              ctx.fill();
          });
      }
      rotateNodes (angle) {
          let trans = this.attributes.transforms;

          /* Rotate nodes */
          Element.rotatePoints(trans.pivot, this.nodes, angle * Math.PI / 180);

          /* Set angle */
          this.attributes.transforms.rotation.radians = angle * Math.PI / 180;
      }
      snapNodesGlobal () {
          let int = module.Interactor,
              node = this.getNode(int.element.node.uuid);

          /* Check global snappers */
          Flats.Snappers.forEach(snapper => {
              const con = snapper.test(int.mouse.rel);
              if (con !== null && node !== null) {
                  node.x = parseFloat(con.x);
                  node.y = parseFloat(con.y);
              }
          });
      }
      hoverNodes () {
          let int = module.Interactor;

          /* Exit if element not active */
          if (int.element.uuid !== this.uuid) return;

          let that = this;
          if (this.holding('node') || this.holding('none')) {
              this.nodes.forEach((node, i) => {
                  /* Check for node grab & hovering */
                  if (Element.dist(int.mouse.rel, node) <= node.width * 1/int.mouse.scale) {
                      if (int.element.node.uuid === null) {
                          node.hovered = true;
                          int.mouse.cursor = 'crosshair';
                      }
                  }
              });
          }
      }
      grabNodes () {
          let int = module.Interactor;

          /* Exit if element not active */
          if (int.element.uuid !== this.uuid) return;

          let that = this;
          if (this.holding('node') || this.holding('none')) {
              this.nodes.forEach((node, i) => {
                  /* Check for node grab & hovering */
                  if (Element.dist(int.mouse.rel, node) <= node.width * 1/int.mouse.scale) {
                      if (int.element.node.uuid === null) {
                          /* Mouse interaction event */
                          if (int.mouse.pressed && int.mouse.button === 0) {
                              (node.$leftClick || function (element, node, i) {
                                  int.element.node.uuid = node.uuid;
                              })(that, node, i);
                          }
                      }
                  } else {
                      /* Not hovered/out of node range */
                      node.hovered = false;
                  }

                  /* Move grabbed node with mouse */
                  if (int.element.node.uuid === node.uuid) {
                      int.mouse.cursor = 'crosshair';
                      (node.$move || function (element, node, i) {
                          node.x = int.mouse.rel.x;
                          node.y = int.mouse.rel.y;
                      })(that, node, i);
                  }
              });
          }
      }
      releaseNodes () {
          let int = module.Interactor;

          int.element.node.grab = false;
          if (int.element.node.uuid !== null) {
              var node = this.getNode(int.element.node.uuid);
              (node.$release || function (element, node, i) {
                  int.element.node.uuid = null;
              })(this, node);
          }
      }

      /* Format Methods */
      bindFormat (format) {
          if (format instanceof module.Format) {
              this.attributes.format = format;
              this.formatNodes();
              this.idNodes();
          } else {
              throw Error("Format must be of type 'Format'");
          }
      }
      render (ctx) {
          let format = this.attributes.format;

          /* Ensure format is bound and use */
          if (!!format) {
              format.use(ctx, this);
          }
      }

      /* UI Methods */
      snapPivotLocal () {
          let int = module.Interactor,
              pivot = this.attributes.transforms.pivot,
              verts = this.attributes.transforms.scale.verts,
              disabled_sides = this.interface.disabled_sides;
          
          if (int.element.uuid !== this.uuid) return;

          if (int.mouse.pressed && int.mouse.button === 2 && int.element.pivot.grab && 
              !(int.keyboard.key.name === 'Shift' && int.keyboard.pressed)) {
              /* Check resize verts */
              verts.forEach(vert => {
                  const d = Element.dist(vert, int.mouse.rel);
                  if (d < 10 * 1/int.mouse.scale) {
                      pivot.x = parseFloat(vert.x);
                      pivot.y = parseFloat(vert.y);
                  }
              });

              /* Check center */
              const center = this.attributes.transforms.scale.center;
              const center_d = Element.dist(center, int.mouse.rel);
              if (center_d < 10 * 1/int.mouse.scale) {
                  pivot.x = parseFloat(center.x);
                  pivot.y = parseFloat(center.y);
              }

              /* Check nodes */
              this.nodes.forEach(node => {
                  const d = Element.dist(node, int.mouse.rel);
                  if (d < 10 * 1/int.mouse.scale) {
                      pivot.x = parseFloat(node.x);
                      pivot.y = parseFloat(node.y);
                  }
              });

              /* Check global snappers */
              Flats.Snappers.forEach(snapper => {
                  let con = snapper.test(int.mouse.rel);
                  if (con !== null) {
                      pivot.x = parseFloat(con.x);
                      pivot.y = parseFloat(con.y);
                  }
              });
          }
      }
      ensurePivotVerts () {
          let int = module.Interactor,
              pivot = this.attributes.transforms.pivot,
              verts = this.attributes.transforms.scale.verts,
              disabled_sides = this.interface.disabled_sides;
          for (let i = 0; i < verts.length; i++) {
              let vert = verts[i];
              if (pivot.x === vert.x && pivot.y === vert.y) {
                  disabled_sides.push(i);
                  disabled_sides.push((i + 3) % 4);
              }
              let next_vert = verts[(i + 1) % 4],
                  side = new module.Vector(next_vert.x - vert.x, next_vert.y - vert.y),
                  pivot_vec = new module.Vector(vert.x - pivot.x, vert.y - pivot.y),
                  ext = side.project(pivot_vec),
                  dist = Element.dist(pivot_vec, ext);
              if (dist < 20 * 1/int.mouse.scale) {
                  disabled_sides.push(i);
              }
          }
      }
      hoverPivot () {
           let int = module.Interactor;

          /* Exit if element is not active */
          if (int.element.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('pivot')) {
              if (Element.dist(int.mouse.rel, this.attributes.transforms.pivot) < 9 * 1/int.mouse.scale) {
                  this.attributes.transforms.pivot.hovered = true;
                  int.mouse.cursor = 'move';
              }
          }
      }
      grabPivot () {
          let int = module.Interactor;

          /* Exit if element is not active */
          if (int.element.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('pivot')) {
              if (Element.dist(int.mouse.rel, this.attributes.transforms.pivot) < 9 * 1/int.mouse.scale) {
                  if (int.mouse.pressed) {
                      int.element.pivot.grab = true;
                  }
              }
              if (int.element.pivot.grab && int.mouse.pressed) {
                  if (int.mouse.button === 2) {
                      this.attributes.transforms.pivot = {
                          x : int.mouse.rel.x,
                          y : int.mouse.rel.y
                      };
                  } else if (int.mouse.button === 0) {
                      if (!this.interface.isTranslating) {
                          this.interface.isTranslating = true;
                          this.copy();
                      }

                      Flats.Snappers.forEach(snapper => {
                          const con = snapper.test(int.mouse.rel);
                          if (con !== null) {
                              int.mouse.rel.x = parseFloat(con.x);
                              int.mouse.rel.y = parseFloat(con.y);
                          }
                      });
                      let pivot = this.attributes.transforms.pivot,
                          verts = this.attributes.transforms.scale.verts,
                          pivot_copy = this.transforms_copy.pivot,
                          verts_copy = this.transforms_copy.scale.verts,
                          nodes_copy = this.nodes_copy;
                      for (var i = 0; i < verts.length; i++) {
                          verts[i].x = verts_copy[i].x + int.mouse.rel.x - pivot_copy.x;
                          verts[i].y = verts_copy[i].y + int.mouse.rel.y - pivot_copy.y;
                      }
                      for (var i = 0; i < this.nodes.length; i++) {
                          this.nodes[i].x = nodes_copy[i].x + int.mouse.rel.x - pivot_copy.x;
                          this.nodes[i].y = nodes_copy[i].y + int.mouse.rel.y - pivot_copy.y;
                      }
                      this.attributes.transforms.pivot = {
                          x : int.mouse.rel.x,
                          y : int.mouse.rel.y
                      };
                  }
              }
          }
          if (!int.mouse.pressed) {
              this.interface.isTranslating = false;
          }
      }
      movePivot (x, y) {
          if (x === null) {
              x = this.attributes.transforms.pivot.x;
              y = y;
          } else if (y === null) {
              x = x;
              y = this.attributes.transforms.pivot.y;
          }

          this.copy();

          let pivot = this.attributes.transforms.pivot,
              verts = this.attributes.transforms.scale.verts,
              pivot_copy = this.transforms_copy.pivot,
              verts_copy = this.transforms_copy.scale.verts,
              nodes_copy = this.nodes_copy;
          for (var i = 0; i < verts.length; i++) {
              verts[i].x = verts_copy[i].x + x - pivot_copy.x;
              verts[i].y = verts_copy[i].y + y - pivot_copy.y;
          }
          for (var i = 0; i < this.nodes.length; i++) {
              this.nodes[i].x = nodes_copy[i].x + x - pivot_copy.x;
              this.nodes[i].y = nodes_copy[i].y + y - pivot_copy.y;
          }
          this.attributes.transforms.pivot = {
              x : x,
              y : y
          };
      }
      hoverRotation () {
          let int = module.Interactor,
              trans = this.attributes.transforms;

          /* Exit if element is not active */
          if (int.element.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('rotation')) {
              let d = Element.dist(int.mouse.rel, this.attributes.transforms.pivot);
              if (d > 10 * 1/int.mouse.scale && d < 15 * 1/int.mouse.scale) {
                  this.attributes.transforms.rotation.hovered = true;
                  int.mouse.cursor = 'pointer';
              }
          }
      }
      grabRotation () {
          let int = module.Interactor,
              trans = this.attributes.transforms;

          /* Exit if element is not active */
          if (int.element.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('rotation')) {
              let d = Element.dist(int.mouse.rel, this.attributes.transforms.pivot);
              if (d > 10 * 1/int.mouse.scale && d < 15 * 1/int.mouse.scale) {
                  if (int.mouse.pressed) {
                      int.element.rotation.grab = true;
                  }
              }
              if (int.element.rotation.grab) {
                  if (int.mouse.pressed && int.mouse.button === 0) {
                      if (!this.interface.isRotating) {
                          this.interface.isRotating = true;
                          this.copy();
                          Element.rotatePoints(trans.pivot, this.nodes_copy, -this.transforms_copy.rotation.radians);
                      }
                      
                      let angle = Math.atan2(int.mouse.rel.y - trans.pivot.y, int.mouse.rel.x - trans.pivot.x) * 180 / Math.PI;
                      if (!(int.keyboard.pressed && int.keyboard.key.name === 'Shift')) {
                          angle = Math.round(angle / 15) * 15;
                      }
                      this.nodes_copy.forEach((node, i) => {
                          this.nodes[i].x = parseFloat(node.x);
                          this.nodes[i].y = parseFloat(node.y);
                      });
                      this.rotateNodes(angle);
                  }
              }
          }
          if (!int.mouse.pressed) {
              this.interface.isRotating = false;
          }
      }
      calculateResize () {
          let trans = this.attributes.transforms;

          /* Rotate nodes to 'standard' positions */
          if (this.interface.resize_calculation.rel) {
              Element.rotatePoints(trans.pivot, this.nodes, -this.attributes.transforms.rotation.radians);
          }

          /* Find bounds */
          let minx = Math.min.apply(null, this.nodes.map(n => n.x)),
              miny = Math.min.apply(null, this.nodes.map(n => n.y)),
              maxx = Math.max.apply(null, this.nodes.map(n => n.x)),
              maxy = Math.max.apply(null, this.nodes.map(n => n.y));
          
          /* Put bounds in vertex list */
          trans.scale.verts = [
              {x : minx, y : miny},
              {x : minx, y : maxy},
              {x : maxx, y : maxy},
              {x : maxx, y : miny}
          ];

          /* Rotate vertex list */
          if (this.interface.resize_calculation.rel) {
              Element.rotatePoints(trans.pivot, trans.scale.verts, this.attributes.transforms.rotation.radians);
          }

          /* Calculat width/height (depracated feature) */
          let width = Element.dist(trans.scale.verts[0], trans.scale.verts[3]),
              height = Element.dist(trans.scale.verts[0], trans.scale.verts[1]);
          trans.scale.width = width;
          trans.scale.height = height;

          /* Rotate nodes back to rotated positions */
          if (this.interface.resize_calculation.rel) {
              Element.rotatePoints(trans.pivot, this.nodes, this.attributes.transforms.rotation.radians);
          }
      }
      calculateCenter () {
          let verts = this.attributes.transforms.scale.verts;
          this.attributes.transforms.scale.center = {
              x : (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4,
              y : (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4
          };
      }
      moveRotation (angle) {
          let int = module.Interactor,
              trans = this.attributes.transforms;

          this.copy();
          Element.rotatePoints(trans.pivot, this.nodes_copy, -this.transforms_copy.rotation.radians);
          
          this.nodes_copy.forEach((node, i) => {
              this.nodes[i].x = parseFloat(node.x);
              this.nodes[i].y = parseFloat(node.y);
          });
          this.rotateNodes(angle);
      }
      hoverResize () {
          let int = module.Interactor,
              mouse = int.mouse,
              resize = this.attributes.transforms.scale;

          /* Don't run resize if element isn't active */
          if (int.element.uuid !== this.uuid) return;

          let check = [0, 1, 2, 3, 0, 1],
              opp = [2, 3, 0, 1, 2];
          if (this.holding('none')) {
              int.element.resize.vecs = [];
              int.element.resize.side = null;
              for (let i = 1; i < check.length - 1; i++) {

                  /* Vectors for calculations */
                  let cur = resize.verts[check[i]],
                      prev = resize.verts[check[i - 1]],
                      side_vec = new module.Vector(cur.x - prev.x, cur.y - prev.y),
                      mouse_vec = new module.Vector(int.mouse.rel.x - prev.x, int.mouse.rel.y - prev.y),
                      proj = side_vec.project(mouse_vec),
                      side_vec_bas = side_vec.basis(),
                      proj_bas = proj.basis();

                  /* Calculate mouse dist from side */
                  let c = proj.copy();
                  c.add(prev);
                  let md = Element.dist(c, int.mouse.rel);
                  
                  /* Check if mouse is selecting a side */
                  if (proj.mag() < side_vec.mag() && proj_bas.equals(side_vec_bas) && md < 5 * 1/int.mouse.scale) {
                      int.element.resize.side = check[i - 1];
                  }
                  if (this.interface.disabled_sides.includes(int.element.resize.side)) {
                      int.element.resize.side = null
                  }
              }
          }
          if (int.element.resize.side !== null) {
              let cur_angle = parseFloat(this.attributes.transforms.rotation.radians) * 180 / Math.PI;
              if (cur_angle < 0) {
                  cur_angle = 180 - Math.abs(cur_angle);
              }
              let angle_index = Math.round(cur_angle / 45) % 4;
              if (int.mouse.cursor !== 'crosshair') {
                  if (this.interface.resize_calculation.rel) {
                      int.mouse.cursor = int.element.resize.side % 2 ? ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize'][angle_index] : ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'][angle_index];
                  } else {
                      int.mouse.cursor = int.element.resize.side % 2 ? 'ns-resize' : 'ew-resize';
                  }
              }
          }
      }
      grabResize (ctx) {
          let int = module.Interactor,
              mouse = int.mouse,
              resize = this.attributes.transforms.scale;

          /* Don't run resize if element isn't active */
          if (int.element.uuid !== this.uuid) return;

          let check = [0, 1, 2, 3, 0, 1],
              opp = [2, 3, 0, 1, 2];
          if (this.holding('none')) {
              /* Grab side and copy current state */
              if (int.element.resize.side !== null) {
                  if (int.mouse.pressed && int.mouse.button === 0) {
                      if (!this.interface.isResizing) {
                          this.copy();
                          this.interface.isResizing = true;
                      }
                      int.element.resize.grab = true;
                  }
              }

              /* Clear resize */
              if (!int.mouse.pressed) {
                  this.interface.isResizing = false;
              }
          }

          /* Actual resizing rath */
          if (int.element.resize.side !== null && int.element.resize.grab) {
              /* Notes:
                  This method uses the pivot point as a local scaling, rotating, and translating anchor. 
                  I am using a vector approach to calculate these changes so there is a lot of variables 
                  and extra vectors required to properly scale it.
              */

              let cur_angle = parseFloat(this.attributes.transforms.rotation.radians) * 180 / Math.PI;
              if (cur_angle < 0) {
                  cur_angle = 180 - Math.abs(cur_angle);
              }
              let angle_index = Math.round(cur_angle / 45) % 4;
              if (int.mouse.cursor !== 'crosshair') {
                  if (this.interface.resize_calculation.rel) {
                      int.mouse.cursor = int.element.resize.side % 2 ? ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize'][angle_index] : ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'][angle_index];
                  } else {
                      int.mouse.cursor = int.element.resize.side % 2 ? 'ns-resize' : 'ew-resize';
                  }
              }

              /* Recalculate using transforms copy */
              let side = int.element.resize.side,
                  resize_copy = this.transforms_copy.scale,
                  prev_copy = resize_copy.verts[check[side]],
                  cur_copy = resize_copy.verts[check[side + 1]],
                  side_vec_copy = new module.Vector(cur_copy.x - prev_copy.x, cur_copy.y - prev_copy.y),
                  mouse_vec_copy = new module.Vector(int.mouse.rel.x - prev_copy.x, int.mouse.rel.y - prev_copy.y),
                  proj = side_vec_copy.project(mouse_vec_copy),
                  copy_verts = resize_copy.verts,
                  verts = resize.verts;

              /* Calculate mouse dist from side */
              let c = proj.copy();
                  c.add(prev_copy);

              let resize_vec = new module.Vector(int.mouse.rel.x - c.x, int.mouse.rel.y - c.y);

              /* Scale main side from transforms copy */
              resize.verts[check[side]] = {
                  x : copy_verts[check[side]].x + resize_vec.x,
                  y : copy_verts[check[side]].y + resize_vec.y
              };
              resize.verts[check[side + 1]] = {
                  x : copy_verts[check[side + 1]].x + resize_vec.x,
                  y : copy_verts[check[side + 1]].y + resize_vec.y
              };

              /* Scale opposite side from transforms copy (using pivot) */
              let pivot = this.attributes.transforms.pivot,
                  adj_side_inv = new module.Vector(
                      copy_verts[check[side + 1]].x - copy_verts[check[side + 2]].x, 
                      copy_verts[check[side + 1]].y - copy_verts[check[side + 2]].y
                  ),
                  copy_vec = new module.Vector(
                      copy_verts[check[side + 1]].x - pivot.x,
                      copy_verts[check[side + 1]].y - pivot.y
                  ),
                  cur_vec = new module.Vector(
                      verts[check[side + 1]].x - pivot.x,
                      verts[check[side + 1]].y - pivot.y
                  ),
                  copy_proj = adj_side_inv.project(copy_vec),
                  cur_proj = adj_side_inv.project(cur_vec),
                  pivot_vec = new module.Vector(
                      copy_verts[check[side + 2]].x - pivot.x, 
                      copy_verts[check[side + 2]].y - pivot.y
                  ),
                  opp_proj = adj_side_inv.project(pivot_vec),
                  scale = (cur_proj.mag() / copy_proj.mag()) * (cur_proj.basis().equals(copy_proj.basis().inv()) ? -1 : 1);

              if (scale !== NaN) {

                  /* Scale and add resizing vector */
                  opp_proj.mult(scale - 1);
                  resize.verts[opp[side]] = {
                      x : copy_verts[opp[side]].x + opp_proj.x,
                      y : copy_verts[opp[side]].y + opp_proj.y
                  };
                  resize.verts[opp[side + 1]] = {
                      x : copy_verts[opp[side + 1]].x + opp_proj.x,
                      y : copy_verts[opp[side + 1]].y + opp_proj.y
                  };

                  /* Node rescaling calculations */
                  let copy_top = new module.Vector(copy_verts[3].x - copy_verts[0].x, copy_verts[3].y - copy_verts[0].y),
                      copy_left = new module.Vector(copy_verts[0].x - copy_verts[1].x, copy_verts[0].y - copy_verts[1].y),
                      top = new module.Vector(verts[3].x - verts[0].x, verts[3].y - verts[0].y),
                      left = new module.Vector(verts[0].x - verts[1].x, verts[0].y - verts[1].y);
                  this.nodes.forEach((node, i) => {
                      let node_vec = new module.Vector(this.nodes_copy[i].x - copy_verts[0].x, this.nodes_copy[i].y - copy_verts[0].y),
                          ct = copy_top.copy(),
                          cl = copy_left.copy(),
                          node_x_proj = ct.project(node_vec),
                          node_y_proj = cl.project(node_vec),
                          scale_x = (top.mag() / copy_top.mag()) || 1,
                          scale_y = (left.mag() / copy_left.mag()) || 1;
                      node_x_proj.mult(scale_x * (copy_top.basis().equals(top.basis().inv()) ? -1 : 1));
                      node_y_proj.mult(scale_y * (copy_left.basis().equals(left.basis().inv()) ? -1 : 1));
                      node.x = verts[0].x + node_x_proj.x + node_y_proj.x;
                      node.y = verts[0].y + node_x_proj.y + node_y_proj.y;
                  });
              }
          }
      }
      moveResize (w, h) {
          this.copy();

          if (w === 0 || h === 0) {
              return;
          }
          
          let int = module.Interactor,
              pivot = this.attributes.transforms.pivot,//this.attributes.transforms.scale.center,
              angle = this.attributes.transforms.rotation.radians,
              resize = this.attributes.transforms.scale,
              verts = resize.verts;
              
          if (w !== null) {
              let current_w = Element.dist(verts[0], verts[3]);

              this.nodes.forEach(node => {
                  let toNode = new module.Vector(pivot.x - node.x, pivot.y - node.y),
                      basis = module.Vector.basisFromAngle(angle),
                      proj = basis.project(toNode);
                  if (proj.mag() > 0.001) {
                      let upToNode = new module.Vector(proj.x - toNode.x, proj.y - toNode.y);
                      proj.mult(w / current_w);
                      proj.add(upToNode);
                      node.x = pivot.x - proj.x;
                      node.y = pivot.y + proj.y;
                  }
              });
          } else {
              let current_h = Element.dist(verts[0], verts[1]);

              this.nodes.forEach(node => {
                  let toNode = new module.Vector(pivot.x - node.x, pivot.y - node.y),
                      basis = module.Vector.basisFromAngle(angle - 1/2 * Math.PI),
                      proj = basis.project(toNode);
                  if (proj.mag() > 0.001) {
                      let upToNode = new module.Vector(proj.x - toNode.x, proj.y - toNode.y);
                      proj.mult(h / current_h);
                      proj.add(upToNode);
                      node.x = pivot.x + proj.x;
                      node.y = pivot.y - proj.y;
                  }
              });
          }
      }
      clickContext () {
          let int = module.Interactor,
              context = this.interface.context;
          if (Element.dist(int.mouse.rel, {x : context.x + 30 * 1/int.mouse.scale, y : context.y}) < 18 * 1/int.mouse.scale) {
              if (int.mouse.pressed && int.mouse.button === 0) {
                  
              }
          }
      }
      renderUI (ctx) {
          let int = module.Interactor,
              trans = this.attributes.transforms,
              mouse = module.Interactor.mouse,
              verts = trans.scale.verts,
              disabled_sides = this.interface.disabled_sides;
          let color = 'rgba(0, 0, 0, 0.3)',
              off_color = 'rgba(0, 0, 0, 0.15)'

          /* Exit if element isn't active */
          if (int.element.uuid !== this.uuid) return;

          /* 'Spokes' from pivot to resize frame */
          ctx.save();
          trans.scale.verts.forEach(vert => { 
              ctx.beginPath();
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
              ctx.moveTo(trans.pivot.x, trans.pivot.y);
              ctx.lineTo(vert.x, vert.y);
              ctx.setLineDash([6 / mouse.scale, 6 / mouse.scale]);
              ctx.stroke();
              ctx.closePath();
          });
          ctx.restore();

          /* Rotation UI */
          const angle = trans.rotation.radians;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillStyle = 'transparent';
          ctx.lineWidth = 5 * 1/int.mouse.scale;
          ctx.arc(trans.pivot.x, trans.pivot.y, 13 * 1/int.mouse.scale, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.fill();
          ctx.beginPath();
          ctx.strokeStyle = trans.rotation.hovered ? 'red' : 'orange';
          ctx.fillStyle = '#00000000';
          ctx.lineWidth = 3 * 1/int.mouse.scale;
          ctx.arc(trans.pivot.x, trans.pivot.y, 12 * 1/int.mouse.scale, 0, angle);
          ctx.stroke();
          ctx.fill();
          ctx.moveTo(
              trans.pivot.x + 4 * 1/int.mouse.scale * Math.cos(angle),
              trans.pivot.y + 4 * 1/int.mouse.scale * Math.sin(angle),
          );
          ctx.lineTo(
              trans.pivot.x + 20 * 1/int.mouse.scale * Math.cos(angle),
              trans.pivot.y + 20 * 1/int.mouse.scale * Math.sin(angle),
          );
          ctx.stroke();
          ctx.closePath();
          ctx.restore();

          /* Pivot UI */
          ctx.beginPath();
          ctx.fillStyle = trans.pivot.hovered ? color : off_color;
          ctx.ellipse(trans.pivot.x, trans.pivot.y, 6 * 1/int.mouse.scale, 6 * 1/int.mouse.scale, 0, 0, 2 * Math.PI);
          ctx.fill();
          ctx.closePath();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 * 1/int.mouse.scale;
          ctx.ellipse(trans.pivot.x, trans.pivot.y, 9 * 1/int.mouse.scale, 9 * 1/int.mouse.scale, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.closePath();

          /* Resize Box UI */
          ctx.save();
          for (let i = 0; i < verts.length; i++) {
              let next_index = (i + 1) % 4;
              ctx.beginPath();
              ctx.lineWidth = 1 * 1/int.mouse.scale;
              ctx.strokeStyle = color;
              ctx.setLineDash([6 / mouse.scale, 6 / mouse.scale]);
              ctx.moveTo(trans.scale.verts[i].x, trans.scale.verts[i].y);
              ctx.lineTo(trans.scale.verts[next_index].x, trans.scale.verts[next_index].y);
              if (disabled_sides.includes(i)) ctx.strokeStyle = 'red';
              ctx.stroke();
              ctx.closePath();
          }
          ctx.restore();

          /* Center UI */
          let center = this.attributes.transforms.scale.center;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.moveTo(center.x, center.y - 10 * 1/int.mouse.scale);
          ctx.lineTo(center.x, center.y + 10 * 1/int.mouse.scale);
          ctx.stroke();
          ctx.closePath();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.moveTo(center.x - 10 * 1/int.mouse.scale, center.y);
          ctx.lineTo(center.x + 10 * 1/int.mouse.scale, center.y);
          ctx.stroke();
          ctx.closePath();
          ctx.restore();

          /* Context UI */
          let context = this.interface.context;
          let cur_verts = verts.map(vert => {return {vert : vert, x : vert.x, y : vert.y}});
          cur_verts.sort((a, b) => (a.y * 0.2 - a.x * 0.8) - (b.y * 0.2 - b.x * 0.8));
          let vert = cur_verts[0].vert;
          context.x = vert.x;
          context.y = vert.y;
          if (this.holding('none')) {
              ctx.beginPath();
              //ctx.globalCompositeOperation = 'difference';
              ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
              ctx.ellipse(context.x + 30 * 1/int.mouse.scale, context.y, 18 * 1/int.mouse.scale, 18 * 1/int.mouse.scale, 0, 0, 2 * Math.PI);
              ctx.fill();
              //ctx.globalCompositeOperation = 'source-over';
              ctx.closePath();
              ctx.beginPath();
              ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              if (Element.dist(int.mouse.rel, {x : context.x + 30 * 1/int.mouse.scale, y : context.y}) < 18 * 1/int.mouse.scale) {
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                  int.mouse.cursor = 'pointer';
              }
              ctx.ellipse(context.x + 30 * 1/int.mouse.scale, context.y, 15 * 1/int.mouse.scale, 15 * 1/int.mouse.scale, 0, 0, 2 * Math.PI);
              ctx.fill();
              ctx.closePath();
          }

      }

      /* Element updating */
      update () {
          let int = module.Interactor;

          if (int.element.uuid !== this.uuid) {
              this.interface.isActive = false;
          }

          if (int.mouse.pressed && int.element.uuid === this.uuid) {
              if (this.attributes.dropdown.isLoaded) {
                  this.attributes.dropdown.isLoaded = false;
              }
          }

          if (!this.interface.isActive) {
              // Do something here
          } else {
              Interactor.mouse.cursor = 'DEFAULT';
          }

          /* When not grabbing a node or the resize box, recalculate resize */
          if (int.element.node.uuid === null && !int.element.resize.grab) {
              this.calculateResize();
          }
          this.calculateCenter();
      }
      run () {
          if (!this.interface.hold_until_reclick) {
              this.update();
              this.ensurePivotVerts();
              this.hoverResize();
              this.hoverNodes();
              this.hoverPivot();
              this.hoverRotation();
              this.grabPivot();
              this.grabRotation();
              this.grabNodes();
              this.grabResize();
              this.clickContext();
              this.snapPivotLocal();
              this.snapNodesGlobal();
              this.detectExport();
          }

          if (!module.Interactor.mouse.pressed) {
              this.interface.hold_until_reclick = false;
          }
      }
      detectExport () {
          let int = module.Interactor;
          if (int.element.uuid === this.uuid) {
              if (int.keyboard.pressed && ['E', 'e'].includes(int.keyboard.key.name)) {
                  let nodes = this.nodes,
                      center = this.attributes.transforms.scale.center,
                      angle = this.attributes.transforms.rotation.radians * 180 / Math.PI,
                      width = Element.dist(nodes[0], nodes[3]),
                      height = Element.dist(nodes[0], nodes[1]);
                  function rnd (v) {
                      return Math.round(v * 1000) / 1000;
                  }
                  const format = this.attributes.format,
                        style = format.attributes.style,
                        replace = {
                          "#fill_color" : Object.values(Format.hexToRGB(style.fill.color)).join(', '),
                          "#stroke_color" : Object.values(Format.hexToRGB(style.stroke.color)).join(', '),
                          "#stroke_width" : style.stroke.width,
                          "#width" : rnd(width),
                          "#height" : rnd(height),
                          "#center" : (function () {
                              return [rnd(center.x), rnd(center.y)].join(', ')
                          })(),
                          "#angle" : (function () {
                              return rnd(angle);
                          })()
                        };
                  let code = (format.attributes.format.export || {script : function () {}}).script(this);
                  Object.keys(replace).forEach(key => {
                      code = code.replaceAll(key, replace[key]);
                  });
                  console.log(code);
              }
          }
      }
  }
  module.Element = Element;

  /* Array handler */
  module.Flats = {
      Elements : [],
      Snappers : [],
      Anchors : [],
      Controllers : [],
      Windows : [],
      Formats : {},
      Snaps : {},
      reorder : {
          elements : function () {
              if (Interactor.draggedItem.target === 'elements') {
                  Interactor.draggedItem.target = '';
                  console.log(Interactor.draggedItem.order);
                  let copyElements = [];
                  Interactor.draggedItem.order.forEach(uuid => {
                      const el = module.Flats.get.element(uuid);
                      if (el !== null) copyElements.push(el);
                  });
                  Flats.Elements = copyElements;
              }
          }
      },
      get : {
          element : function (uuid) {
              var that = module.Flats;
              for (let i = 0; i < that.Elements.length; i++) {
                  if (that.Elements[i].uuid === uuid) {
                      return that.Elements[i];
                  }
              }
              return null;
          },
          snapper : function (uuid) {
              var that = module.Flats;
              for (let i = 0; i < that.Snappers.length; i++) {
                  if (that.Snappers[i].uuid === uuid) {
                      return that.Snappers[i];
                  }
              }
              return null;
          },
          format : function (name) {
              return module.Flats.Formats[name];
          },
          anchor : function (uuid) {
              var that = module.Flats;
              for (let i = 0; i < that.Anchors.length; i++) {
                  if (that.Anchors[i].uuid === uuid) {
                      return that.Anchors[i];
                  }
              }
              return null;
          },
          controller : function (uuid) {
              var that = module.Flats;
              for (let i = 0; i < that.Controllers.length; i++) {
                  if (that.Controllers[i].uuid === uuid) {
                      return that.Controllers[i];
                  }
              }
              return null;
          },
          window : function (uuid) {
              var that = module.Flats;
              for (let i = 0; i < that.Windows.length; i++) {
                  if (that.Windows[i].uuid === uuid) {
                      return that.Windows[i];
                  }
              }
              return null;
          }
      },
      findTopAnchor : function () {
          let int = module.Interactor;
          let anchors = this.Anchors.map(a => {
              return {v : a.interface.passes_check, an : a}
          });
          anchors = anchors.filter(e => e.v);
          if (int.mouse.pressed && int.mouse.button === 0) {
              return (anchors[anchors.length - 1] || {an:undefined}).an;
          } else return undefined;
      },
      findTopElement : function () {
          let int = module.Interactor;
          let elements = this.Elements.map(e => {
              return {v : e.interface.passes_check, el : e}
          });
          elements = elements.filter(e => e.v);
          if (int.mouse.pressed && int.mouse.button === 0) {
              return (elements[elements.length - 1] || {el:undefined}).el;
          } else return undefined;
      }
  };

  
  /* A very pointless wrapper class */
  class Format {
      constructor (name) {
          let format = module.Flats.Formats[name];

          /* Confirm named format exists */
          if (!format) {
              throw new Error(`No format named ${name} was found.`);
          }

          /* Read-only binding with format object */
          this.name = name;
          this.attributes = {
              format,
              style : {
                  stroke : {
                      color : '#000000',
                      opacity : 255,
                      width : 1
                  },
                  fill : {
                      color : '#96aa14',
                      opacity : 255
                  }
              }  
          };
      }
      static hexToRGB (hex) {
          /* Credit to @Tim Down on stackoverflow.com */
          let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
              a :parseInt(result[4], 16)
          } : null;
      }
      use (ctx, element) {
          /* Call the format 'main' rendering method */
          if (this.attributes.format.main !== undefined) {
              this.attributes.format.main(ctx, element, this.attributes.style);
          }
      }
      getColor (type) {
          const style = this.attributes.style;
          if (type === 'stroke') {
              return style.stroke.color + ((style.stroke.opacity < 16 ? '0' : '') + style.stroke.opacity.toString(16));
          } else if (type === 'fill') {
              return style.fill.color + ((style.fill.opacity < 16 ? '0' : '') + style.fill.opacity.toString(16));
          }
      }
      setColor (type, value, alpha=false) {
          const style = this.attributes.style;
          if (type === 'stroke') {
              style.stroke.color = value;
              style.stroke.opacity = alpha !== false ? alpha : style.stroke.opacity;
          } else if (type === 'fill') {
              style.fill.color = value;
              style.fill.opacity = alpha !== false ? alpha : style.fill.opacity;
          }
      }
  }
  module.Format = Format;

  /* Interaction handler */
  module.Interactor = {
      global : {
          icon_scale : 1
      },
      holding : function (type,exclusive=true) {
          let passes = false,
              fail = false;
          let conditions = Object.entries({
              'pivot' : this.element.pivot.grab,
              'node' : this.element.node.uuid !== null,
              'resize' : this.element.resize.grab,
              'rotation' : this.element.rotation.grab,
              'snapper-node' : this.snapper.node.uuid !== null,
              'anchor-pivot' : this.anchor.pivot.grab,
              'anchor-rotation' : this.anchor.rotation.grab,
              'anchor-resize' : this.anchor.resize.grab
          });
          conditions.forEach(v => {
              if (v[0] === type && v[1] === true) {
                  passes = true;
              }
              if (exclusive && v[0] !== type && v[1] === true) {
                  fail = true;
              }
          });

          // Special Conditions
          switch (type) {
              case 'none':
                  let none = false;
                  conditions.forEach(v => none = none || v[1]);
                  return !none;
              case 'any':
                  let any = false;
                  conditions.forEach(v => any = any || v[1]);
                  return any;
          }
          return passes && !fail;
      },
      reset : function () {
          /* SOOO INEFFICIENT RN */
          this.element.uuid = null;
          this.element.node.uuid = null;
          this.element.node.grab = false;
          this.element.resize.grab = false;
          this.element.resize.side = null;
          this.element.pivot.grab = false;
          this.element.rotation.grab = false;

          this.snapper.uuid = null;
          this.snapper.node.uuid = null;
          this.snapper.node.grab = false;

          this.anchor.uuid = null;
          this.anchor.resize.grab = false;
          this.anchor.resize.side = null;
          this.anchor.pivot.grab = false;
          this.anchor.rotation.grab = false;
      },
      select_stack : {
          list : [],
          blocked : false,
          add : function (object) {
              if (!this.blocked) {
                  const prefix = object instanceof Element ? 'element' : (object instanceof Anchor ? 'anchor' : (object instanceof Snapper ? 'snapper' : 'format'));
                  this.list.push(`${prefix}#${object.uuid}`);
              }
          },
          block : function () {
              this.list = [];
              this.blocked = true;
          },
          selectTop : function () {
              /*
                Select object that is on top.
              */
              if (this.list.length > 0) {
                  let item = this.list[this.list.length - 1],
                      prefix = item.slice(0, item.indexOf('#')),
                      uuid = item.slice(item.indexOf('#') + 1);
                      object = module.Flats.get[prefix](uuid);
                  object.select();
                  switch (prefix) {
                      case "e":

                      break;
                  }
              }
          },
          recycle : function () {
              this.list = [];
              this.blocked = false;
          }
      },
      element : {
          object : null,
          uuid : null,
          selected_on_cycle : false,
          resize : {
              side : null,
              grab : false
          },
          pivot : {
              grab : false
          },
          rotation : {
              grab : false
          },
          node : {
              uuid : null,
              grab : false,
              event : {
                  grab : function () {}
              }
          },
          event : {
              select : function () {}
          }
      },
      snapper : {
          uuid : null,
          node : {
              uuid : null,
              grab : false
          },
          checkKey : function () {
              let int = module.Interactor;
              if (['S', 's'].includes(int.keyboard.key.name) && int.keyboard.pressed) {
                  Flats.Snappers.forEach(snapper => snapper.interface.isActive = true);
              } else {
                  Flats.Snappers.forEach(snapper => snapper.interface.isActive = false);
              }
          }
      },
      anchor : {
          uuid : null,
          selected_on_cycle : false,
          resize : {
              side : null,
              grab : false
          },
          pivot : {
              grab : false
          },
          rotation : {
              grab : false
          },
          checkKey : function () {
              let int = module.Interactor;
              if (['A', 'a'].includes(int.keyboard.key.name) && int.keyboard.pressed) {
                  Flats.Anchors.forEach(anchor => anchor.interface.isActive = true);
              } else {
                  Flats.Anchors.forEach(anchor => anchor.interface.isActive = false);
              }
          }
      },
      node_field : {
          element : null,
          x : 0,
          y : 0,
          tx : 0,
          ty : 0,
          grab : false,
      },
      draggedItem : {
          order : [],
          target : '',
          element : null
      },
      controller : {
          uuid : null,
          adding : {
              isActive : false,
              currentElements : []
          }
      },
      mouse : {
          cursor : 'DEFAULT',
          pressed : false,
          button : 0,
          rel : {
              x : 0,
              y : 0
          },
          abs : {
             x : 0,
             y : 0 
          },
          scale : 1.0
      },
      keyboard : {
          key : {
              name : '',
              code : -1
          },
          pressed : false
      },
      reset_cursor : function () {
          this.mouse.cursor = 'DEFAULT';
      },
      set_cursor : function () {
          /* Set cursor type */
          document.body.style.cursor = this.mouse.cursor;
      },
      clear_selector_on_cycle : function () {
          this.element.selected_on_cycle = false;
          this.anchor.selected_on_cycle = false;
      },
      /*clearOther : function (type) {
          if (type === 'element') {
              this.anchor.uuid = null;
          } else if (type === 'anchor') {
              this.element.uuid = null;
          }
      },*/
      update : function (DOM) {

          /* Clicking off */
          if (this.mouse.pressed && this.element.node.uuid === null) {
              this.element.node.grab = false;
          }

          /*if (this.anchor.uuid !== null) {
              this.element.uuid = null;
          }
          if (this.element.uuid !== null) {
              this.anchor.uuid = null;
          }*/

          /* Releasing mouse */
          if (!this.mouse.pressed) {
              let element = module.Flats.get.element(this.element.uuid);
              (element || {releaseNodes : function () {}}).releaseNodes();
              this.element.resize.grab = false;
              this.element.resize.side = null;
              this.element.pivot.grab = false;
              this.element.rotation.grab = false;
              this.anchor.pivot.grab = false;
              this.anchor.rotation.grab = false;
              this.anchor.resize.grab = false;
              this.anchor.resize.side = null;
          }

          /* Moving the canvas with 'Control' key */
          if (this.mouse.pressed) {
              if (this.keyboard.key.name === "Control" && this.keyboard.pressed) {
                  Camera.mouseRef.x += this.mouse.abs.x - this.mouse.px;
                  Camera.mouseRef.y += this.mouse.abs.y - this.mouse.py;
                  this.mouse.cursor = "grab";
              }
          }

          /* Deselecting element */
          if (this.keyboard.pressed) {
              if (this.keyboard.key.name === 'Escape') {
                  this.element.uuid = null;
                  this.element.node.uuid = null;
                  this.anchor.uuid = null;
                  this.reset();
              }
          }

          this.mouse.px = parseFloat(`${this.mouse.abs.x}`);
          this.mouse.py = parseFloat(`${this.mouse.abs.y}`);

          /* Update Mouse */
          let scope = this;
          if (!DOM.hasEventListener) {
              function mousePos (DOM, e) {
                  /* DISCLAIMER: Original code written by Google Gemini */
                  const rect = DOM.getBoundingClientRect();

                  const dX = e.clientX - rect.left,
                        dY = e.clientY - rect.top;
                  
                  const cX = dX * (DOM.width / rect.width),
                        cY = dY * (DOM.height / rect.height);
                  
                  return {x : cX, y : cY};
              }

              DOM.addEventListener("click", () => {
                  DOM.focus();
              });
              DOM.addEventListener('mousemove', function (e) {
                  scope.mouse.abs = mousePos(DOM, e);
              });
              DOM.addEventListener('mousedown', function (e) {
                  scope.mouse.pressed = true;
                  scope.mouse.button = e.button;
                  scope.mouse.abs = mousePos(DOM, e);
              });
              DOM.addEventListener('mouseup', function (e) {
                  scope.mouse.pressed = false;
                  scope.mouse.abs = mousePos(DOM, e);
              });
              DOM.addEventListener('contextmenu', function (e) {
                  e.preventDefault();
              });
              document.body.addEventListener('keydown', function (e) {
                  if (document.activeElement !== DOM) return;
                  
                  scope.keyboard.key = {
                      name : e.key,
                      code : e.code
                  };
                  scope.keyboard.pressed = true;
              });
              document.body.addEventListener('keyup', function (e) {
                  scope.keyboard.pressed = false;
              });
              DOM.addEventListener('wheel', function (e) {
                  e.preventDefault();

                  scope.mouse.pressed = false;
                  scope.mouse.abs = mousePos(DOM, e);

                  /* Updating mouse offset for zoom */
                  Camera.offset.x -= (scope.mouse.abs.x - Camera.mouseRef.x) / Camera.scale;
                  Camera.offset.y -= (scope.mouse.abs.y - Camera.mouseRef.y) / Camera.scale;
                  Camera.mouseRef.x = scope.mouse.abs.x;
                  Camera.mouseRef.y = scope.mouse.abs.y;
                  
                  /* Updating scaling */
                  Camera.scale *= Math.pow(1.1, -e.deltaY / 100);
                  scope.mouse.scale = Camera.scale;
              });

              DOM.hasEventListener = true;
          }
      }
  };
  

  /* Snapper element to make drawing easier */
  class Snapper {
      constructor (type) {
          /* ID generation checked against other elements */
          this.uuid = module.AlternativeCrypto.randomUUID({
              objects : module.Flats.Snappers,
              key : 'uuid'
          });
          this.type = type;

          this.attributes = {
              snap : null,
              width : 5,
              node_width : 5
          };

          this.interface = {
              isHovered : false,
              isActive : false
          };

          this.nodes = [
              {x : 200, y : 200}
          ];

          this.idNodes();
          this.bindSnap(module.Flats.Snaps[type]);
      }
      setWidth (width) {
          this.attributes.width = width;
      }
      setNodes (nodes) {
          this.nodes = nodes;
          this.idNodes();
      }
      test (point) {
          if (this.interface.isActive) {
              return this.attributes.snap.test(this, point);
          } else return null
      }
      bindSnap (snap) {
          this.attributes.snap = snap;
          this.idNodes();
      }
      idNodes () {
          let that = this;
          this.nodes.forEach(node => {
              node.uuid = module.AlternativeCrypto.randomUUID({
                  objects : this.nodes,
                  key : 'uuid'
              })
          });
      }
      hoverNodes () {
          let int = module.Interactor;

          if (!this.interface.isActive) return;

          const that = this;
          if (int.holding('none') || int.holding('snapper-node')) {
              this.nodes.forEach(node => {
                  if (Element.dist(node, int.mouse.rel) < (that.attributes.width * 2) * 1/int.mouse.scale) {
                      that.interface.isHovered = true;
                  }
              });
          }
      }
      grabNodes () {
          let int = module.Interactor,
              that = this;

          if (!this.interface.isActive) return;

          if (int.holding('none') || int.holding('snapper-node')) {
              this.nodes.forEach(node => {
                  if (int.mouse.pressed && int.mouse.button === 0) {
                      if (Element.dist(node, int.mouse.rel) < (that.attributes.width * 2) * 1/int.mouse.scale && int.snapper.node.uuid === null) {
                          int.reset();
                          int.snapper.node.uuid = node.uuid;
                          int.snapper.node.grab = true;
                      }
                      if (int.snapper.node.uuid === node.uuid) {
                          node.x = int.mouse.rel.x;
                          node.y = int.mouse.rel.y;
                      }
                  }
              });
          }
      }
      render (ctx) {
          let int = module.Interactor,
              that = this;

          if (!this.interface.isActive) return;
          if (this.attributes.snap !== null) {
              this.attributes.snap.main(this, ctx);
          }
          this.nodes.forEach(node => {
              ctx.beginPath();
              ctx.fillStyle = node.mouseOff?.color || 'black';
              ctx.ellipse(node.x, node.y, (that.attributes.node_width * 1.1) * 1/int.mouse.scale, (that.attributes.node_width * 1.1) * 1/int.mouse.scale, 0, 0, 2 * Math.PI);
              ctx.fill();
              ctx.closePath();
              ctx.beginPath();
              ctx.fillStyle = node.mouseOff?.color || 'red';
              if (Element.dist(node, int.mouse.rel) < (that.attributes.width * 2) * 1/int.mouse.scale) {
                  ctx.fillStyle = node.mouseOn?.color || 'orange';
              }
              ctx.ellipse(node.x, node.y, that.attributes.node_width * 1/int.mouse.scale, that.attributes.node_width * 1/int.mouse.scale, 0, 0, 2 * Math.PI);
              ctx.fill();
              ctx.closePath();
          });
      }
      update () {
          let int = module.Interactor;
          this.interface.isHovered = false;


          if (!int.mouse.pressed) {
              int.snapper.node.uuid = null
              int.snapper.node.grab = false;
          }
      }
  }
  module.Snapper = Snapper;

  /* I really should've tried using inheritance *cries* */
  class Anchor {
      constructor (x, y) {
          /* ID generation checked against other anchors */
          this.uuid = module.AlternativeCrypto.randomUUID({
              objects : module.Flats.Anchors,
              key : 'uuid'
          });

          /* Rendering Properties */
          this.attributes = {
              name : 'Unknown Anchor',
              dropdown : null,
              anchor : null,
              transforms : {
                  pivot : {
                      x : x,
                      y : y,
                      hovered : false
                  },
                  scale : {
                      verts : [
                          { x : 0, y : 0 },
                          { x : 0, y : 0 },
                          { x : 0, y : 0 },
                          { x : 0, y : 0 }
                      ],
                      center : {
                          x : 0,
                          y : 0
                      },
                      width : 32,
                      height : 32
                  },
                  rotation : {
                      radians : 0,//Math.PI * 1/4,
                      hovered : false,
                  }
              }
          };

          /* Internal UI Status */
          this.interface = {
              isActive  : false,
              isResizing : false,
              isTranslating : false,
              isRotating : false,

              context : {
                  x : 0,
                  y : 0
              },
              resize_calculation : {
                  rel : true,
                  include_pivots : false
              },
              detection_radius : 10,
              disabled_sides : [],
              passes_check : false
          };

          /* Attached Elements */
          this.elements = [];

          /* Field Copies for Transformations */
          this.transforms_copy = {};
      }

      /* Anchor Methods */
      addDropdown () {
          this.attributes.dropdown = new module.AnchorDropdown(
              this.attributes.name,
              this.uuid,
              {}
          );
          this.attributes.dropdown.load();
          this.attributes.dropdown.loadFields();
      }
      copy () {
          this.transforms_copy = structuredClone({...this.attributes.transforms});
      }
      select () {
          let int = module.Interactor;

          /* Check for current interactions and set new interaction */
          if (this.holding('none')) {
              int.reset();
              int.anchor.uuid = this.uuid;
              int.anchor.selected_on_cycle = true;

              this.interface.isActive = true;

              /* Interactor Event */
              //int.anchor.event.select();
              this.interface.hold_until_reclick = true;
          }
      }
      checkPivotSelect () {
          let int = module.Interactor, 
              abs = module.Interactor.mouse.abs;
          
          let passes = false;
          if (int.mouse.pressed && int.mouse.button === 0 && this.holding('none')) {
              if (Element.dist(this.attributes.transforms.pivot, int.mouse.rel) < this.interface.detection_radius * 1/int.mouse.scale) {
                  passes = true;
                  int.select_stack.add(this);
              }
          }

          this.interface.passes_check = this.interface.passes_check || passes;
          if (this.holding('any')) {
              this.interface.passes_check = false;
          }
      }
      clearCheck () {
          this.interface.passes_check = false;
          this.interface.disabled_sides = [];
      }
      holding (type) {
          let int = module.Interactor;
          return int.holding(type);
      }


      snapPivotLocal () {
          let int = module.Interactor,
              pivot = this.attributes.transforms.pivot,
              verts = this.attributes.transforms.scale.verts,
              disabled_sides = this.interface.disabled_sides;
          
          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) return;

          if (int.mouse.pressed && int.mouse.button === 2 && int.anchor.pivot.grab && 
              !(int.keyboard.key.name === 'Shift' && int.keyboard.pressed)) {
              /* Check resize verts */
              verts.forEach(vert => {
                  const d = Element.dist(vert, int.mouse.rel);
                  if (d < 10 * 1/int.mouse.scale) {
                      pivot.x = parseFloat(vert.x);
                      pivot.y = parseFloat(vert.y);
                  }
              });

              /* Check center */
              const center = this.attributes.transforms.scale.center;
              const center_d = Element.dist(center, int.mouse.rel);
              if (center_d < 10 * 1/int.mouse.scale) {
                  pivot.x = parseFloat(center.x);
                  pivot.y = parseFloat(center.y);
              }

              /* Check global snappers */
              Flats.Snappers.forEach(snapper => {
                  let con = snapper.test(int.mouse.rel);
                  if (con !== null) {
                      pivot.x = parseFloat(con.x);
                      pivot.y = parseFloat(con.y);
                  }
              });
          }
      }
      ensurePivotVerts () {
          let int = module.Interactor,
              pivot = this.attributes.transforms.pivot,
              verts = this.attributes.transforms.scale.verts,
              disabled_sides = this.interface.disabled_sides;
          for (let i = 0; i < verts.length; i++) {
              let vert = verts[i];
              if (pivot.x === vert.x && pivot.y === vert.y) {
                  disabled_sides.push(i);
                  disabled_sides.push((i + 3) % 4);
              }
              let next_vert = verts[(i + 1) % 4],
                  side = new module.Vector(next_vert.x - vert.x, next_vert.y - vert.y),
                  pivot_vec = new module.Vector(vert.x - pivot.x, vert.y - pivot.y),
                  ext = side.project(pivot_vec),
                  dist = Element.dist(pivot_vec, ext);
              if (dist < 20 * 1/int.mouse.scale) {
                  disabled_sides.push(i);
              }
          }
      }
      hoverPivot () {
          let int = module.Interactor;

          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('anchor-pivot')) {
              if (Element.dist(int.mouse.rel, this.attributes.transforms.pivot) < 9 * 1/int.mouse.scale) {
                  this.attributes.transforms.pivot.hovered = true;
                  int.mouse.cursor = 'move';
              }
          }
      }
      grabPivot () {
          let int = module.Interactor;

          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('anchor-pivot')) {
              if (Element.dist(int.mouse.rel, this.attributes.transforms.pivot) < 9 * 1/int.mouse.scale) {
                  if (int.mouse.pressed) {
                      int.anchor.pivot.grab = true;
                  }
              }
              if (int.anchor.pivot.grab && int.mouse.pressed) {
                  if (int.mouse.button === 2) {
                      this.attributes.transforms.pivot = {
                          x : int.mouse.rel.x,
                          y : int.mouse.rel.y
                      };
                  } else if (int.mouse.button === 0) {
                      if (!this.interface.isTranslating) {
                          this.interface.isTranslating = true;
                          this.elements.forEach(element => {
                              element.copy();
                          })
                          this.copy();
                      }

                      Flats.Snappers.forEach(snapper => {
                          const con = snapper.test(int.mouse.rel);
                          if (con !== null) {
                              int.mouse.rel.x = parseFloat(con.x);
                              int.mouse.rel.y = parseFloat(con.y);
                          }
                      });

                      let pivot = this.attributes.transforms.pivot,
                          pivot_copy = this.transforms_copy.pivot;
                      this.elements.forEach(element => {
                          let other_pivot_copy = element.transforms_copy.pivot,
                              verts = element.attributes.transforms.scale.verts,
                              verts_copy = element.transforms_copy.scale.verts,
                              nodes_copy = element.nodes_copy;
                          for (var i = 0; i < verts.length; i++) {
                              verts[i].x = verts_copy[i].x + int.mouse.rel.x - pivot_copy.x;
                              verts[i].y = verts_copy[i].y + int.mouse.rel.y - pivot_copy.y;
                          }
                          for (var i = 0; i < element.nodes.length; i++) {
                              element.nodes[i].x = nodes_copy[i].x + int.mouse.rel.x - pivot_copy.x;
                              element.nodes[i].y = nodes_copy[i].y + int.mouse.rel.y - pivot_copy.y;
                          }
                          element.attributes.transforms.pivot = {
                              x : other_pivot_copy.x + int.mouse.rel.x - pivot_copy.x,
                              y : other_pivot_copy.y + int.mouse.rel.y - pivot_copy.y
                          };
                      });
                      let verts = this.attributes.transforms.scale.verts,
                          verts_copy = this.transforms_copy.scale.verts;
                      for (var i = 0; i < verts.length; i++) {
                          verts[i].x = verts_copy[i].x + int.mouse.rel.x - pivot_copy.x;
                          verts[i].y = verts_copy[i].y + int.mouse.rel.y - pivot_copy.y;
                      }
                      this.attributes.transforms.pivot = {
                          x : int.mouse.rel.x,
                          y : int.mouse.rel.y
                      };
                  }
              }
          }
          if (!int.mouse.pressed) {
              this.interface.isTranslating = false;
          }
      }
      movePivot (x, y) {
          if (x === null) {
              x = this.attributes.transforms.pivot.x;
              y = y;
          } else if (y === null) {
              x = x;
              y = this.attributes.transforms.pivot.y;
          }
          
          this.copy();

          let pivot = this.attributes.transforms.pivot,
              verts = this.attributes.transforms.scale.verts,
              pivot_copy = this.transforms_copy.pivot,
              verts_copy = this.transforms_copy.scale.verts,
              nodes_copy = this.nodes_copy;
          for (var i = 0; i < verts.length; i++) {
              verts[i].x = verts_copy[i].x + x - pivot_copy.x;
              verts[i].y = verts_copy[i].y + y - pivot_copy.y;
          }
          for (var i = 0; i < this.elements.length; i++) {
              let element = this.elements[i];
              element.copy();
              element.movePivot(
                  x + element.transforms_copy.pivot.x - pivot_copy.x, 
                  y + element.transforms_copy.pivot.y - pivot_copy.y
              );
          }

          this.attributes.transforms.pivot = {
              x : x,
              y : y
          };
      }
      hoverRotation () {
          let int = module.Interactor,
              trans = this.attributes.transforms;

          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('anchor-rotation')) {
              let d = Element.dist(int.mouse.rel, this.attributes.transforms.pivot);
              if (d > 10 * 1/int.mouse.scale && d < 15 * 1/int.mouse.scale) {
                  this.attributes.transforms.rotation.hovered = true;
                  int.mouse.cursor = 'pointer';
              }
          }
      }
      grabRotation () {
          let int = module.Interactor,
              trans = this.attributes.transforms;

          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) return;

          if (this.holding('none') || this.holding('anchor-rotation')) {
              let d = Element.dist(int.mouse.rel, this.attributes.transforms.pivot);
              if (d > 10 * 1/int.mouse.scale && d < 15 * 1/int.mouse.scale) {
                  if (int.mouse.pressed) {
                      int.anchor.rotation.grab = true;
                  }
              }
              if (int.anchor.rotation.grab && int.mouse.pressed) {
                  if (int.mouse.button === 0) {
                      if (!this.interface.isRotating) {
                          this.interface.isRotating = true;
                          let that = this;
                          this.copy();
                          this.elements.forEach(element => {
                              element.copy();
                              Element.rotatePoints(trans.pivot, element.nodes_copy, -that.transforms_copy.rotation.radians);
                              element.transforms_copy.pivot = Element.rotatePoints(trans.pivot, [element.transforms_copy.pivot], -that.transforms_copy.rotation.radians)[0];
                              element.transforms_copy.rotation.radians = 0;
                          })
                      }
                      
                      let angle = Math.atan2(int.mouse.rel.y - trans.pivot.y, int.mouse.rel.x - trans.pivot.x) * 180 / Math.PI;
                      if (!(int.keyboard.pressed && int.keyboard.key.name === 'Shift')) {
                          angle = Math.round(angle / 15) * 15;
                      }
                      this.elements.forEach(element => {
                          element.nodes_copy.forEach((node, i) => {
                              element.nodes[i].x = parseFloat(node.x);
                              element.nodes[i].y = parseFloat(node.y);
                          });
                          element.attributes.transforms.pivot = {
                              x : parseFloat(element.transforms_copy.pivot.x),
                              y : parseFloat(element.transforms_copy.pivot.y)
                          };
                          Element.rotatePoints(trans.pivot, element.nodes, angle * Math.PI / 180);
                          element.attributes.transforms.rotation.radians = element.transforms_copy.rotation.radians + angle * Math.PI / 180;
                          element.attributes.transforms.pivot = Element.rotatePoints(trans.pivot, [element.attributes.transforms.pivot], angle * Math.PI / 180)[0];
                      });
                      this.attributes.transforms.rotation.radians = angle * Math.PI / 180;
                  }
              }
          }
          if (!int.mouse.pressed) {
              this.interface.isRotating = false;
          }
      }
      calculateResize () {
          let trans = this.attributes.transforms,
              points = [];

          /* Rotate nodes to 'standard' positions */
          if (this.interface.resize_calculation.rel) {
              let that = this;
              this.elements.forEach(element => {
                  Element.rotatePoints(trans.pivot, element.nodes, -that.attributes.transforms.rotation.radians);
                  element.attributes.transforms.pivot = (Element.rotatePoints(trans.pivot, [element.attributes.transforms.pivot], -this.attributes.transforms.rotation.radians))[0];
                  points = points.concat(element.nodes);
                  if (this.interface.resize_calculation.include_pivots) {
                      points.push(element.attributes.transforms.pivot);
                  }
              });
          }

          /* Find bounds */
          let minx = Math.min.apply(null, points.map(n => n.x)),
              miny = Math.min.apply(null, points.map(n => n.y)),
              maxx = Math.max.apply(null, points.map(n => n.x)),
              maxy = Math.max.apply(null, points.map(n => n.y));
          
          /* Put bounds in vertex list */
          trans.scale.verts = [
              {x : minx, y : miny},
              {x : minx, y : maxy},
              {x : maxx, y : maxy},
              {x : maxx, y : miny}
          ];

          /* Rotate vertex list */
          if (this.interface.resize_calculation.rel) {
              Element.rotatePoints(trans.pivot, trans.scale.verts, this.attributes.transforms.rotation.radians);
          }

          /* Calculat width/height (depracated feature) */
          let width = Element.dist(trans.scale.verts[0], trans.scale.verts[3]),
              height = Element.dist(trans.scale.verts[0], trans.scale.verts[1]);
          trans.scale.width = width;
          trans.scale.height = height;

          /* Rotate nodes to 'standard' positions */
          if (this.interface.resize_calculation.rel) {
              let that = this;
              this.elements.forEach(element => {
                  Element.rotatePoints(trans.pivot, element.nodes, that.attributes.transforms.rotation.radians);
                  element.attributes.transforms.pivot = (Element.rotatePoints(trans.pivot, [element.attributes.transforms.pivot], this.attributes.transforms.rotation.radians))[0];
              });
          }
      }
      calculateCenter () {
          let verts = this.attributes.transforms.scale.verts;
          this.attributes.transforms.scale.center = {
              x : (verts[0].x + verts[1].x + verts[2].x + verts[3].x) / 4,
              y : (verts[0].y + verts[1].y + verts[2].y + verts[3].y) / 4
          };
      }
      moveRotation (angle) {
          let int = module.Interactor,
              trans = this.attributes.transforms,
              old_angle = this.attributes.transforms.rotation.radians;

          this.copy();
          this.elements.forEach(element => {
              element.copy();
              Element.rotatePoints(trans.pivot, element.nodes_copy, -old_angle);
              element.transforms_copy.pivot = Element.rotatePoints(trans.pivot, [element.transforms_copy.pivot], -old_angle)[0];
              element.attributes.transforms.rotation.radians -= old_angle;
          })
      
          this.elements.forEach(element => {
              element.nodes_copy.forEach((node, i) => {
                  element.nodes[i].x = parseFloat(node.x);
                  element.nodes[i].y = parseFloat(node.y);
              });
              element.attributes.transforms.pivot = {
                  x : parseFloat(element.transforms_copy.pivot.x),
                  y : parseFloat(element.transforms_copy.pivot.y)
              };
              Element.rotatePoints(trans.pivot, element.nodes, angle * Math.PI / 180);
              element.attributes.transforms.rotation.radians += angle * Math.PI / 180;
              element.attributes.transforms.pivot = Element.rotatePoints(trans.pivot, [element.attributes.transforms.pivot], angle * Math.PI / 180)[0];
          });
          this.attributes.transforms.rotation.radians = angle * Math.PI / 180;
      }
      hoverResize () {
          let int = module.Interactor,
              mouse = int.mouse,
              resize = this.attributes.transforms.scale;

          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) return;

          let check = [0, 1, 2, 3, 0, 1],
              opp = [2, 3, 0, 1, 2];
          if (this.holding('none')) {
              int.anchor.resize.side = null;
              for (let i = 1; i < check.length - 1; i++) {

                  /* Vectors for calculations */
                  let cur = resize.verts[check[i]],
                      prev = resize.verts[check[i - 1]],
                      side_vec = new module.Vector(cur.x - prev.x, cur.y - prev.y),
                      mouse_vec = new module.Vector(int.mouse.rel.x - prev.x, int.mouse.rel.y - prev.y),
                      proj = side_vec.project(mouse_vec),
                      side_vec_bas = side_vec.basis(),
                      proj_bas = proj.basis();

                  /* Calculate mouse dist from side */
                  let c = proj.copy();
                  c.add(prev);
                  let md = Element.dist(c, int.mouse.rel);
                  
                  /* Check if mouse is selecting a side */
                  if (proj.mag() < side_vec.mag() && proj_bas.equals(side_vec_bas) && md < 5 * 1/int.mouse.scale) {
                      int.anchor.resize.side = check[i - 1];
                  }
                  if (this.interface.disabled_sides.includes(int.anchor.resize.side)) {
                      int.anchor.resize.side = null
                  }
              }
          }
          if (int.anchor.resize.side !== null) {
              let cur_angle = parseFloat(this.attributes.transforms.rotation.radians) * 180 / Math.PI;
              if (cur_angle < 0) {
                  cur_angle = 180 - Math.abs(cur_angle);
              }
              let angle_index = Math.round(cur_angle / 45) % 4;
              if (int.mouse.cursor !== 'crosshair') {
                  if (this.interface.resize_calculation.rel) {
                      int.mouse.cursor = int.anchor.resize.side % 2 ? ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize'][angle_index] : ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'][angle_index];
                  } else {
                      int.mouse.cursor = int.anchor.resize.side % 2 ? 'ns-resize' : 'ew-resize';
                  }
              }
          }
      }
      grabResize (ctx) {
          let int = module.Interactor,
              mouse = int.mouse,
              resize = this.attributes.transforms.scale;

          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) return;

          let check = [0, 1, 2, 3, 0, 1],
              opp = [2, 3, 0, 1, 2];
          if (this.holding('none')) {
              /* Grab side and copy current state */
              if (int.anchor.resize.side !== null) {
                  if (int.mouse.pressed && int.mouse.button === 0) {
                      if (!this.interface.isResizing) {
                          this.copy();
                          this.elements.forEach(element => {
                              element.copy();
                          })
                          this.interface.isResizing = true;
                      }
                      int.anchor.resize.grab = true;
                  }
              }

              /* Clear resize */
              if (!int.mouse.pressed) {
                  this.interface.isResizing = false;
              }
          }

          /* Actual resizing rath */
          if (int.anchor.resize.side !== null && int.anchor.resize.grab) {
              /* Notes:
                  This method uses the pivot point as a local scaling, rotating, and translating anchor. 
                  I am using a vector approach to calculate these changes so there is a lot of variables 
                  and extra vectors required to properly scale it.
              */

              let cur_angle = parseFloat(this.attributes.transforms.rotation.radians) * 180 / Math.PI;
              if (cur_angle < 0) {
                  cur_angle = 180 - Math.abs(cur_angle);
              }
              let angle_index = Math.round(cur_angle / 45) % 4;
              if (int.mouse.cursor !== 'crosshair') {
                  if (this.interface.resize_calculation.rel) {
                      int.mouse.cursor = int.anchor.resize.side % 2 ? ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize'][angle_index] : ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'][angle_index];
                  } else {
                      int.mouse.cursor = int.anchor.resize.side % 2 ? 'ns-resize' : 'ew-resize';
                  }
              }

              /* Recalculate using transforms copy */
              let side = int.anchor.resize.side,
                  resize_copy = this.transforms_copy.scale,
                  prev_copy = resize_copy.verts[check[side]],
                  cur_copy = resize_copy.verts[check[side + 1]],
                  side_vec_copy = new module.Vector(cur_copy.x - prev_copy.x, cur_copy.y - prev_copy.y),
                  mouse_vec_copy = new module.Vector(int.mouse.rel.x - prev_copy.x, int.mouse.rel.y - prev_copy.y),
                  proj = side_vec_copy.project(mouse_vec_copy),
                  copy_verts = resize_copy.verts,
                  verts = resize.verts;

              /* Calculate mouse dist from side */
              let c = proj.copy();
                  c.add(prev_copy);

              let resize_vec = new module.Vector(int.mouse.rel.x - c.x, int.mouse.rel.y - c.y);

              /* Scale main side from transforms copy */
              resize.verts[check[side]] = {
                  x : copy_verts[check[side]].x + resize_vec.x,
                  y : copy_verts[check[side]].y + resize_vec.y
              };
              resize.verts[check[side + 1]] = {
                  x : copy_verts[check[side + 1]].x + resize_vec.x,
                  y : copy_verts[check[side + 1]].y + resize_vec.y
              };

              /* Scale opposite side from transforms copy (using pivot) */
              let pivot = this.attributes.transforms.pivot,
                  adj_side_inv = new module.Vector(
                      copy_verts[check[side + 1]].x - copy_verts[check[side + 2]].x, 
                      copy_verts[check[side + 1]].y - copy_verts[check[side + 2]].y
                  ),
                  copy_vec = new module.Vector(
                      copy_verts[check[side + 1]].x - pivot.x,
                      copy_verts[check[side + 1]].y - pivot.y
                  ),
                  cur_vec = new module.Vector(
                      verts[check[side + 1]].x - pivot.x,
                      verts[check[side + 1]].y - pivot.y
                  ),
                  copy_proj = adj_side_inv.project(copy_vec),
                  cur_proj = adj_side_inv.project(cur_vec),
                  pivot_vec = new module.Vector(
                      copy_verts[check[side + 2]].x - pivot.x, 
                      copy_verts[check[side + 2]].y - pivot.y
                  ),
                  opp_proj = adj_side_inv.project(pivot_vec),
                  scale = (cur_proj.mag() / copy_proj.mag()) * (cur_proj.basis().equals(copy_proj.basis().inv()) ? -1 : 1);

              
              if (scale !== NaN) {

                  /* Scale and add resizing vector */
                  opp_proj.mult(scale - 1);
                  resize.verts[opp[side]] = {
                      x : copy_verts[opp[side]].x + opp_proj.x,
                      y : copy_verts[opp[side]].y + opp_proj.y
                  };
                  resize.verts[opp[side + 1]] = {
                      x : copy_verts[opp[side + 1]].x + opp_proj.x,
                      y : copy_verts[opp[side + 1]].y + opp_proj.y
                  };
                  
                  /* Node rescaling calculations */
                  let copy_top = new module.Vector(copy_verts[3].x - copy_verts[0].x, copy_verts[3].y - copy_verts[0].y),
                      copy_left = new module.Vector(copy_verts[0].x - copy_verts[1].x, copy_verts[0].y - copy_verts[1].y),
                      top = new module.Vector(verts[3].x - verts[0].x, verts[3].y - verts[0].y),
                      left = new module.Vector(verts[0].x - verts[1].x, verts[0].y - verts[1].y);
                  this.elements.forEach(element => {
                      element.nodes.forEach((node, i) => {
                          let node_vec = new module.Vector(element.nodes_copy[i].x - copy_verts[0].x, element.nodes_copy[i].y - copy_verts[0].y),
                              ct = copy_top.copy(),
                              cl = copy_left.copy(),
                              node_x_proj = ct.project(node_vec),
                              node_y_proj = cl.project(node_vec),
                              scale_x = (top.mag() / copy_top.mag()) || 1,
                              scale_y = (left.mag() / copy_left.mag()) || 1;
                          node_x_proj.mult(scale_x * (copy_top.basis().equals(top.basis().inv()) ? -1 : 1));
                          node_y_proj.mult(scale_y * (copy_left.basis().equals(left.basis().inv()) ? -1 : 1));
                          node.x = verts[0].x + node_x_proj.x + node_y_proj.x;
                          node.y = verts[0].y + node_x_proj.y + node_y_proj.y;
                      });
                      let pivot_vec = new module.Vector(element.transforms_copy.pivot.x - copy_verts[0].x, element.transforms_copy.pivot.y - copy_verts[0].y),
                          ct = copy_top.copy(),
                          cl = copy_left.copy(),
                          pivot_x_proj = ct.project(pivot_vec),
                          pivot_y_proj = cl.project(pivot_vec),
                          scale_x = (top.mag() / copy_top.mag()) || 1,
                          scale_y = (left.mag() / copy_left.mag()) || 1;
                      pivot_x_proj.mult(scale_x * (copy_top.basis().equals(top.basis().inv()) ? -1 : 1));
                      pivot_y_proj.mult(scale_y * (copy_left.basis().equals(left.basis().inv()) ? -1 : 1));
                      element.attributes.transforms.pivot.x = verts[0].x + pivot_x_proj.x + pivot_y_proj.x;
                      element.attributes.transforms.pivot.y = verts[0].y + pivot_x_proj.y + pivot_y_proj.y;
                  });
              }
          }
      }
      moveResize (w, h) {
          this.copy();

          if (w === 0 || h === 0) {
              return;
          }
          
          let int = module.Interactor,
              that = this;
              
          if (w !== null) {
              this.elements.forEach(element => {
                  let pivot = that.attributes.transforms.pivot,
                      angle = that.attributes.transforms.rotation.radians,
                      resize = that.attributes.transforms.scale,
                      verts = resize.verts;
                  let current_w = Element.dist(verts[0], verts[3]);
                  element.nodes.forEach(node => {
                      let toNode = new module.Vector(pivot.x - node.x, pivot.y - node.y),
                          basis = module.Vector.basisFromAngle(angle),
                          proj = basis.project(toNode);
                      if (proj.mag() > 0.001) {
                          let upToNode = new module.Vector(proj.x - toNode.x, proj.y - toNode.y);
                          proj.mult(w / current_w);
                          proj.add(upToNode);
                          node.x = pivot.x - proj.x;
                          node.y = pivot.y + proj.y;
                      }
                  });
              });
          } else {
              this.elements.forEach(element => {
                  let pivot = that.attributes.transforms.pivot,
                      angle = that.attributes.transforms.rotation.radians,
                      resize = that.attributes.transforms.scale,
                      verts = resize.verts;
                  let current_h = Element.dist(verts[0], verts[1]);
                  element.nodes.forEach(node => {
                      let toNode = new module.Vector(pivot.x - node.x, pivot.y - node.y),
                          basis = module.Vector.basisFromAngle(angle - 1/2 * Math.PI),
                          proj = basis.project(toNode);
                      if (proj.mag() > 0.001) {
                          let upToNode = new module.Vector(proj.x - toNode.x, proj.y - toNode.y);
                          proj.mult(h / current_h);
                          proj.add(upToNode);
                          node.x = pivot.x + proj.x;
                          node.y = pivot.y - proj.y;
                      }
                  });
              });
          }
      }
      renderUI (ctx) {
          let int = module.Interactor,
              trans = this.attributes.transforms,
              mouse = module.Interactor.mouse,
              verts = trans.scale.verts,
              disabled_sides = this.interface.disabled_sides;
          let color = 'rgba(0, 0, 0, 0.3)',
              off_color = 'rgba(0, 0, 0, 0.15)'

          /* Exit if anchor is not active */
          if (int.anchor.uuid !== this.uuid) {
              ctx.beginPath();
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = `${16 * 1/int.mouse.scale * int.global.icon_scale}px sans-serif`;
              ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
              if (Element.dist(int.mouse.rel, trans.pivot) < this.interface.detection_radius *1/int.mouse.scale * int.global.icon_scale) {
                  ctx.fillStyle = 'black';
                  int.mouse.cursor = 'pointer';
              }
              ctx.fillText('⚓', trans.pivot.x, trans.pivot.y);

              ctx.closePath();
              return;
          };

          /* 'Spokes' from pivot to resize frame */
          ctx.save();
          trans.scale.verts.forEach(vert => { 
              ctx.beginPath();
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
              ctx.moveTo(trans.pivot.x, trans.pivot.y);
              ctx.lineTo(vert.x, vert.y);
              ctx.setLineDash([6 / mouse.scale, 6 / mouse.scale]);
              ctx.stroke();
              ctx.closePath();
          });
          ctx.restore();

          /* Rotation UI */
          const angle = trans.rotation.radians;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillStyle = 'transparent';
          ctx.lineWidth = 5 * 1/int.mouse.scale * int.global.icon_scale;
          ctx.arc(trans.pivot.x, trans.pivot.y, 13 * 1/int.mouse.scale * int.global.icon_scale, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.fill();
          ctx.beginPath();
          ctx.strokeStyle = trans.rotation.hovered ? 'red' : 'orange';
          ctx.fillStyle = '#00000000';
          ctx.lineWidth = 3 * 1/int.mouse.scale * int.global.icon_scale;
          ctx.arc(trans.pivot.x, trans.pivot.y, 12 * 1/int.mouse.scale * int.global.icon_scale, 0, angle);
          ctx.stroke();
          ctx.fill();
          ctx.moveTo(
              trans.pivot.x + 4 * 1/int.mouse.scale * Math.cos(angle) * int.global.icon_scale,
              trans.pivot.y + 4 * 1/int.mouse.scale * Math.sin(angle) * int.global.icon_scale,
          );
          ctx.lineTo(
              trans.pivot.x + 20 * 1/int.mouse.scale * Math.cos(angle) * int.global.icon_scale,
              trans.pivot.y + 20 * 1/int.mouse.scale * Math.sin(angle) * int.global.icon_scale,
          );
          ctx.stroke();
          ctx.closePath();
          ctx.restore();

          /* Pivot UI */
          ctx.beginPath();
          ctx.fillStyle = trans.pivot.hovered ? color : off_color;
          ctx.ellipse(trans.pivot.x, trans.pivot.y, 6 * 1/int.mouse.scale * int.global.icon_scale, 6 * 1/int.mouse.scale * int.global.icon_scale, 0, 0, 2 * Math.PI);
          ctx.fill();
          ctx.closePath();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 * 1/int.mouse.scale;
          ctx.ellipse(trans.pivot.x, trans.pivot.y, 9 * 1/int.mouse.scale * int.global.icon_scale, 9 * 1/int.mouse.scale * int.global.icon_scale, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.closePath();

          /* Resize Box UI */
          ctx.save();
          for (let i = 0; i < verts.length; i++) {
              let next_index = (i + 1) % 4;
              ctx.beginPath();
              ctx.lineWidth = 1 * 1/int.mouse.scale * int.global.icon_scale;
              ctx.strokeStyle = color;
              ctx.setLineDash([6 / mouse.scale, 6 / mouse.scale]);
              ctx.moveTo(trans.scale.verts[i].x, trans.scale.verts[i].y);
              ctx.lineTo(trans.scale.verts[next_index].x, trans.scale.verts[next_index].y);
              if (disabled_sides.includes(i)) ctx.strokeStyle = 'red';
              ctx.stroke();
              ctx.closePath();
          }
          ctx.restore();

          /* Center UI */
          let center = this.attributes.transforms.scale.center;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.moveTo(center.x, center.y - 10 * 1/int.mouse.scale) * int.global.icon_scale;
          ctx.lineTo(center.x, center.y + 10 * 1/int.mouse.scale) * int.global.icon_scale;
          ctx.stroke();
          ctx.closePath();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.moveTo(center.x - 10 * 1/int.mouse.scale, center.y) * int.global.icon_scale;
          ctx.lineTo(center.x + 10 * 1/int.mouse.scale, center.y) * int.global.icon_scale;
          ctx.stroke();
          ctx.closePath();
          ctx.restore();
      }


      /* Element updating */
      update () {
          let int = module.Interactor;

          if (int.element.uuid !== this.uuid) {
              this.interface.isActive = false;
          }

          if (!this.interface.isActive) {
              // Do something here
          } else {
              Interactor.mouse.cursor = 'DEFAULT';
          }

          /* When not grabbing a node or the resize box, recalculate resize */
          if (!int.anchor.resize.grab) {
              this.calculateResize();
          }
          this.calculateCenter();
      }
      run () {
          if (!this.interface.hold_until_reclick) {
              this.update();
              this.ensurePivotVerts();
              this.hoverResize();
              this.hoverPivot();
              this.hoverRotation();
              this.grabPivot();
              this.grabRotation();
              this.grabResize();
              this.snapPivotLocal();
          }

          if (!module.Interactor.mouse.pressed) {
              this.interface.hold_until_reclick = false;
          }
      }
  }
  module.Anchor = Anchor;

  
  /* Window element (mostly just for the controller space) */
  class Window {
      constructor () {
          /* ID generation checked against other controllers */
          this.uuid = module.AlternativeCrypto.randomUUID({
              objects : module.Flats.Windows,
              key : 'uuid'
          });

          this.name = null;

          this.DOM_Window = null;
          this.DOM_Body = null;

          this.Fullscreen = {
              old : {
                  left : null,
                  top : null,
                  width : null, 
                  height : null
              }
          };
      }
      build () {
          this.DOM_Window = HTML_Build({
              type : 'div',
              classes : ['window'],
              id : 'window',
              tags : [
                  {name:'element-uuid-ref',value:this.uuid}
              ],
              style : {
                  display : 'flex',
                  flexDirection : 'column',
                  resize : 'both',
                  overflow : 'auto',
                  overflowY : 'hidden',
                  position : 'fixed',
                  minWidth : '10vw',
                  minHeight : '10vw',
                  maxWidth : '100vw',
                  maxHeight : '100vh',
                  left : '0px',
                  top : '0px',
                  background : 'black',
                  zIndex : '10000000'
              },
              children : [
                  {
                      type : 'div',
                      id : 'windowheader',
                      style : {
                          display : 'inline-flex',
                          position : 'relative',
                          width : '100%',
                          height : '1.5em',
                          background : 'var(--ui-outline)'
                      },
                      children : [
                          {
                              type : 'div',
                              id : 'windowname',
                              html : this.name || 'Unnamed Window'
                          },
                          {
                              type : 'button',
                              classes : ['material-symbols-outlined'],
                              html : 'fullscreen',
                              tags : [
                                  {name:'element-uuid-ref',value:this.uuid},
                                  {name:'button-mode',value:'fullscreen'}
                              ],
                              events : [
                                  {type:'click',callback:function(e){
                                      let uuid = e.currentTarget.getAttribute('element-uuid-ref'),
                                          mode = e.currentTarget.getAttribute('button-mode'),
                                          window = module.Flats.get.window(uuid);
                                      if (mode === 'fullscreen') {
                                          window.fullscreen();
                                          e.currentTarget.setAttribute('button-mode','exitfullscreen');
                                          e.currentTarget.innerHTML = 'fullscreen_exit';
                                      } else if (mode === 'exitfullscreen') {
                                          window.exitFullscreen();
                                          e.currentTarget.setAttribute('button-mode','fullscreen');
                                          e.currentTarget.innerHTML = 'fullscreen';
                                      }
                                  }}
                              ]
                          },
                          {
                              type : 'button',
                              classes : ['material-symbols-outlined'],
                              html : 'close',
                              tags : [
                                  {name:'element-uuid-ref',value:this.uuid}
                              ],
                              events : [
                                  {type:'click',callback:function(e){
                                      let uuid = e.currentTarget.getAttribute('element-uuid-ref'),
                                          window = module.Flats.get.window(uuid);
                                      window.close();
                                  }}
                              ]
                          }
                      ]
                  },
                  {
                      type : 'div',
                      id : 'windowbody',
                      style : {
                          display : 'block',
                          overflowY : 'hidden',
                          position : 'absolute',
                          top : '1.5em',
                          width : '100%',
                          height : '100%',
                          background : 'black'
                      },
                      html : '5'
                  }
              ]
          });
          this.DOM_Body = this.DOM_Window.querySelector('#windowbody');
          dragElement(this.DOM_Window);

          document.querySelector('body').appendChild(this.DOM_Window);
      }
      close () {
          this.DOM_Window.remove();
          module.Flats.Windows.splice(module.Flats.Windows.map(window => window.uuid).indexOf(this.uuid), 1);
      }
      width () {
          const elDim = this.DOM_Body.getBoundingClientRect();
          return elDim.width;
      }
      height () {
          const elDim = this.DOM_Body.getBoundingClientRect();
          return elDim.height;
      }
      fullscreen () {
          const bound = this.DOM_Window.getBoundingClientRect();
          this.Fullscreen.old = {
              left : bound.left,
              top : bound.top,
              width : bound.width,
              height : bound.height
          };
          this.DOM_Window.style.left = '0px';
          this.DOM_Window.style.top = '0px';
          this.DOM_Window.style.width = screen.availWidth + 'px';
          this.DOM_Window.style.height = screen.availHeight + 'px';
      }
      exitFullscreen () {
          this.DOM_Window.style.left = this.Fullscreen.old.left + 'px';
          this.DOM_Window.style.top = this.Fullscreen.old.top + 'px';
          this.DOM_Window.style.width = this.Fullscreen.old.width + 'px';
          this.DOM_Window.style.height = this.Fullscreen.old.height + 'px';
      }
  }
  module.Window = Window;
  
  
  class ControllerDropdown {
      constructor (name, uuid) {
          this.uuid = uuid;

          this.DOM_Element = null;
          this.body = null;

          this.name = name;

          this.isLoaded = false;

          this.default_fields = {
              'UUID' : {
                  'type' : 'text'
              },
              'Elements' : {
                  'type' : 'elements',
                  'element_identifier' : 'handle-elements',
                  'loops' : [
                      {interval:500,callback:function(d){
                          const elements = d.DOM_Element.querySelector('.elements-field');
                          const uuid = elements.getAttribute('element-uuid-ref'),
                                controller = Flats.get.controller(uuid),
                                dropdown = controller.attributes.dropdown;

                          if (!dropdown?.isLoaded) {
                              dropdown.isLoaded = true;
                              elements.innerHTML = '';
                              controller.elements.forEach((uuid) => {
                                  let elementField = HTML_Build({
                                      type : 'div',
                                      classes : ['element'],
                                      tags : [
                                          {name:'element-uuid-ref',value:uuid},
                                      ],
                                      events : [],
                                      children : [
                                          {
                                              type : 'text',
                                              classes : ['element-uuid'],
                                              html : uuid
                                          },
                                          {
                                              type : 'button',
                                              classes : ['material-symbols-outlined','element-delete'],
                                              tags : [
                                                  {name:'uuid',value:uuid},
                                                  {name:'element-uuid-ref',value:controller.uuid},
                                              ],
                                              html : 'delete',
                                              events : [
                                                  {type:'click',callback:function(e){
                                                      let uuid = e.currentTarget.getAttribute('element-uuid-ref'),
                                                          element_uuid = e.currentTarget.getAttribute('uuid'),
                                                          controller = Flats.get.controller(uuid);
                                                      controller.removeElement(element_uuid);
                                                  }}
                                              ]
                                          }
                                      ]
                                  });
                      
                                  elements.appendChild(elementField);
                              });
                              
                              const addnew = HTML_Build({
                                  type : 'button',
                                  classes : ['material-symbols-outlined'],
                                  tags : [
                                      {name:'element-uuid-ref',value:controller.uuid}
                                  ],
                                  id : 'addnew',
                                  html : 'add',
                                  events : [
                                      {type:'click',callback:function(e){
                                          let uuid = e.currentTarget.getAttribute('element-uuid-ref'),
                                              controller = Flats.get.controller(uuid);
                                          UI.selectPanelPage('Elements');
                                          Interactor.controller.uuid = uuid;
                                          Interactor.controller.adding.isActive = true;
                                          Interactor.controller.adding.currentElements = controller.elements || [];
                                      }}
                                  ]
                              });
                              elements.appendChild(addnew);
                          }
                      }}
                  ]

              }
          };
          this.fields = module.mergeObjects({}, this.default_fields);
      }
      load () {
          this.Anchors = Flats.get.anchor(this.uuid);
          const NUM_OF_DROPDOWNS = document.querySelector('.panel-page[page=\'Controllers\']').querySelectorAll('.panel-dropdown').length;

          const dropdown = HTML_Build({
              type : 'div',
              classes : ['panel-dropdown','drag-item'],
              tags : [{name:'opened',value:'false'}],
              children : [
                  {
                      type : 'div',
                      classes : ['panel-dropdown-label'],
                      tags : [
                          {name:'draggable',value:true}
                      ],
                      children : [
                          {
                              type : 'div',
                              classes : ['material-symbols-outlined', 'dropdown-drag'],
                              html : 'drag_indicator',
                              events : []
                          },
                          {
                              type : 'div',
                              classes : ['material-symbols-outlined', 'dropdown-indicator'],
                              html : 'keyboard_arrow_right'
                          },
                          {
                              type : 'div',
                              classes : ['panel-dropdown-name'],
                              editable : true,
                              html : `${this.name} ${NUM_OF_DROPDOWNS + 1}`
                          }
                      ]
                  },
                  {
                      type : 'div',
                      classes : ['panel-dropdown-body']
                  }
              ]
          });

          const anchors_panel = document.querySelector('.panel-page[page=\'Controllers\']');
          anchors_panel.appendChild(dropdown);
          
          this.body = dropdown.querySelector('.panel-dropdown-body');
          this.DOM_Element = dropdown;
      }
      loadField (name, field) {
          const $c = t => document.createElement(t);

          const field_el = HTML_Build({
              type : 'div',
              classes : ['panel-dropdown-field'],
              tags : [],
              children : [
                  {
                      type : 'label',
                      tags : [{name:'for',value:'uuid'}],
                      html : `${name}: `,
                  }
              ]
          });
          let side = null;

          switch (field.type) {
              case 'text':
                  let text = HTML_Build({
                      type : 'div',
                      classes : ['element-uuid'],
                      tags : [{name:'element-uuid-ref',value:this.uuid}],
                      html : this.uuid
                  });
                  field_el.appendChild(text);
                  side = text;
              break;
              case 'input':
                  let input = HTML_Build({
                      type : 'input',
                      classes : [field.element_identifier || ''],
                      tags : [
                          {name:'type',value:(field.input_type || 'number')},
                          {name:'step',value:'0.01'},
                          {name:'element-uuid-ref',value:this.uuid},
                          ...(field.tags || [])
                      ],
                      events : field.events || []
                  });
                  field_el.appendChild(input);
                  if (field.append !== undefined) {
                      field.append?.forEach(el => {
                          field_el.appendChild(HTML_Build(el));
                      });
                  }
                  side = input;
              break;
              case "elements":
                  let elements = HTML_Build({
                      type : 'div',
                      classes : ['elements-field', field.element_identifier || ''],
                      tags : [
                          {name:'element-uuid-ref',value:this.uuid}
                      ],
                      children : [
                          {
                              type : 'button',
                              classes : ['material-symbols-outlined'],
                              tags : [
                                  {name:'element-uuid-ref',value:this.uuid}
                              ],
                              id : 'addnew',
                              html : 'add',
                              events : [
                                  {type:'click',callback:function(e){
                                      let uuid = e.currentTarget.getAttribute('element-uuid-ref'),
                                          controller = module.Flats.get.controller(uuid);
                                      UI.selectPanelPage('Elements');
                                      Interactor.controller.uuid = uuid;
                                      Interactor.controller.adding.isActive = true;
                                      Interactor.controller.adding.currentElements = controller.elements || [];
                                  }}
                              ]
                          }
                      ]
                  });
                  field_el.appendChild(elements);
              break;
          }

          const that = this;
          (field.loops || []).forEach(loop => {
              setInterval(
                  loop.callback, 
                  loop.interval || 1, 
                  {uuid : that.uuid, DOM_Element:field_el}
              );
          });

          this.body.appendChild(field_el);
      }
      loadFields () {
          const that = this;
          Object.keys(this.fields).forEach(name => {
              const field = that.fields[name];
              that.loadField(name, field);
          });
      }
  }
  module.ControllerDropdown = ControllerDropdown;

  /* Controller object */
  class Controller {
      constructor () {
          /* ID generation checked against other controllers */
          this.uuid = module.AlternativeCrypto.randomUUID({
              objects : module.Flats.Controllers,
              key : 'uuid'
          });

          this.attributes = {
              name : `Unnamed Controller`,
              dropdown : null
          };

          this.elements = [];
          this.fields = {};

          this.control_space = {
              blocks : {},
              avail_inputs : [],
              avail_outputs : []
          };
      }
      addDropdown () {
          this.attributes.dropdown = new module.ControllerDropdown(
              this.attributes.name,
              this.uuid
          );
          this.attributes.dropdown.load();
          this.attributes.dropdown.loadFields();
      }
      removeElement (uuid) {
          for (let i = 0; i < this.elements.length; i++) {
              if (this.elements[i] === uuid) {
                  this.elements.splice(i, 1);
                  this.attributes.dropdown.isLoaded = false;
                  return;
              }
          }
      }
      addElement (uuid) {
          if (!this.elements.includes(uuid)) {
              this.elements.push(uuid);
              this.attributes.dropdown.isLoaded = false;
          }
      }

      copyField (field) {
          
      }
  }
  module.Controller = Controller;


  class ControllerWindow extends module.Window {
      constructor () {
          
      }
  }
  module.ControllerWindow = ControllerWindow;



  class ElementDropdown {
      constructor (name, uuid, fields) {
          this.uuid = uuid;

          this.DOM_Element = null;
          this.Element = null;
          this.body = null

          this.name = name;

          this.isLoaded = false;

          this.default_fields = {
              'UUID' : {
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
              'Pivot-Rotation' : {
                  'type' : 'input',
                  'element_identifier' : 'element-pivot-rotation',
                  'append' : [
                      {
                          type : 'input',
                          tags : [
                              {name:'type',value:'checkbox'},
                              {name:'title',value:'Use Degrees'}
                          ]
                      }
                  ],
                  'events' : [
                      {type:'input',callback:function (e) {
                          const target = e.currentTarget,
                                  uuid = target.getAttribute('element-uuid-ref'),
                                  element = Flats.get.element(uuid),
                                  degrees = target.nextElementSibling.checked;
                          element.calculateResize();
                          element.calculateCenter();
                          element.moveRotation(parseFloat(target.value || '0') * (!degrees ? (180 / Math.PI) : 1));
                      }}
                  ],
                  'loops' : [
                      {interval:1,callback:function (d) {
                          const inputElement = d.DOM_Element.querySelector('.element-pivot-rotation'),
                                degrees = inputElement.nextElementSibling.checked;
                          if (document.activeElement !== inputElement) {
                              const element = Flats.get.element(d.uuid);
                              inputElement.value = Math.floor(
                                  element.attributes.transforms.rotation.radians * (degrees ? (180 / Math.PI) : 1)
                                   * 1000
                              ) / 1000;
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
              },
              'Use-xy-Basis' : {
                  'type' : 'input',
                  'input_type' : 'checkbox',
                  'element_identifier' : 'element-usexybasis',
                  'tags' : [
                  ],
                  'events' : [
                      {type:'input',callback:function (e){
                          const target = e.currentTarget,
                                  uuid = target.getAttribute('element-uuid-ref'),
                                  element = Flats.get.element(uuid);
                          element.interface.resize_calculation.rel = !target.checked;
                      }}
                  ]
              },
              'Nodes' : {
                  'type' : 'nodes',
                  'input_type' : null,
                  'element_identifier' : 'element-nodes',
                  'events' : [],
                  'loops' : [
                      {interval:500,callback:function (d) {
                          const nodesElement = d.DOM_Element.querySelector('.nodes-field');
                          const uuid = nodesElement.getAttribute('element-uuid-ref'),
                                element = Flats.get.element(uuid),
                                dropdown = element.attributes.dropdown;

                          if (!dropdown?.isLoaded && Interactor.draggedItem.element === null) {
                              element.attributes.dropdown.isLoaded = true;
                              nodesElement.innerHTML = '';
                              if (Interactor.draggedItem.target === 'nodes') {
                                  Interactor.draggedItem.target = '';
                                  let copyNodes = [];
                                  Interactor.draggedItem.order.forEach(uuid => {
                                      copyNodes.push(element.getNode(uuid));
                                  });
                                  element.nodes = copyNodes;
                              }
                              element.nodes.forEach((node, i) => {
                                  node.force_hover = undefined;
                                  let nodeField = HTML_Build({
                                      type : 'div',
                                      classes : [`uuid-${node.uuid}`,'node','drag-item'],
                                      tags : [
                                          {name:'node-uuid-ref',value:node.uuid},
                                          {name:'node-index',value:i},
                                          {name:'element-uuid-ref',value:uuid},
                                          {name:'draggable',value:true}
                                      ],
                                      events : [
                                          {
                                              type:'mouseover',callback:function(e){
                                                  const target = e.currentTarget,
                                                      element_uuid = target.getAttribute('element-uuid-ref'),
                                                      node_uuid = target.getAttribute('node-uuid-ref'),
                                                      element = Flats.get.element(element_uuid),
                                                      node = element.getNode(node_uuid);
                                                  node.force_hover = true;
                                              }
                                          },
                                          {
                                              type:'mouseout',callback:function(e){
                                                  const target = e.currentTarget,
                                                      element_uuid = target.getAttribute('element-uuid-ref'),
                                                      node_uuid = target.getAttribute('node-uuid-ref'),
                                                      element = Flats.get.element(element_uuid),
                                                      node = element.getNode(node_uuid);
                                                  node.force_hover = undefined;
                                              }
                                          }
                                      ],
                                      children : [
                                          {
                                              type : 'div',
                                              classes : ['material-symbols-outlined'],
                                              html : 'drag_indicator',
                                              events : []
                                          },
                                          {
                                              type : 'label',
                                              html : 'x: '
                                          },
                                          {
                                              type : 'input',
                                              classes : ['node-x','node-input'],
                                              tags : [
                                                  {name:'type',value:'number'},
                                                  {name:'element-uuid-ref'}
                                              ],
                                              defaultValue : node.x,
                                              events : [
                                                  {type:'input',callback:function(e){
                                                      const target = e.currentTarget,
                                                            parent = target.parentElement,
                                                            element_uuid = parent.getAttribute('element-uuid-ref'),
                                                            node_uuid = parent.getAttribute('node-uuid-ref'),
                                                            element = Flats.get.element(element_uuid),
                                                            node = element.getNode(node_uuid);
                                                      node.x = parseFloat(target.value || '0') || 0;
                                                  }}
                                              ]
                                          },
                                          {
                                              type : 'label',
                                              html : 'y: '
                                          },
                                          {
                                              type : 'input',
                                              classes : ['node-y','node-input'],
                                              tags : [{name:'type',value:'number'}],
                                              defaultValue : node.y
                                          },
                                          {
                                              type : 'button',
                                              classes : ['node-button','material-symbols-outlined'],
                                              tags : [{name:'onclick',value:'console.log(\'whatever\')'}],
                                              html : 'add'
                                          },
                                          {
                                              type : 'button',
                                              classes : ['node-button','material-symbols-outlined'],
                                              tags : [{name:'onclick',value:'console.log(\'whatever\')'}],
                                              html : 'delete'
                                          }
                                      ]
                                  });
                      
                                  nodesElement.appendChild(nodeField);
                              });
                          }
                      }}
                  ]
              }
          };
          this.fields = module.mergeObjects(fields, this.default_fields);

          this.loop = setInterval(function (e) {
              
          }, 1, {ctx : this});
      }
      load () {
          this.Element = Flats.get.element(this.uuid);
          const NUM_OF_DROPDOWNS = document.querySelector('.panel-page[page=\'Elements\']').querySelectorAll('.panel-dropdown').length;

          const dropdown = HTML_Build({
              type : 'div',
              classes : ['panel-dropdown','drag-item'],
              tags : [{name:'opened',value:'false'}],
              children : [
                  {
                      type : 'div',
                      classes : ['panel-dropdown-label'],
                      tags : [
                          {name:'draggable',value:true}
                      ],
                      children : [
                          {
                              type : 'div',
                              classes : ['material-symbols-outlined', 'dropdown-drag'],
                              tags : [{name:'element-uuid-ref',value:this.uuid},{name:'block-dropdown',value:true}],
                              html : 'drag_indicator',
                              events : [
                                  {type:'click',callback:function(e){
                                      if (Interactor.controller.adding.isActive) {
                                          let uuid = e.currentTarget.getAttribute('element-uuid-ref'),
                                              controller = Flats.get.controller(Interactor.controller.uuid);
                                          controller.addElement(uuid);
                                          console.log(controller.elements);
                                      }
                                  }}
                              ]
                          },
                          {
                              type : 'div',
                              classes : ['material-symbols-outlined', 'dropdown-indicator'],
                              html : 'keyboard_arrow_right'
                          },
                          {
                              type : 'div',
                              classes : ['panel-dropdown-name'],
                              editable : true,
                              html : `${this.name} ${NUM_OF_DROPDOWNS + 1}`
                          }
                      ]
                  },
                  {
                      type : 'div',
                      classes : ['panel-dropdown-body']
                  }
              ]
          });
          setInterval(function (d) {
              if (Interactor.controller.adding.isActive) {
                  d.dropdown.querySelector('.dropdown-drag').innerHTML = 'add';
              } else {
                  d.dropdown.querySelector('.dropdown-drag').innerHTML = 'drag_indicator';
              }
          }, 0, {dropdown});

          const elements_panel = document.querySelector('.panel-page[page=\'Elements\']');
          elements_panel.appendChild(dropdown);
          
          this.body = dropdown.querySelector('.panel-dropdown-body');
          this.DOM_Element = dropdown;
      }
      loadField (name, field) {
          const $c = t => document.createElement(t);

          const field_el = HTML_Build({
              type : 'div',
              classes : ['panel-dropdown-field'],
              tags : [
                  /*{name:'draggable',value:true}*/
              ],
              children : [
                  {
                      type : 'label',
                      tags : [{name:'for',value:'uuid'}],
                      html : `${name}: `,
                  }
              ]
          });
          let side = null;

          switch (field.type) {
              case 'text':
                  let text = HTML_Build({
                      type : 'div',
                      classes : ['element-uuid'],
                      tags : [{name:'element-uuid-ref',value:this.uuid}],
                      html : this.uuid
                  });
                  field_el.appendChild(text);
                  side = text;
              break;
              case 'input':
                  let input = HTML_Build({
                      type : 'input',
                      classes : [field.element_identifier || ''],
                      tags : [
                          {name:'type',value:(field.input_type || 'number')},
                          {name:'step',value:'0.01'},
                          {name:'element-uuid-ref',value:this.uuid},
                          ...(field.tags || [])
                      ],
                      events : field.events || []
                  });
                  field_el.appendChild(input);
                  if (field.append !== undefined) {
                      field.append?.forEach(el => {
                          field_el.appendChild(HTML_Build(el));
                      });
                  }
                  side = input;
              break;
              case 'nodes':
                  let ob = {
                      type : 'div',
                      classes : ['nodes-field', 'drag-list', field.element_identifier || ''],
                      tags : [
                          {name:'element-uuid-ref',value:this.uuid}
                      ],
                      children : []
                  };
                  
                  let nodes = HTML_Build(ob);
                  field_el.appendChild(nodes);
                  
                  let container = nodes;
                  if (container.getAttribute('added-dragging') !== 'true') {
                      container.setAttribute('added-dragging','true');

                      container.addEventListener('dragstart', (e) => {
                          if (e.target.classList.contains('drag-item')) {
                              Interactor.draggedItem.element = e.target;
                              Interactor.draggedItem.target = 'nodes';
                              e.target.classList.add('dragging');
                          }
                      });

                      container.addEventListener('dragend', (e) => {
                          if (e.target.classList.contains('drag-item')) {
                              e.target.classList.remove('dragging');
                              let innerNodes = container.querySelectorAll('.node');
                              Interactor.draggedItem.order = [];
                              for (let i = 0; i < innerNodes.length; i++) {
                                  let innerNode = innerNodes[i];
                                  Interactor.draggedItem.order.push(innerNode.getAttribute('node-uuid-ref'));
                              }
                              const element = module.Flats.get.element(e.currentTarget.getAttribute('element-uuid-ref'));
                              element.attributes.dropdown.isLoaded = false;
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
              break;
          }

          const that = this;
          (field.loops || []).forEach(loop => {
              setInterval(
                  loop.callback, 
                  loop.interval || 1, 
                  {uuid : that.uuid, DOM_Element:field_el}
              );
          });

          this.body.appendChild(field_el);
      }
      loadFields () {
          const that = this;
          Object.keys(this.fields).forEach(name => {
              const field = that.fields[name];
              that.loadField(name, field);
          });
      }
  }
  module.ElementDropdown = ElementDropdown;

  
  class AnchorDropdown {
      constructor (name, uuid, fields) {
          this.uuid = uuid;
          this.DOM_Element = null;
          this.Element = null;
          this.body = null
          this.name = name;

          this.isLoaded = false;

          this.default_fields = {
              'UUID' : {
                  'type' : 'text'
              },
              'Pivot-X' : {
                  'type' : 'input',
                  'element_identifier' : 'anchor-pivot-x',
                  'events' : [
                      {type:'input',callback:function (e) {
                          const target = e.currentTarget,
                                  uuid = target.getAttribute('element-uuid-ref'),
                                  anchor = Flats.get.anchor(uuid);
                          anchor.calculateResize();
                          anchor.calculateCenter();
                          anchor.movePivot(parseFloat(target.value || '0'), null);
                      }}
                  ],
                  'loops' : [
                      {interval:1,callback:function (d) {
                          const inputElement = d.DOM_Element.querySelector('.anchor-pivot-x');
                          if (document.activeElement !== inputElement) {
                              const anchor = Flats.get.anchor(d.uuid);
                              inputElement.value = Math.floor(anchor.attributes.transforms.pivot.x * 1000) / 1000;
                          }
                      }}
                  ]
              },
              'Pivot-Y' : {
                  'type' : 'input',
                  'element_identifier' : 'anchor-pivot-y',
                  'events' : [
                      {type:'input',callback:function (e) {
                          const target = e.currentTarget,
                                  uuid = target.getAttribute('element-uuid-ref'),
                                  anchor = Flats.get.anchor(uuid);
                          anchor.calculateResize();
                          anchor.calculateCenter();
                          anchor.movePivot(null, parseFloat(target.value || '0'));
                      }}
                  ],
                  'loops' : [
                      {interval:1,callback:function (d) {
                          const inputElement = d.DOM_Element.querySelector('.anchor-pivot-y');
                          if (document.activeElement !== inputElement) {
                              const anchor = Flats.get.anchor(d.uuid);
                              inputElement.value = Math.floor(anchor.attributes.transforms.pivot.y * 1000) / 1000;
                          }
                      }}
                  ]
              },
              'Pivot-Rotation' : {
                  'type' : 'input',
                  'element_identifier' : 'anchor-pivot-rotation',
                  'append' : [
                      {
                          type : 'input',
                          tags : [
                              {name:'type',value:'checkbox'},
                              {name:'title',value:'Use Degrees'}
                          ]
                      }
                  ],
                  'events' : [
                      {type:'input',callback:function (e) {
                          const target = e.currentTarget,
                                  uuid = target.getAttribute('element-uuid-ref'),
                                  anchor = Flats.get.anchor(uuid),
                                  degrees = target.nextElementSibling.checked;
                          anchor.calculateResize();
                          anchor.calculateCenter();
                          anchor.moveRotation(parseFloat(target.value || '0') * (!degrees ? (180 / Math.PI) : 1));
                      }}
                  ],
                  'loops' : [
                      {interval:1,callback:function (d) {
                          const inputElement = d.DOM_Element.querySelector('.anchor-pivot-rotation'),
                                degrees = inputElement.nextElementSibling.checked;
                          if (document.activeElement !== inputElement) {
                              const anchor = Flats.get.anchor(d.uuid);
                              inputElement.value = Math.floor(
                                  anchor.attributes.transforms.rotation.radians * (degrees ? (180 / Math.PI) : 1)
                                   * 1000
                              ) / 1000;
                          }
                      }}
                  ]
              },
              'Width' : {
                  'type' : 'input',
                  'element_identifier' : 'anchor-width',
                  'events' : [
                      {type:'input',callback:function (e) {
                          const target = e.currentTarget,
                                  uuid = target.getAttribute('element-uuid-ref'),
                                  anchor = Flats.get.anchor(uuid);
                          anchor.calculateResize();
                          anchor.calculateCenter();
                          if (Math.abs(target.value) > 0.0001) {
                              anchor.moveResize(target.value, null);
                          }
                      }}
                  ],
                  'loops' : [
                      {interval:1,callback:function (d) {
                          const inputElement = d.DOM_Element.querySelector('.anchor-width');
                          if (document.activeElement !== inputElement) {
                              const anchor = Flats.get.anchor(d.uuid);
                              inputElement.value = Math.floor(anchor.attributes.transforms.scale.width * 1000) / 1000;
                          }
                      }}
                  ]
              },
              'Height' : {
                  'type' : 'input',
                  'element_identifier' : 'anchor-height',
                  'events' : [
                      {type:'input',callback:function (e) {
                          const target = e.currentTarget,
                                  uuid = target.getAttribute('element-uuid-ref'),
                                  anchor = Flats.get.anchor(uuid);
                          anchor.calculateResize();
                          anchor.calculateCenter();
                          if (Math.abs(target.value) > 0.0001) {
                              anchor.moveResize(null, target.value);
                          }
                      }}
                  ],
                  'loops' : [
                      {interval:1,callback:function (d) {
                          const inputElement = d.DOM_Element.querySelector('.anchor-height');
                          if (document.activeElement !== inputElement) {
                              const anchor = Flats.get.anchor(d.uuid);
                              inputElement.value = Math.floor(anchor.attributes.transforms.scale.height * 1000) / 1000;
                          }
                      }}
                  ]
              },
          };
          this.fields = module.mergeObjects(fields, this.default_fields);

          this.loop = setInterval(function (e) {
              
          }, 1, {ctx : this});
      }
      load () {
          this.Anchors = Flats.get.anchor(this.uuid);
          const NUM_OF_DROPDOWNS = document.querySelector('.panel-page[page=\'Anchors\']').querySelectorAll('.panel-dropdown').length;

          const dropdown = HTML_Build({
              type : 'div',
              classes : ['panel-dropdown','drag-item'],
              tags : [{name:'opened',value:'false'}],
              children : [
                  {
                      type : 'div',
                      classes : ['panel-dropdown-label'],
                      tags : [
                          {name:'draggable',value:true}
                      ],
                      children : [
                          {
                              type : 'div',
                              classes : ['material-symbols-outlined', 'dropdown-drag'],
                              html : 'drag_indicator',
                              events : []
                          },
                          {
                              type : 'div',
                              classes : ['material-symbols-outlined', 'dropdown-indicator'],
                              html : 'keyboard_arrow_right'
                          },
                          {
                              type : 'div',
                              classes : ['panel-dropdown-name'],
                              editable : true,
                              html : `${this.name} ${NUM_OF_DROPDOWNS + 1}`
                          }
                      ]
                  },
                  {
                      type : 'div',
                      classes : ['panel-dropdown-body']
                  }
              ]
          });

          const anchors_panel = document.querySelector('.panel-page[page=\'Anchors\']');
          anchors_panel.appendChild(dropdown);
          
          this.body = dropdown.querySelector('.panel-dropdown-body');
          this.DOM_Element = dropdown;
      }
      loadField (name, field) {
          const $c = t => document.createElement(t);

          const field_el = HTML_Build({
              type : 'div',
              classes : ['panel-dropdown-field'],
              tags : [
                  /*{name:'draggable',value:true}*/
              ],
              children : [
                  {
                      type : 'label',
                      tags : [{name:'for',value:'uuid'}],
                      html : `${name}: `,
                  }
              ]
          });
          let side = null;

          switch (field.type) {
              case 'text':
                  let text = HTML_Build({
                      type : 'div',
                      classes : ['element-uuid'],
                      tags : [{name:'element-uuid-ref',value:this.uuid}],
                      html : this.uuid
                  });
                  field_el.appendChild(text);
                  side = text;
              break;
              case 'input':
                  let input = HTML_Build({
                      type : 'input',
                      classes : [field.element_identifier || ''],
                      tags : [
                          {name:'type',value:(field.input_type || 'number')},
                          {name:'step',value:'0.01'},
                          {name:'element-uuid-ref',value:this.uuid},
                          ...(field.tags || [])
                      ],
                      events : field.events || []
                  });
                  field_el.appendChild(input);
                  if (field.append !== undefined) {
                      field.append?.forEach(el => {
                          field_el.appendChild(HTML_Build(el));
                      });
                  }
                  side = input;
              break;
          }

          const that = this;
          (field.loops || []).forEach(loop => {
              setInterval(
                  loop.callback, 
                  loop.interval || 1, 
                  {uuid : that.uuid, DOM_Element:field_el}
              );
          });

          this.body.appendChild(field_el);
      }
      loadFields () {
          const that = this;
          Object.keys(this.fields).forEach(name => {
              const field = that.fields[name];
              that.loadField(name, field);
          });
      }
  }
  module.AnchorDropdown = AnchorDropdown;


  /* Phew, that was a lot... */
})(this);
