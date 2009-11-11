if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.OpenLayers) {
    Sherd.Image.OpenLayers = function() {
	var self = this;
	var Mochi = MochiKit.DOM;
	Sherd.Base.AssetView.apply(this,arguments); //inherit

	this.openlayers = {
	    feature2json:function(feature) {
		if (self.openlayers.GeoJSON) {
		    return {'geometry':self.openlayers.GeoJSON.extract.geometry.call(
			self.openlayers.GeoJSON, feature.geometry
		    )};
		}
	    }
	};

	this.currentfeature = false;

	this.getState = function() {
	    var geojson = {};
	    if (self.currentfeature) {
		geojson = self.openlayers.feature2json(self.currentfeature);
	    } 
	    var m = self.openlayers.map;
	    if (m) {
		var center = m.getCenter();
		geojson['default'] = (!geojson.geometry && center.lon==0 && center.lat==0);
		geojson['x']=center.lon; 
		geojson['y']=center.lat;
		geojson['zoom']=m.getZoom();
	    }
	    return geojson;
	}
	this.setState = function(obj) {
	    var state = {
		'x':0,//center of -180:180
		'y':0,//center of -90:90
		'zoom':0
	    };
	    console.log(obj);
	    if (typeof obj=='object') {
		if (obj.geometry) {//obj is a json feature
		    self.currentfeature = self.openlayers.GeoJSON.parseFeature(obj);
		    var bounds = self.currentfeature.geometry.getBounds();
		    self.openlayers.vectors.addFeatures( [self.currentfeature] );
		    self.openlayers.map.zoomToExtent(bounds);
		    return;
		} else {
		    if (obj.x) state.x = obj.x;
		    if (obj.y) state.y = obj.y;
		    if (obj.zoom) state.zoom = obj.zoom;
		}
	    }
	    self.openlayers.map.setCenter(new OpenLayers.LonLat(state.x, state.y), state.zoom);
	}
	this.microformat = {};
	this.microformat.create = function(obj,doc) {
	    var wrapperID = Sherd.Base.newID('openlayers-wrapper');
	    if (!obj.options) obj.options = {numZoomLevels: 3};
	    if (!obj.width) obj.width = '100%';
	    if (!obj.height) obj.height = (Mochi.getViewportDimensions().h-250 )+'px';
	    return {
		object:obj,
		htmlID:wrapperID,
		text:'<div id="'+wrapperID+'" class="sherd-openlayers-map" style="width:'+obj.width+';height:'+obj.height+'"></div>'
	    }
	}
	this.microformat.update = function(obj,html_dom) {
	    ///1. test if something exists in components now (else return false)
	    ///2. assert( obj ~= from_obj) (else return false)

	    ///TODO (replace map (as a new layer--hide/show?)
	    
	}
	this.microformat.write = function(create_obj,html_dom) {
	    if (create_obj && create_obj.text) {
		///boilerplate
		html_dom.innerHTML = create_obj.text;

		///ALL THIS Should all be in initialize() or something
		var top = document.getElementById(create_obj.htmlID);
		self.components = self.microformat.components(top,create_obj);
		
		self.openlayers.map =  new OpenLayers.Map(create_obj.htmlID);
		self.openlayers.graphic = new OpenLayers.Layer.Image(
                    create_obj.object.title||'Image',
		    create_obj.object.image,//url of image
                    //'http://earthtrends.wri.org/images/maps/4_m_citylights_lg.gif',
		    new OpenLayers.Bounds(-180, -90, 180, 90),
                    new OpenLayers.Size(create_obj.object.width, create_obj.object.height),
                    create_obj.object.options
		);
		self.openlayers.vectors = new OpenLayers.Layer.Vector("Vector Layer");
		self.openlayers.map.addLayers([self.openlayers.graphic, self.openlayers.vectors]);

		var projection = 'Flatland:1';//also 'EPSG:4326' and Spherical Mercator='EPSG:900913'
		self.openlayers.GeoJSON = new OpenLayers.Format.GeoJSON(
		    {'internalProjection': self.openlayers.map.baseLayer.projection,
		     'externalProjection': new OpenLayers.Projection(projection)}
		);
	    }
	}
	this.microformat.components = function(html_dom,create_obj) {
	    return {'top':html_dom};
	}
    }//END Sherd.Image.OpenLayers

}//END if (!Sherd.Image.OpenLayers)


/****
An annotation looks like this:
///1
{"type":"Feature", 
 "id":"OpenLayers.Feature.Vector_92", 
 "properties":{}, 
 "geometry":{"type":"Polygon", 
             "coordinates":[[ [-37.8125, 17.1875], 
                              [-37.5, -2.5], 
                              [-2.8125, 11.25], 
                              [-37.8125, 17.1875]
                           ]]
            }, 
 "crs":{"type":"OGC", 
        "properties":{"urn":"urn:ogc:def:crs:OGC:1.3:CRS84"}}
}


///2
{"type":"Feature", 
 "id":"OpenLayers.Feature.Vector_78", 
 "properties":{},  
 "geometry":{"type":"Point", 
             "coordinates":[0.3125, -2.96875]
            }, 
 "crs":{"type":"OGC", 
        "properties":{"urn":"urn:ogc:def:crs:OGC:1.3:CRS84"}}
}


***/