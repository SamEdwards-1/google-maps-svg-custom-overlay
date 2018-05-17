var setupMapRaphael = function() {
    var zoom_min = 8;
    var zoom_max = 18;

    var centerOfMap = new google.maps.LatLng(37.76136024289929,-122.41976332275391);
    var mapOptions = {
        zoom: 12,
        center: centerOfMap,
        panControl: false,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        overviewMapControl: false,
        draggableCursor:'crosshair',
        mapTypeId: 'blankSlate'
    };
    var mapStyle = [
        {featureType: "poi", elementType: "all",
            stylers: [
                {visibility: "off"}
            ]},
        {featureType:"water",
            elementType:"all",
            stylers: [
                {visibility:"simplified"},
                {saturation:0},
                {lightness:0},
                {gamma:1},
                {color:'#8ac0de'}
            ]},
        {featureType: "landscape",
            elementType: "all",
            stylers: [
                {visibility:"simplified"},
                {saturation:0},
                {lightness:0},
                {gamma:1},
                {color:'#01579b'}
            ]},
        {featureType:"road",
            elementType:"all",
            stylers: [
                {visibility:"simplified"},
                {saturation:0},
                {lightness:10},
                {gamma:1},
                {color:'#0677d0'},
                {hue:'#01579b'}

            ]},
        {featureType:"transit", elementType:"all",
            stylers: [
                {visibility: "off"}
            ]},
        {featureType:"administrative", elementType:"labels",
            stylers: [
                { visibility:"off" }
            ]}
    ]; //end of mapOptions
    var styledMapOptions = {
        maxZoom : zoom_max,
        minZoom : zoom_min
    };

    var map = new google.maps.Map(  document.querySelector('.map-container'),
        mapOptions
    );

    var mapType = new google.maps.StyledMapType(mapStyle, styledMapOptions);
    map.mapTypes.set('blankSlate', mapType);

    var service = new google.maps.places.PlacesService(map);
    var searchRequest = {
        location:centerOfMap,
        radius:4000,
        types:['bus_station']
    };
    var searchResultsCallback = function(results, status) {
        new RaphaelOverlayView(results, map);
    };
    service.nearbySearch(searchRequest, searchResultsCallback);
};


RaphaelOverlayView = function(data, map) {
    this.data_ = data;
    this.map_ = map;
    this.svg_ = null;
    this.div_ = null;
    this.bounds_ = null;
    this.isOverlayInit = false;
    this.markers = [];
    this.setMap(map);
};

RaphaelOverlayView.prototype = new google.maps.OverlayView();

RaphaelOverlayView.prototype.initEventListeners_ = function() {
  this.redrawlisteners = [];
  this.redrawlisteners.push( this.map_.addListener('zoom_changed', this.draw.bind(this)) );
  this.redrawlisteners.push( this.map_.addListener('drag', this.draw.bind(this)) );
  this.redrawlisteners.push( this.map_.addListener('bounds_changed', this.draw.bind(this)) );
  this.redrawlisteners.push( this.map_.addListener('center_changed', this.draw.bind(this)) );
  this.redrawlisteners.push( this.map_.addListener('resize', this.draw.bind(this)) );
};

RaphaelOverlayView.prototype.onAdd = function() {
  var self = this;
  var div = document.createElement('div');
  div.classList.add('svg-overlay-container');
  div.style.borderStyle = 'none';
  div.style.borderWidth = '0px';
  div.style.position = 'absolute';
  div.style.width = '100%';
  div.style.height = '100%';
  this.div_ = div;
  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(div);

  this.initEventListeners_();
};

RaphaelOverlayView.prototype.draw = function() {
    //this.fixLayout();
    var self = this;
    var overlayProjection = this.getProjection();
    this.bounds_ = this.getMap().getBounds();
    var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
    var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

    //mover overlay div to top left of map and full width and height:
    this.div_.style.left = sw.x + 'px';
    this.div_.style.top = ne.y + 'px';
    this.div_.style.width = (ne.x - sw.x) + 'px';
    this.div_.style.height = (sw.y - ne.y) + 'px';
    if(this.paper == null) {
      //instantiate Raphael here with values from the projection, which
      //isnt guaranteed to be set prior to maps invoking draw
      this.paper = Raphael(this.div_, ne.x, sw.y);

      this.data_.forEach(function(markerData) {
        var svgMarker = new SVGMarker( markerData, self.paper);
        self.markers.push(svgMarker);
      });
    }


    this.markers.forEach(function(marker) {
      marker.applyProjection(overlayProjection, sw.x, ne.y);
    })
};

RaphaelOverlayView.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
    var self = this;
    this.redrawlisteners.forEach(function(listener) {
      google.maps.event.removeListener(listener);
    });
};


var circleFill_up ={fill : '#ffcdd2', stroke: '#ffffff', r:4};
var circleFill_over ={fill : '#ffebee', stroke: '#ffcdd2', r:10};

SVGMarker = function(data, paper) {
    this.data_ = data;
    this.paper = paper;
    this.set = paper.set();

    this.circle = paper.circle(0, 0, 6);
    this.circle.attr(circleFill_up);
    this.set.push(this.circle);

    this.label = this.paper.text(8, 0, data.name);
    this.label.attr({
                    'font-family':'Open Sans',
                    'font-size':'16px',
                    'fill':'#ffcdd2',
                    'stroke':'#0677d0',
                    'stroke-width':0.1,
                    'opacity': 0,
                    'text-anchor': 'start'
                    });
    this.set.push(this.label);

    var box = this.label.getBBox();
    this.labelBBox = box;
    this.labelBox = this.paper.rect(box.x - 3, box.y - 3, box.width + 6, box.height + 6, 3);
    this.labelBox.attr({'fill':'#0677d0', stroke:'#01579b', opacity:0, width:3});
    this.labelBox.hide();

    this.set.push(this.labelBox);

    this.label.toFront();
    this.label.hide();

    this.set.mouseover(this.onMouseOver.bind(this));
    this.set.mouseout(this.onMouseOut.bind(this));
};


/**
Places the svg elements at the x,y coordinates indicated by its Lat/Lng coordinates,
offset by the amount the overlay div was shifted to fill the map.
*/
SVGMarker.prototype.applyProjection = function(projection, offsetLeft, offsetTop) {
    var point = projection.fromLatLngToDivPixel(this.data_.geometry.location);
    this.set.transform('t' + (point.x - offsetLeft) + ',' + (point.y - offsetTop));
};

SVGMarker.prototype.onMouseOver = function() {
    this.circle.animate(circleFill_over, 111, 'elastic');
    this.label.show();
    this.labelBox.toFront();
    this.label.toFront();
    this.labelBox.show();
    this.labelBox.animate({opacity:1, width:this.labelBBox.width + 6, x:10}, 70, 'bounceOut');
    this.label.animate({'opacity':1, 'x':13}, 100, 'bounceOut');

};
SVGMarker.prototype.onMouseOut = function() {
    var self = this;
    this.circle.animate(circleFill_up, 111, 'elastic');
    this.label.animate({'x':8, 'opacity':0}, 120, 'easeIn', function() {
        self.label.hide();
    });
    this.labelBox.animate({opacity:0, width:3, x:5}, 180, 'easeIn', function() {
        self.labelBox.hide();
    });
};

document.addEventListener("DOMContentLoaded", setupMapRaphael);
