if (!Sherd) {Sherd = {};}
if (!Sherd.Image) {Sherd.Image = {};}
if (!Sherd.Image.FSIViewer) {
    Sherd.Image.FSIViewer = function() {
        var self = this;
        Sherd.Base.AssetView.apply(this,arguments); //inherit

	var Mochi = MochiKit.DOM;
        this.ready = false;
        this.current_state = {type:'fsiviewer'};
        this.intended_states = [];

        this.getState = function() {
            ///see this.initialize() for function that updates current_state
            return self.current_state;
        }

        this._setState = function(obj) {
            var clip_string = self.obj2arr(obj).join(', ');
            self.components.top.SetVariable('FSICMD','Goto:'+clip_string);
        }

        this.setState = function(obj) {
            self.current_state = obj;
            self.intended_states.push(obj);
            if (self.ready) {
                this._setState(obj); 
            } //else see InitComplete below
        }            
        //called when you click on the dots-icon next to the save icon
        ///ArtStor custom button functions
        window.saveToImageGroup = function(clip_string, maybe_name, clip_embed_url) {
            //could be: set, scene, left, top, right, bottom, rotation
            //example: asset-level: 1, 1, 0, 0, 1, 1, 0
            //example:  1,   1,     0.53, 0.43,0.711, 0.6114, 0
            console.log(clip_string);
            console.log(maybe_name);
            console.log(clip_embed_url);
        }
        window.saveImage = function(clip_embed_url) {
            console.log(clip_embed_url);
        }
        window.printImage = function(clip_embed_url) {
            console.log(clip_embed_url);
        }

        ///utility functions to move from between array/obj repr
        this.obj2arr = function(o) {
            return [o.set, o.scene, o.left, o.top, o.right, o.bottom, o.rotation];
        }
        this.arr2obj = function(a) {
            return {
                'set':a[0],'scene':a[1],
                'left':a[2],'top':a[3],'right':a[4],'bottom':a[5],
                'rotation':a[6]
            };
        }

	this.presentations = {
	    'thumb':{
		height:function(){return '100px'},
		width:function(){return '100px'},
                extra:'NoNav=true&amp;MenuAlign=TL&amp;HideUI=true',
		initialize:function(obj,presenter){
                    
                }
	    },
	    'default':{
		height:function(obj,presenter){return (Mochi.getViewportDimensions().h-250 )+'px'},
		width:function(obj,presenter){return '100%'},
                extra:'NoNav=undefined&amp;MenuAlign=TL',
		initialize:function(obj,presenter){
                    connect(window,'onresize',function() {
                        var top = presenter.components.top;
			top.setAttribute('height',(Mochi.getViewportDimensions().h-250 )+'px');
                        self.current_state.wh_ratio = ( top.width / (top.height-30) );
		    });
                }
	    },
	    'small':{
		height:function(){return '240px'},
		width:function(){return '320px'},
                extra:'NoNav=undefined&amp;MenuAlign=BL',
		initialize:function(){/*noop*/}
	    }
	}
        this.initialize = function(create_obj) {
            ///copied from openlayers code:
		var presentation;
		switch (typeof create_obj.object.presentation) {
		case 'string': presentation = self.presentations[create_obj.object.presentation]; break;
		case 'object': presentation = create_obj.object.presentation; break;
		case 'undefined': presentation = self.presentations['default']; break;
		}
            
                presentation.initialize(create_obj.object, self);

            var top = self.components.top;
            self.current_state.wh_ratio = ( top.width / (top.height-30) );

            var state_listener = function(fsi_event, params) {
                //console.log('FSI EVENT:'+fsi_event);
                //console.log(params);
                switch(fsi_event) {
                case 'View':
                    if (self.ready) {
                    var o = self.arr2obj(params.split(', '));
                    for (a in o) {
                        self.current_state[a] = o[a];
                    }
                    }
                    break;
                case 'ImageUrl':
                    ///replace '[width]' and '[height]' for desired size of image.
                    if (self.ready)
                        self.current_state.imageUrl = params;
                    break;
                case 'LoadingComplete': 
                    self.ready = true;
                    var s;
                    if (self.intended_states.length) {
                        setTimeout(function() {
                            self._setState(self.intended_states[self.intended_states.length-1]);
                        },100);
                    }
                    break;
                case 'InitComplete':
                case 'Zoom': 
                case 'Reset': //zoom all the way out and center
                case 'LoadProgress': //of the image
                case 'TooTip': //more or less == hover
                    ///and more
                }
            }
            window[create_obj.htmlID+'_DoFSCommand'] = state_listener;
            window[create_obj.htmlID+'_embed_DoFSCommand'] = state_listener;
        }
        this.microformat = {};
        this.microformat.components = function(html_dom, create_obj) {
            return {'top':html_dom};
        }
        this.microformat.create = function(obj,doc) {
            var fsi_object_id = Sherd.Base.newID('fsiviewer-wrapper');
            var broken_url = obj.image_fpx.split('/');
            var presentation = self.presentations[ obj.presentation ||'default' ];
            obj.image_fpx_base = broken_url.slice(0,3).join('/') + '/';
            obj.image_fpx_src = broken_url.slice(3).join('/');
            var fpx = obj["image_fpx-metadata"];
            var html = '<object width="'+presentation.width()+'" height="'+presentation.height()+'" type="application/x-shockwave-flash" data="'+obj.fsiviewer+'?FPXBase='+obj.image_fpx_base+'&amp;FPXSrc='+obj.image_fpx_src+'&amp;FPXWidth='+fpx.width+'&amp;FPXHeight='+fpx.height+'&amp;'+presentation.extra+'" id="'+fsi_object_id+'" name="'+fsi_object_id+'"><param name="wmode" value="opaque"><param name="allowScriptAccess" value="always"><param name="swliveconnect" value="true"><param name="menu" value="false"><param name="quality" value="high"><param name="scale" value="noscale"><param name="salign" value="LT"><param name="bgcolor" value="#FFFFFF"></object>';
            return {
                object:obj,
                htmlID:fsi_object_id,
                text:html
            };
        }
    }
}