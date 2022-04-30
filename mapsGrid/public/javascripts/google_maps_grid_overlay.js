// This example creates a custom grid overlay image on the map.
// Set the custom overlay object's prototype to a new instance
// of OverlayView. In effect, this will subclass the overlay class therefore
// it's simpler to load the API synchronously, using
// google.maps.event.addDomListener().
// Note that we set the prototype to an instance, rather than the
// parent class itself, because we do not wish to modify the parent class.
// Initialize the map and the custom overlay.
function initMap() {
	const initLat = 47.618744
	const initLng = -122.320060
	const yDist = 0.001905;
	
	const NW = 0;
	const NE = 1;
	const SW = 2;
	const SE = 3;
	
	var grids = [];
	var activeGrid = null;
	var placementCorner = NW;
	const initCenter = new google.maps.LatLng((initLat + (yDist / 2)).toFixed(6), (initLng + (yDist / 2)).toFixed(6));
	
	const map = new google.maps.Map(document.getElementById("map"), {
		zoom: 18,
		center: { lat: initCenter.lat(), lng: initCenter.lng() },
		mapTypeId: "roadmap",
	});
	
	// The photograph is courtesy of the U.S. Geological Survey.
	const srcImage =
		"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjXQ7D4nREGHyw-8nfqcxmaLqovUCxlyuJjL5QUVzqR-ZgBjNaA_ozGCxVSqiQLf-CS_A&usqp=CAU";
	
	var bounds;
	
	function setCorner(lat, lng) {
		var yDist = 0.0025;
		bounds = new google.maps.LatLngBounds(
			new google.maps.LatLng(lat, lng),
			new google.maps.LatLng((lat + yDist).toFixed(6), (lng + yDist).toFixed(6))
		);
	}
	
	function pointToLatLng(x, y, widthPx, heightPx) {
		var leftLng = map.getBounds().getSouthWest().lng();
		var rightLng = map.getBounds().getNorthEast().lng();
		var topLat = map.getBounds().getNorthEast().lat();
		var bottomLat = map.getBounds().getSouthWest().lat();
		var relativeOffsetX = x / widthPx;
		var relativeOffsetY = y / heightPx;
		var lng = leftLng + (relativeOffsetX * (rightLng - leftLng));
		var lat = topLat + (relativeOffsetY * (bottomLat - topLat));
		return new google.maps.LatLng(lat, lng);
	}

	function startDivMove(mouseX, mouseY, shiftKey) {
		map.setOptions({draggable: false, clickableIcons: false});
		activeGrid.gridDragListener_ = map.addListener("mousemove", divDrag);
		activeGrid.gridReleaseListener_ = map.addListener("mouseup", divRelease);
		setDivMoveStartFields(mouseX, mouseY);
	}
	
	function setDivMoveStartFields(mouseX, mouseY) {
		var mapWidthPx = document.getElementById('map').offsetWidth;
		var mapHeightPx = document.getElementById('map').offsetHeight;
		activeGrid.preDragMouseX_ = mouseX;
		activeGrid.preDragMouseY_ = mouseY;
		activeGrid.preDragBounds_ = activeGrid.bounds_;
		activeGrid.preDragLatLngClick_ = pointToLatLng(activeGrid.preDragMouseX_, activeGrid.preDragMouseY_, mapWidthPx, mapHeightPx);
	}
	
		
	function divDrag(event) {
		var scale = Math.pow(2, map.getZoom());
		var nw = new google.maps.LatLng(
			map.getBounds().getNorthEast().lat(),
			map.getBounds().getSouthWest().lng()
		);
		var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
		var worldCoordinate = map.getProjection().fromLatLngToPoint(event.latLng);
		var pixelOffset = new google.maps.Point(
			Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
			Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
		);

		var dragLatLng = event.latLng;
		var latOffset = (dragLatLng.lat() - activeGrid.preDragLatLngClick_.lat());
		var lngOffset = (dragLatLng.lng() - activeGrid.preDragLatLngClick_.lng());
		activeGrid.overlay_.setMap(null);
		
		var ne = activeGrid.preDragBounds_.getNorthEast();
		var sw = activeGrid.preDragBounds_.getSouthWest();
		
		activeGrid.bounds_ = new google.maps.LatLngBounds(
			new google.maps.LatLng(sw.lat() + latOffset, sw.lng() + lngOffset),
			new google.maps.LatLng(ne.lat() + latOffset, ne.lng() + lngOffset)
		);
		
		oldOverlay = activeGrid.overlay_
		newOverlay = new GridOverlay(activeGrid);
		oldOverlay.setMap(null);
		newOverlay.setMap(map);
		activeGrid.overlay_ = newOverlay;
	}
	
	function divRelease(event) {
		google.maps.event.removeListener(activeGrid.gridDragListener_);
		google.maps.event.removeListener(activeGrid.gridReleaseListener_);
		activeGrid.preDragLatLngClick_ = null;
		activeGrid.preDragMouseX_ = null;
		activeGrid.preDragMouseY_ = null;
		activeGrid.preDragBounds_ = null;
		activeGrid = null;
		map.setOptions({draggable: true, clickableIcons: true});
	}
	
	setCorner(initLat, initLng);
	
	class gridImage {}

	class MoveableGrid {
		self;
		overlay_;
		bounds_;
		image_;
		gridDragListener_;
		gridReleaseListener_;
		preDragLatLngClick_;
		preDragMouseX_;
		preDragMouseY_;
		preDragBounds_;
		id;
		
		constructor(bounds, image) {
			// Initialize all properties.
			this.bounds_ = bounds;
			this.image_ = image;
			// Define a property to hold the image's div. We'll
			// actually create this div upon receipt of the onAdd()
			// method so we'll leave it null for now.
			this.gridDragListener_ = null;
			this.gridReleaseListener_ = null;
			this.preDragLatLngClick_ = null;
			this.preDragMouseX_ = null;
			this.preDragMouseY_ = null;
			this.preDragBounds_ = null;
			this.overlay_ = new GridOverlay(this);
			this.overlay_.setMap(map);
			this.self = this
			this.id = grids.length;
			grids.push(this);
		}
		
		
	}

	// The custom GridOverlay object contains the grid image,
	// the bounds of the image, and a reference to the map.
	class GridOverlay extends google.maps.OverlayView {
		self;
		div_;
		overlayManager_;
		
		constructor(overlayManager) {
			super();
			// Initialize all properties.
			this.overlayManager_ = overlayManager;
			this.bounds_ = overlayManager.bounds_;
			this.image_ = overlayManager.image_;
			// Define a property to hold the image's div. We'll
			// actually create this div upon receipt of the onAdd()
			// method so we'll leave it null for now.
			this.div_ = null;
			this.self = this;
		}
		
		/**
		 * onAdd is called when the map's panes are ready and the overlay has been
		 * added to the map.
		 */
		onAdd() {
			this.div_ = document.createElement("div");
			this.div_.style.borderStyle = "none";
			this.div_.style.borderWidth = "0px";
			this.div_.style.position = "absolute";
			this.div_.style.zIndex = 128;
			this.div_.id = "grid" + this.overlayManager_.id;
			this.div_.addEventListener("contextmenu", event => {
				this.setMap(null);
			});
		 
			
			this.div_.addEventListener("mousedown", event => {
				if (!event.shiftKey)
				{
					activeGrid = grids[this.overlayManager_.id];
					startDivMove(event.pageX, event.pageY, event.shiftKey);
				}
			});

			// Create the img element and attach it to the div.
			const img = document.createElement("img");

			img.src = this.image_;
			img.style.width = "100%";
			img.style.height = "100%";
			img.style.position = "absolute";
			img.style.opacity = 0.25;
			img.classList.add("grid");
			this.div_.appendChild(img);

			// Add the element to the "overlayLayer" pane.
			const panes = this.getPanes();

			panes.overlayLayer.appendChild(this.div_);
			panes.overlayMouseTarget.appendChild(this.div_);
		}
		draw() {
			// We use the south-west and north-east
			// coordinates of the overlay to peg it to the correct position and size.
			// To do this, we need to retrieve the projection from the overlay.
			const overlayProjection = this.getProjection();
			// Retrieve the south-west and north-east coordinates of this overlay
			// in LatLngs and convert them to pixel coordinates.
			// We'll use these coordinates to resize the div.
			const sw = overlayProjection.fromLatLngToDivPixel(
				this.overlayManager_.bounds_.getSouthWest()
			);
			
			var swll = this.overlayManager_.bounds_.getSouthWest();
			const ne = overlayProjection.fromLatLngToDivPixel(
				this.overlayManager_.bounds_.getNorthEast()
			);

			// Resize the image's div to fit the indicated dimensions.
			if (this.div_) {
				this.div_.style.left = sw.x + "px";
				this.div_.style.top = sw.y + "px";
				this.div_.style.width = ne.x - sw.x + "px";
				this.div_.style.height = ne.x - sw.x + "px";
			}
		}
		/**
		 * The onRemove() method will be called automatically from the API if
		 * we ever set the overlay's map property to 'null'.
		 */
		onRemove() {
			if (this.div_) {
				this.div_.parentNode.removeChild(this.div_);
				this.div_ = null;
			}
		}
	}
 
	mapClickFired = false;
	document.getElementById("img-preview").src = srcImage;
	
	map.addListener( "click", function(e) {
		mapClickFired = true; // acted on in DOM listener below
		clickLat = e.latLng.lat();
		clickLng = e.latLng.lng();
	});
	
	map.addListener( "rightclick", function(e) {
			mapRightClickFired = true; // acted on in DOM listener below
	});
	
	window.addEventListener( "keypress", function(e) {
		if (e.key == "w")
		{
			console.log("next opt");
		}
		else if (e.key == "s")
		{
			console.log("last opt");
		}
		else if (e.key == "q")
		{
			document.getElementById("corner-text").innerHTML = "NW";
			placementCorner = NW;
			console.log("TOP-LEFT");
		}
		else if (e.key == "e")
		{
			document.getElementById("corner-text").innerHTML = "NE";
			placementCorner = NE;
			console.log("TOP-RIGHT");
		}
		else if (e.key == "a")
		{
			document.getElementById("corner-text").innerHTML = "SW";
			placementCorner = SW;
			console.log("BOTTOM-LEFT");
		}
		else if (e.key == "d")
		{
			document.getElementById("corner-text").innerHTML = "SE";
			placementCorner = SE;
			console.log("BOTTOM-RIGHT");
		}
	});
	
	function getPlacementBounds(clickLat, clickLng) {
		var northeast;
		var southwest;
		switch (placementCorner) {
			case NW:
				northeast = new google.maps.LatLng(clickLat, clickLng);
				southwest = new google.maps.LatLng(clickLat + yDist, clickLng + yDist);
				break;
			case NE:
				northeast = new google.maps.LatLng(clickLat, clickLng - yDist);
				southwest = new google.maps.LatLng(clickLat + yDist, clickLng);
				break;
			case SW:
				northeast = new google.maps.LatLng(clickLat + yDist, clickLng - yDist);
				southwest = new google.maps.LatLng(clickLat, clickLng);
				break;
			case SE:
				northeast = new google.maps.LatLng(clickLat + yDist, clickLng);
				southwest = new google.maps.LatLng(clickLat, clickLng + yDist);
				break;
		}
		
		return new google.maps.LatLngBounds(northeast, southwest);
	}
	
	google.maps.event.addDomListener( document.getElementById("map"), "click", function(event) {
		// check modifiers
		if ( event.ctrlKey ) {
				// add new for ctrl key down
				bounds = getPlacementBounds(clickLat, clickLng);
				gridOverlay = new MoveableGrid(bounds, srcImage);
				
				clickLat = null;
				clickLng = null;
		}
		else if ( mapClickFired ) {
				// do things for regular map click 
		}
		mapClickFired = false;
	});
	
	google.maps.event.addDomListener( document.getElementById("map"), "rightclick", function(event) {
		// check modifiers
		if ( event.ctrlKey ) {
				// do things for ctrl key down
			map.addListener( "rightclick", function(e) {
				mapRightClickFired = true; // acted on in DOM listener below
			});
		}
		else if ( mapClickFired ) {
			// do things for regular map click 
		}
		mapClickFired = false;
	});
}