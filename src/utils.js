/*----------------Utils*/
function extend(a){
	for (var i = 1, l = arguments.length; i<l; i++){
		var b = arguments[i];
		for (var k in b){
			a[k] = b[k];
		}
	}
	return a;
}

function getBoundingOffsetRect(el){
	var c = {top:0, left:0, right:0, bottom:0, width: 0, height: 0},
		rect = el.getBoundingClientRect();
	c.top = rect.top + (window.pageYOffset || document.documentElement.scrollTop);
	c.left = rect.left + (window.pageXOffset || document.documentElement.scrollLeft);
	c.width = el.offsetWidth;
	c.height = el.offsetHeight;
	c.right = document.width - rect.right;
	c.bottom = (window.innerHeight + (window.pageYOffset || document.documentElement.scrollTop) - rect.bottom)

	return c;
}

//removes iframe, objects etc shit
	var badTags = ["object", "iframe", "embed", "img"];
function cleanNode(node){
	node.removeAttribute("id");
	var idTags = node.querySelectorAll("[id]");
	for (var k = 0; k < idTags.length; k++){
		idTags[k].removeAttribute("id"); //avoid any uniqueness
		idTags[k].removeAttribute("name"); //avoid any uniqueness
	}
	for (var i = 0; i < badTags.length; i++){
		var tags = node.querySelectorAll(badTags[i]);
		for (var j = tags.length; j--; ){
			if (tags[j].tagName === "SCRIPT") tags[j].parentNode.replaceChild(tags[j])
			tags[j].removeAttribute("src");
			tags[j].removeAttribute("href");
			tags[j].removeAttribute("rel");
			tags[j].removeAttribute("srcdoc");
		}
	}
}


var directions = ["left", "top", "right", "bottom"],
	mimicProperties = ["padding-", "border-"];

//copies size-related style of stub
function mimicStyle(to, from){
	var stubStyle = getComputedStyle(from),
		stubOffset = getBoundingOffsetRect(from),
		pl = 0, pr = 0, ml = 0;
	if (stubStyle["box-sizing"] !== "border-box"){
		pl = ~~stubStyle.paddingLeft.slice(0,-2)
		pr = ~~stubStyle.paddingRight.slice(0,-2)
	}

	to.style.width = (stubOffset.width - pl - pr) + "px";
	to.style.left = stubOffset.left + "px";
	to.style.marginLeft = 0;
	for (var i = 0; i < mimicProperties.length; i++){
		for (var j = 0; j < directions.length; j++){
			var prop = mimicProperties[i] + directions[j];
			to.style[prop] = stubStyle[prop];
		}
	}
}

//checks overlapping widths
function isOverlap(left, right){
	var lLeft = left.offsetLeft,
		lRight = left.offsetLeft + left.offsetWidth,
		rLeft = right.offsetLeft,
		rRight = right.offsetWidth + right.offsetLeft;
	if (lRight < rLeft && lLeft < rLeft
		|| lRight > rRight && lLeft > rRight){
		return false;
	}
	return true;
}


//#if DEV
	var pluginName = "popupper"
	var containerClass = "popupppee"
//#else
	/* #put "var pluginName = '" + pluginName + "'" */
//#endif


//Logging
//#if DEV
var logDiv = document.createElement("div")
logDiv.style.position = "fixed";
logDiv.style.bottom = 0;
logDiv.style.left = 0;
document.body.appendChild(logDiv)
function log(val){
	logDiv.innerHTML = val;
}
//#endif