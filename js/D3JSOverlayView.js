var setupMapD3JS = function() {
    var zoom_min = 8;
    var zoom_max = 18;

    var centerOfMap = new google.maps.LatLng(37.7749300, -122.4194200);
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
                {visibility: "simplified"},
                {hue: "#516c8a"},
            ]},
        {featureType:"road",
            elementType:"all",
            stylers: [
                {visibility:"simplified"},
                {lightness: 100},

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

    var map = new google.maps.Map(  jQuery('.map-container')[0],
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
        console.dir(status);
        console.dir(results);
        var svgOverlay = new D3JSOverlayView(results, map);
    };
    service.nearbySearch(searchRequest, searchResultsCallback);
};

/**
 * @param data
 * @param map
 * @constructor
 */
var D3JSOverlayView = function(data, map) {
    this.map_ = map;
    this.data_ = data;
    this.markers = [];
    // Define a property to hold the image's div. We'll
    // actually create this div upon receipt of the onAdd()
    // method so we'll leave it null for now.
    this.div_ = null;
    this.svg_ = null;
    this.isOverlayInit = false;
    this.setMap(map);
};
D3JSOverlayView.prototype = new google.maps.OverlayView();
D3JSOverlayView.prototype.initOverlay = function() {
    this.isOverlayInit = true;
    var latLongBounds = this.map_.getBounds();
    var overlayProjection = this.getProjection();
    var swPoint = overlayProjection.fromLatLngToDivPixel(latLongBounds.getSouthWest());
    var nePoint = overlayProjection.fromLatLngToDivPixel(latLongBounds.getNorthEast());
    var div = document.createElement('div');
    div.classList.add('svg-overlay-container');
    div.style.width = '100%';
    div.style.height = + 'px';
    div.style.borderWidth = '0px';
    div.style.position = 'absolute';
    this.div_ = div;

    var panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(div);
    this.svg_ = d3.select(div).append('svg');

    this.svg_.attr('height', swPoint.y).attr('width', nePoint.x);
    var svgMarkerNode = this.svg_.selectAll('g').data(this.data_).enter().append('g').attr('transform', function(d) {
        var point = overlayProjection.fromLatLngToDivPixel(d.geometry.location);
        return 'translate(' + point.x + ', ' + point.y + ')';
    }).classed({'svg-marker-node':true});

    var svgMarkerNodeCircle = this.svg_.selectAll('g').append('circle')
        .attr('r', 6)
        .style('fill', '#de00ff')
        .style('stroke', '#ffffff')
        .classed({'svg-marker-circle':true});
    var svgMarkerBus = this.svg_.selectAll('g').append('path')
        .attr('d', bus)
    var svgMarkerLabel = this.svg_.selectAll('g')
        .append('text').text(function(d) {
            return d.name;
        }).classed({'svg-marker-label':true})
        .attr('x', 8).attr('y', 4)
        .style('font-family', 'Open Sans')
        .style('font-size', '16px')
        .style('fill', '#333333')
        .each(function() {
            var bbox = d3.select(this).node().getBBox();
            d3.select(this.parentNode).append("path")
                .attr('d', rounded_rect(bbox.x - 1, bbox.y - 1, bbox.width + 2, bbox.height + 2, 2, true , true, true, true))
                .style('fill', '#516c8a')
                .style('fill-opacity', '1')
                .style('stroke', '#516c8a')
                .style('stroke-width', '1.5px')
                .style('display', 'none')
                .style('opacity', 0)
                .classed({'svg-label-bg':true});

        });

    this.svg_.selectAll('.svg-marker-label').attr('opacity', 0)
        .style('display', 'none');


    this.svg_.selectAll('.svg-marker-circle').on('mouseenter', function($event) {
        d3.select(this).transition().attr('r', 9).style('fill', '#ffffff').style('stroke', '#de00ff').duration(111);
        d3.select(this.parentNode).selectAll('text').style('display', 'inline-block').transition().attr('opacity',1).attr('x', 15).duration(100);
        d3.select(this.parentNode).selectAll('.svg-label-bg').style('display', 'inline-block').transition().attr('opacity',1).attr('x', 14).duration(100);
    });
    this.svg_.selectAll('.svg-marker-circle').on('mouseout', function($event) {
        d3.select(this).transition().attr('r', 6).style('fill', '#de00ff').style('stroke', '#ffffff').duration(111);
        d3.select(this.parentNode).selectAll('text').transition().attr('opacity',0).attr('x', 13).duration(120)
            .each('end', function() {
                d3.select(this).style('display', 'none');
            });
        d3.select(this.parentNode).selectAll('.svg-label-bg').transition().attr('opacity',0).attr('x', -1).duration(100)
            .each('end', function() {
                d3.select(this).style('display', 'none');
            });
    });
    this.redrawlisteners = [];
    this.redrawlisteners.push( this.map_.addListener('zoom_changed', this.redraw.bind(this)) );
    this.redrawlisteners.push( this.map_.addListener('drag', this.redraw.bind(this)) );
    this.redrawlisteners.push( this.map_.addListener('bounds_changed', this.redraw.bind(this)) );
    this.redrawlisteners.push( this.map_.addListener('center_changed', this.redraw.bind(this)) );
    this.redrawlisteners.push( this.map_.addListener('resize', this.redraw.bind(this)) );
};

D3JSOverlayView.prototype.onAdd = function() {

    if(this.isOverlayInit == false) {
        this.initOverlay();
    } else {
        this.redraw();
    }

};

D3JSOverlayView.prototype.redraw = function() {
    var overlayProjection = this.getProjection();

    var svgMarkerNode = this.svg_.selectAll('g').attr('transform', function(d) {
        var point = overlayProjection.fromLatLngToDivPixel(d.geometry.location);
        return 'translate(' + point.x + ', ' + point.y + ')';
    });
};

D3JSOverlayView.prototype.draw = function() {
    var overlayProjection = this.getProjection();
    for(var i = 0; i < this.markers.length; i++) {
        this.markers[i].applyProjection(overlayProjection);
    }
};

D3JSOverlayView.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
    for(var i = 0; i < this.redrawlisteners.length; i++) {
        var listener = this.redrawlisteners[i];
        google.maps.event.removeListener(listener);
    }
};

/*
 x: x-coordinate
 y: y-coordinate
 w: width
 h: height
 r: corner radius
 tl: top_left rounded?
 tr: top_right rounded?
 bl: bottom_left rounded?
 br: bottom_right rounded?
 */
function rounded_rect(x, y, w, h, r, tl, tr, bl, br) {
    var retval;
    retval  = "M" + (x + r) + "," + y;
    retval += "h" + (w - 2*r);
    if (tr) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + r; }
    else { retval += "h" + r; retval += "v" + r; }
    retval += "v" + (h - 2*r);
    if (br) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + r; }
    else { retval += "v" + r; retval += "h" + -r; }
    retval += "h" + (2*r - w);
    if (bl) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + -r; }
    else { retval += "h" + -r; retval += "v" + -r; }
    retval += "v" + (2*r - h);
    if (tl) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + -r; }
    else { retval += "v" + -r; retval += "h" + r; }
    retval += "z";
    return retval;
}
