//Sticky - element being sticked at runtime
function Popupper(){
	this.create.apply(this, arguments);
}

//list of instances
Sticky.list = [];
//mutually exclusive items
Sticky.noStack = [];
//stacks of items
Sticky.stack = {};

Sticky.prototype = {
	options: {
		/** @expose */
		"offset": 0,
		/** @expose */
		"restrictWithin": null, //element or bounding box
		/** @expose */
		"vAlign": 'top',
		/** @expose */
		"stickyClass": "is-stuck",
		/** @expose */
		"stubClass": "sticky-stub",
		/** @expose */
		"stack": null,
		/** @expose */
		"collapse": true
	},

	create: function(el, options){
		if (el.getAttribute("data-sticky-id") === undefined) {
			return console.log("Sticky already exist");
		}

		this.el = el;
		this.parent = this.el.parentNode;

		//recognize attributes
		var dataset = el.dataset;
		if (!dataset){
			dataset = {};
			if (el.getAttribute("data-restrict-within")) dataset["restrictWithin"] = el.getAttribute("data-restrict-within");
			if (el.getAttribute("data-offset")) dataset["offset"] = el.getAttribute("data-offset");
			if (el.getAttribute("data-stack")) dataset["stack"] = el.getAttribute("data-stack");
			if (el.getAttribute("data-sticky-class")) dataset["stickyClass"] = el.getAttribute("data-sticky-class");
		}
		this.options = extend({}, this.options, dataset, options);

		//query selector
		if ( typeof this.options["restrictWithin"] === "string" && this.options["restrictWithin"].trim() ){
			this.restrictWithin = document.body.querySelector(this.options["restrictWithin"]);			
		} else {
			this.restrictWithin = this.options["restrictWithin"];
		}
		
		//keep list
		this.el.setAttribute("data-sticky-id", Sticky.list.length);
		this.id = Sticky.list.length;
		Sticky.list.push(this);

		//init vars
		this.isFixed = false;
		this.isBottom = false;
		this.isTop = true;
		this.restrictBox = {
			top: 0,
			bottom: 9999
		};
		//self position & size
		this.height = 0;
		this.isDisabled = false;
		//parent position & size
		this.parentBox = {
			top: 0,
			height: 0
		}
		//mind gap from bottom & top in addition to restrictBox (for stacks)
		this.options.offset = parseFloat(this.options["offset"]) || 0;
		this.offset = {
			top: 0,
			bottom: 0
		}

		//Detect whether stacking needed
		var prevEl = this.el;
		this.stackId = [];
		this.stack = [];
		if (this.options["stack"]) {
			var stack = this.options["stack"].split(",");
			for (var i = stack.length; i--;){
				stack[i] = stack[i].trim();
				if (!Sticky.stack[stack[i]]) Sticky.stack[stack[i]] = [];
				this.stackId[i] = Sticky.stack[stack[i]].length;
				this.stack.push(stack[i]);
				Sticky.stack[stack[i]].push(this)
			}
		} else {
			this.stackId[0] = Sticky.noStack.length;
			Sticky.noStack.push(this);
		}


		//stub is a spacer filling space when element is stuck
		this.stub = this.el.cloneNode();
		this.stub.classList.add(this.options["stubClass"]);
		this.stub.style.visibility = "hidden";
		this.stub.style.display = "none";
		this.stub.removeAttribute("hidden");

		//save initial inline style
		this.initialStyle = this.el.style.cssText;
		this.initialDisplay = getComputedStyle(this.el)["display"];

		//ensure parent's container relative coordinates
		var pStyle = getComputedStyle(this.parent);
		if (pStyle.position == "static") this.parent.style.position = "relative";

		//bind methods
		this.check = this.check.bind(this);
		this.recalc = this.recalc.bind(this);
		this.disable = this.disable.bind(this);
		this.enable = this.enable.bind(this);
		this.bindEvents = this.bindEvents.bind(this);
		this.adjustSizeAndPosition = this.adjustSizeAndPosition.bind(this);

		//API events
		document.addEventListener("sticky:recalc", this.recalc);
		this.el.addEventListener("sticky:recalc", this.recalc);
		this.el.addEventListener("DOMNodeRemoved", this.disable);
		this.el.addEventListener("DOMNodeInserted", this.enable);
		this.el.addEventListener("sticky:disable", this.disable);
		this.el.addEventListener("sticky:enable", this.enable);

		if (this.initialDisplay === "none") {
			this.initialDisplay = "block";
			this.disable();
		}
		else this.enable();
	},

	//when element removed or made hidden.
	disable: function(){
		if (this.stub.parentNode) this.parent.removeChild(this.stub);
		this.unbindEvents();
		this.isDisabled = true;
		document.dispatchEvent(new CustomEvent("sticky:recalc"))
	},

	//enables previously disabled element
	enable: function(){
		if (!this.stub.parentNode) this.parent.insertBefore(this.stub, this.el);
		this.isDisabled = false;
		this.bindEvents();
		this.recalc();
		document.dispatchEvent(new CustomEvent("sticky:recalc"))
	},

	bindEvents: function(){
		document.addEventListener("scroll", this.check);
		window.addEventListener("resize", this.recalc);
	},

	unbindEvents: function(){			
		document.addEventListener("scroll", this.check);
		window.addEventListener("resize", this.recalc);
	},

	//changing state necessity checker
	check: function(){
		var vpTop = window.pageYOffset || document.documentElement.scrollTop;
		//console.log("check:" + this.el.dataset["stickyId"], "isFixed:" + this.isFixed, this.restrictBox)
		if (this.isFixed){
			if (!this.isTop && vpTop + this.offset.top + this.options.offset + this.height + this.mt + this.mb >= this.restrictBox.bottom - this.offset.bottom){
				//check bottom parking needed
				this.parkBottom();
			}
			if (!this.isBottom && vpTop + this.offset.top + this.options.offset + this.mt <= this.restrictBox.top){
				//check top parking needed
				this.parkTop();
			}
		} else {
			if (this.isTop || this.isBottom){
				if (vpTop + this.offset.top + this.options.offset + this.mt > this.restrictBox.top){
					//fringe violation from top
					if (vpTop + this.offset.top + this.options.offset + this.height + this.mt + this.mb < this.restrictBox.bottom - this.offset.bottom){
						//fringe violation from top or bottom to the sticking zone
						this.stick();
					} else if (!this.isBottom) {
						//fringe violation from top lower than bottom
						//#exclude
						console.log("double down")
						//#endexclude
						this.stick();
						this.parkBottom();
					}
				} else if(this.isBottom){
					//fringe violation from bottom to higher than top
					//#exclude
					console.log("double up")
					//#endexclude
					this.stick();
					this.parkTop();
				}
			}
		}
	},

	//sticking inner routines
	//when park top needed
	parkTop: function(){
		//this.el = this.parent.removeChild(this.el);
		this.el.style.cssText = this.initialStyle;
		this.el.classList.remove(this.options["stickyClass"]);
		//this.stub = this.parent.replaceChild(this.el, this.stub);
		this.stub.style.display = "none";

		this.isFixed = false;
		this.isTop = true;
		this.isBottom = false;
		//#if DEV
		console.log("parkTop", this.id)
		//#endif
	},

	//to make fixed
	//enhanced replace: faked visual stub is fastly replaced with natural one
	stick: function(){
		//this.el = this.parent.replaceChild(this.stub, this.el);
		this.stub.style.display = this.initialDisplay;
		this.makeStickedStyle(this.el);
		//this.parent.insertBefore(this.el, this.stub);

		this.isFixed = true;
		this.isTop = false;
		this.isBottom = false;

		//#if DEV
		console.log("stick", this.id)
		//#endif
	},

	//when bottom land needed
	parkBottom: function(){
		this.el.classList.remove(this.options["stickyClass"]);
		this.makeParkedBottomStyle(this.el);

		this.isFixed = false;
		this.isBottom = true;
		this.isTop = false;
		//#if DEV
		console.log("parkBottom", this.id)
		//#endif
	},

	//set up style of element as it is parked at the bottom
	makeParkedBottomStyle: function(el){
		el.style.cssText = this.initialStyle;
		el.style.position = "absolute";
		el.style.top = this.restrictBox.bottom - this.offset.bottom - this.parentBox.top - this.height - this.mt - this.mb + "px";
		mimicStyle(el, this.stub);
		el.style.left = this.stub.offsetLeft + "px";
	},

	makeStickedStyle: function(el, srcEl){
		el.style.cssText = this.initialStyle;
		el.style.position = "fixed";
		el.style.top = this.offset.top + this.options.offset + "px";
		el.classList.add(this.options["stickyClass"]);
		mimicStyle(el, srcEl || this.stub);
	},

	//count offset borders, container sizes. Detect needed container size
	recalc: function(){
		//console.group("recalc:" + this.el.dataset["stickyId"])
		var measureEl = (this.isTop ? this.el : this.stub);

		//update stub content
		this.stub.innerHTML = this.el.innerHTML;
		cleanNode(this.stub);

		//update parent container size & offsets
		this.parentBox = getBoundingOffsetRect(this.parent);

		//update self size & position
		this.height = this.el.offsetHeight;
		var mStyle = getComputedStyle(measureEl);
		this.ml = ~~mStyle.marginLeft.slice(0,-2);
		this.mr = ~~mStyle.marginRight.slice(0,-2);
		this.mt = ~~mStyle.marginTop.slice(0,-2);
		this.mb = ~~mStyle.marginBottom.slice(0,-2);

		//update restrictions
		if (this.restrictWithin instanceof Element){
			var offsetRect = getBoundingOffsetRect(this.restrictWithin)
			this.restrictBox.top = Math.max(offsetRect.top, getBoundingOffsetRect(measureEl).top);
			//console.log(getBoundingOffsetRect(this.stub))
			this.restrictBox.bottom = this.restrictWithin.offsetHeight + offsetRect.top;
		} else if (this.restrictWithin instanceof Object) {
			this.restrictBox = this.restrictWithin;
		} else {
			//case of parent container
			this.restrictBox.top = getBoundingOffsetRect(measureEl).top;
			this.restrictBox.bottom = this.parentBox.height + this.parentBox.top;
		}

		//make restriction up to next sibling within one container
		var prevSticky;
		this.offset.bottom = 0;
		this.offset.top = 0;
		if (this.stack.length){
			for (var i = this.stack.length; i--;){
				if (prevSticky = Sticky.stack[this.stack[i]][this.stackId[i] - 1]){
					//make offsets for stacked mode
					var prevMeasurer = (prevSticky.isTop ? prevSticky.el : prevSticky.stub);
					this.offset.top = prevSticky.offset.top + prevSticky.options.offset;
					if (!(this.options["collapse"] && !isOverlap(measureEl, prevMeasurer))) {
					 	this.offset.top += prevSticky.height + Math.max(prevSticky.mt, prevSticky.mb)//collapsed margin
					 	var nextSticky = Sticky.stack[this.stack[i]][this.stackId[i]];
						//multistacking-way of correcting bottom offsets
						for( var j = this.stackId[i] - 1; (prevSticky = Sticky.stack[this.stack[i]][j]); j--){
							prevSticky.offset.bottom = Math.max(prevSticky.offset.bottom, nextSticky.offset.bottom + nextSticky.height + nextSticky.mt + nextSticky.mb);
							nextSticky = prevSticky;
						}
					}
				}
			}
		} else if (prevSticky = Sticky.noStack[this.stackId[0] - 1]){
			prevSticky.restrictBox.bottom = this.restrictBox.top - this.mt;
		}
		
		clearTimeout(this._updTimeout); 
		this._updTimeout = setTimeout(this.adjustSizeAndPosition, 0);
		//console.groupEnd();
	},

	adjustSizeAndPosition: function(){
		if (this.isTop){
			this.el.style.cssText = this.initialStyle;
		} else if (this.isBottom){
			this.makeParkedBottomStyle(this.el);
		} else {
			this.makeStickedStyle(this.el);
		}

		this.check();
	}

}