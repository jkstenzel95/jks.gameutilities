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
  const yDist = 0.0020;
  var gridCounter = 1
  const initCenter = new google.maps.LatLng((initLat + (yDist / 2)).toFixed(6), (initLng + (yDist / 2)).toFixed(6));
  
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 19,
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
  
  function pointToLatLng(x, y, widthPx, heightPx, bounds) {
  	console.log("x: " + x);
    console.log("y: " + y);
    console.log("w: " + widthPx);
    console.log("h: " + heightPx);
    var leftLat = map.getBounds().getNorthEast().lat();
    var rightLat = map.getBounds().getSouthWest().lat();
    var topLng = map.getBounds().getNorthEast().lng();
    var bottomLng = map.getBounds().getSouthWest().lng();
    var relativeOffsetX = x / widthPx;
    var relativeOffsetY = y / heightPx;
    console.log("relative offsets: (" + relativeOffsetX + ", " + relativeOffsetY + ")");
    var lat = leftLat + (relativeOffsetX * (rightLat - leftLat));
    var lng = bottomLng + (relativeOffsetY * (bottomLng - topLng));
    console.log("latlng: (" + lat + ", " + lng + ")");
    return new google.maps.LatLng(lat, lng);
  }
  
  setCorner(initLat, initLng);

  // The custom GridOverlay object contains the grid image,
  // the bounds of the image, and a reference to the map.
  class GridOverlay extends google.maps.OverlayView {
  	self;
    bounds_;
    image_;
    div_;
    gridDragListener_;
    gridReleaseListener_;
    preDragBounds_;
    preDragLatLngClick_;
    preDragMapWidthPx_;
    preDragMapHeightPx_;
    preDragMouseX_;
    preDragMouseY_;
    
    divDrag(event) {
    	var point = overlay.getProjection().fromLatLngToDivPixel(event.latLng); 
      var x = point.x;
      var y = point.y;
      var dragLatLng = pointToLatLng(x, y, self.preDragMapWidthPx_, self.preDragMapHeightPx_, self.preDragBounds_);
      var latOffset = (dragLatLng.lat() - self.preDragLatLngClick_.lat());
      var lngOffset = (dragLatLng.lat() - self.preDragLatLngClick_.lat());
    }
    
    divRelease(event) {
    	map.setOptions({draggable: true});
      google.maps.event.removeListener(self.gridDragListener_);
      google.maps.event.removeListener(self.gridReleaseListener_);
      self.preDragBounds_ = null;
      self.preDragMapWidthPx_ = null;
      self.preDragMapWidthPx_ = null;
      self.preDragMouseX_ = null;
      self.preDragMouseY_ = null;
      console.log("ditch!");
    }
    
    constructor(bounds, image) {
      super();
      // Initialize all properties.
      this.bounds_ = bounds;
      this.image_ = image;
      // Define a property to hold the image's div. We'll
      // actually create this div upon receipt of the onAdd()
      // method so we'll leave it null for now.
      this.div_ = null;
      self = this;
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
      this.div_.id = "grid"+(gridCounter++);
      this.div_.addEventListener("contextmenu", event => {
      	this.setMap(null);
      });
     
      
      this.div_.addEventListener("mousedown", event => {
      	if (!event.shiftKey)
        {
          console.log("ding!");
          map.setOptions({draggable: false})
          this.gridDragListener_ = map.addListener("mousemove", this.divDrag);
          this.gridReleaseListener_ = map.addListener("mouseup", this.divRelease);
          this.preDragBounds_ = map.getBounds();
          this.preDragMapWidthPx_ = document.getElementById('map').offsetWidth;
          this.preDragMapHeightPx_ = document.getElementById('map').offsetHeight;
          this.preDragMouseX_ = event.pageX;
          this.preDragMouseY_ = event.pageY;
          this.preDragLatLngClick_ = pointToLatLng(this.preDragMouseX_, this.preDragMouseY_, this.preDragMapWidthPx_, this.preDragMapHeightPx_, this.bounds_);
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
        this.bounds_.getSouthWest()
      );
      const ne = overlayProjection.fromLatLngToDivPixel(
        this.bounds_.getNorthEast()
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

	
  overlay = new GridOverlay(bounds, srcImage);
  
  console.log(overlay);

  overlay.setMap(map);
  
  mapClickFired = false;
  
  map.addListener( "click", function(e) {
    mapClickFired = true; // acted on in DOM listener below
    clickLat = e.latLng.lat();
    clickLng = e.latLng.lng();
  });
  
  map.addListener( "rightclick", function(e) {
      mapRightClickFired = true; // acted on in DOM listener below
  });
  
  google.maps.event.addDomListener( document.getElementById("map"), "click", function(event) {
    // check modifiers
    if ( event.ctrlKey ) {
        // add new for ctrl key down
        console.log("we here...")
        bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(clickLat, clickLng),
      		new google.maps.LatLng((clickLat + yDist).toFixed(6), (clickLng + yDist).toFixed(6))
        );
        gridOverlay = new GridOverlay(bounds, srcImage);
        gridOverlay.setMap(map);
        gridOverlay.draw();
        
        google.maps.event.addDomListener(document.getElementById(overlay.div_.id), "click", function(event) {
          console.log("OOOOH BABY" + event.latLng);
        });
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

initMap();