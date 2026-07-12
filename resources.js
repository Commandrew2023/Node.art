(function (module) {

  /* Rewrite of the crypto function cuz I was working on this project using localhost */
  class AlternativeCrypto {
      constructor (options) {
          this.FALLBACK_LENGTH = 32;
          this.MAX_LENGTH = ~~(options.max_length ?? this.FALLBACK_LENGTH);
          this.MIN_LENGTH = ~~(options.min_length ?? this.FALLBACK_LENGTH);
          this.LENGTH = ~~(options.length ?? this.FALLBACK_LENGTH);
          
          /* Ensure LENGTH is between min/max values */
          this.LENGTH = Math.max(this.MIN_LENGTH, Math.min(this.MAX_LENGTH, this.LENGTH));
      }
      static randomUUID (check = { objects : [], key : 'uuid' }) {
          while (true) {
              /* Cryptographically Secure UUID */
              /* - Credit to @broofa on stackoverflow.com {post converted to community wiki} */
              let id = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
                  (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
              );
              if (!check) return id;

              /* Iterate checkable items */
              if (!!check?.objects && !!check?.key) {
                  let copyFound = false;
                  check.objects.forEach(item => {
                      if (item?.[check.key] === id) copyFound = true;
                  });
                  if (!copyFound) {
                      return id;
                  }
              } else {
                  throw new TypeError("Parameter 'check' requires 'object' and 'key' fields.");
              }
          }
      }
      create () {
          /* Cryptographically Not Secure ID */
          return (new Int8Array(options.LENGTH).fill(1).map(_ => String.fromCharCode(~~(Math.random() * 26) + 65))).join('');
      }
  }
  module.AlternativeCrypto = AlternativeCrypto;

  
  // Taken from W3Schools @ https://www.w3schools.com/howto/howto_js_draggable.asp
  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    if (elmnt.querySelector(`#${elmnt.id}header`)) {
      // if present, the header is where you move the DIV from:
      elmnt.querySelector(`#${elmnt.id}header`).onmousedown = dragMouseDown;
    }/* else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onmousedown = dragMouseDown;
    }*/
  
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }
  
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
  
    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  module.dragElement = dragElement;

  /* Simplified way to create HTML elements */
  function HTML_Build (struct) {
      const el = document.createElement(struct.type || 'div'),
            that = this;
      (struct.classes || []).forEach(c => {
          el.classList.add(c);
      });
      (struct.tags || []).forEach(t => {
          el.setAttribute(t.name, t.value);
      });
      (struct.events || []).forEach(event => {
          el.addEventListener(event.type, event.callback);
      });
      if (!!struct.id) {
          //el.setAttribute('id', struct.id);
          el.id = struct.id;
      }
      if (!!struct.html) {
          el.innerHTML += struct.html;
      }
      el.setAttribute('contenteditable', (struct.editable || false).toString());

      switch (struct.type) {
          case 'input':
              el.setAttribute('placeholder', struct.placeholder || '');
              el.setAttribute('value', struct.defaultValue || '');
          break;
      }

      if (struct.children?.length > 0) {
          (struct.children || []).forEach(child => {
              const child_El = module.HTML_Build(child);
              el.appendChild(child_El);
          });
      }
      if (struct.style !== undefined) {
          (Object.keys(struct.style) || []).forEach(style => {
              el.style[style] = struct.style[style];
          });
      }

      if (struct.extra !== undefined) {
          struct.extra();
      }

      return el;
  };
  module.HTML_Build = HTML_Build;

  /* Performs a deep-object merge (doubles as deep object copy) */
  function mergeObjects (target, object) {
      Object.keys(target).forEach(key => {
          if (typeof target[key] === "object" && typeof object[key] === "object") {
              module.mergeObjects(target[key], object[key]);
          } else {
              object[key] = target[key];
          }
      });
      return object;
  }
  module.mergeObjects = mergeObjects;

  /* A very lousy vector library that I wrote in a hurry XD */
  class Vector {
      constructor (x, y) {
          this.x = x;
          this.y = y;
      }
      static create () {
          // For Later
      }
      static dist (p1, p2) {
          return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      }
      static basisFromAngle (angle) {
          return new Vector(Math.cos(angle), Math.sin(angle));
      }

      /* Math Methods */
      add (Vec) {
          this.x += Vec.x;
          this.y += Vec.y;
      }
      mult (scalar) {
          this.x *= scalar;
          this.y *= scalar;
      }

      /* Modifying Methods */
      mag () {
          return Vector.dist({x : 0, y : 0}, this);
      }
      dot (Vec) {
          return this.x * Vec.x + this.y * Vec.y;
      }
      project (Vec) {
          let Target = new Vector(this.x, this.y);
          Target.mult( Target.dot(Vec) / Math.pow(Target.mag(), 2) );
          return Target;
      }
      basis () {
          let m = this.mag();
          return new Vector(this.x / m, this.y / m);
      }
      equals (Vec, acc=10000) {
          return Math.floor(Vec.x * acc) === Math.floor(this.x * acc) && Math.floor(Vec.y * acc) === Math.floor(this.y * acc);
      }
      copy () {
          let newVec = new Vector(this.x, this.y);
          return newVec;
      }
      inv () {
          let newVec = new Vector(-this.x, -this.y);
          return newVec;
      }
  }
  module.Vector = Vector;
  
})(this);
