if (typeof Sherd == 'undefined' || !Sherd) {
    Sherd = {};
}

// ?wrap in module?
function hasAttr(obj, key) {
    try {
        return (typeof (obj[key]) != 'undefined');
    } catch (e) {
        return false;
    }
}
var new_id = 0;
Sherd.Base = {
    'hasAttr' : hasAttr,
    'newID' : function(prefix) {
        prefix = prefix || 'autogen';
        var new_id = 1;
        while (document.getElementById(prefix + new_id) != null) {
            new_id = Math.floor(Math.random() * 10000);
        }
        return prefix + new_id;
    },
    'log' : function() {
        try {
            window.console.log(arguments);
        } catch (e) {
            var args = [];
            var m = arguments.length;
            while (--m >= 0) {
                args.unshift(arguments[m])
            }
            document.body.appendChild(Sherd.Base
                    .html2dom('<div class="log">' + String(args) + '</div>'));
        }
        ;
    },
    'html2dom' : function(html_text, doc) {
        // @html_text MUST have no leading/trailing whitespace, and only be one
        // element
    doc = (doc) ? doc : document;
    var temp_div = doc.createElement('div');
    temp_div.innerHTML = html_text;
    if (temp_div.childNodes.length == 1) {
        return temp_div.firstChild;
    }
},
'Observer' : function() {
    // the real work is done by connect/signal stuff below
    // this just keeps track of the stuff that needs to be destroyed
    var _listeners = {};
    var _named_listeners = {};
    var _nextListener = 0;
    this.addListener = function(obj, slot) {
        if (slot && _named_listeners[slot]) {
            this.removeListener(slot);
            _named_listeners[slot] = obj;
            return slot;
        } else {
            _listeners[++_nextListener] = obj;
            return _nextListener;
        }
    };
    this.removeListener = function(slot_or_pos) {
        var stor = (_named_listeners[slot_or_pos]) ? _named_listeners
                : _listeners;
        if (stor[slot_or_pos]) {
            stor[slot_or_pos].disconnect();
            delete stor[slot_or_pos];
        }
    };
    this.clearListeners = function() {
        for (a in _named_listeners) {
            this.removeListener(a);
        }
        for (a in _listeners) {
            this.removeListener(a);
        }
    };
    this.events = {
        signal : Sherd.Base.Events.signal,
        connect : Sherd.Base.Events.connect
    };
}// Observer
,
'DomObject' : function() {
    // must override
    Sherd.Base.Observer.call(this);// inherit
    var self = this;

    this.components = {}; // all html refs should go in here
    this.get = function() {
        throw Error("get() not implemented");
    }
    this.microformat = function() {
        throw Error("microformat() not implemented");
    }
    this.idPrefix = function() {
        return 'domObj';
    }
    this.id = function() {
        var _dom = this.get();
        if (!_dom.id) {
            _dom.id = Sherd.Base.newID(this.idPrefix());
        }
        return _dom.id;
    }

    // var _microformat;
    // this.microformat = function() {return _microformat;}
    this.attachMicroformat = function(microformat) {
        this.microformat = microformat;
    }
    this.html = {
        get : function(part) {
            part = (part) ? part : 'media';
            return self.components[part];
        },
        put : function(dom) {
            // maybe should update instead of clobber,
            // /but we should have it clobber
            // /until we need it
            if (self.microformat && self.microformat.components) {
                self.components = self.microformat.components(dom);
            } else {
                self.components = {
                    'top' : dom
                };
            }
        },
        remove : function() {
            self.clearListeners();
            for (part in self.components) {
                self.components[part].parentNode
                        .removeChild(self.components[part]);
            }
        },

        // /utility functions for adding htmlstrings (e.g. output from create()
        // ) into the dom.
        write : function(towrite, doc) {
            doc = (doc) ? doc : document;
            if (typeof towrite == 'string') {
                doc.write(towrite);
            } else if (typeof towrite == 'object' && towrite.text) {
                doc.write(towrite.text);
                if (towrite.htmlID)
                    self.html.put(doc.getElementById(towrite.htmlID))
            }
        },
        replaceContents : function(htmlstring, dom) {
            if (typeof htmlstring == 'string') {
                dom.innerHTML = htmlstring;

            }
        }
    }

}// DomObject
,
'AssetView' : function() { // TODO Document getState/setState and .play. (and
                            // anything else an AssetView does...)
        var self = this;
        Sherd.Base.DomObject.apply(this);

        this.options = {};

        /**
         * TODO Ask Sky what he's doing with these two functions
         */
        var _controller;
        this.attachController = function(controller) {
            _controller = controller;
        }

        this.attachDOM = function(html_dom) {
            var m = this.microformat();
            var list = m.find(html_dom);
            if (list.length == 1) {
                this.components = m.components(list[0].html);
            }
            // subviews should be handled by attacher (assetmanager)
            return list;
        };
        
        if (this.html && !this.html.pull) {
            this.html.pull = function(dom_or_id, optional_microformat) {
                // /argument resolution
                if (typeof dom_or_id == 'string') {
                    dom_or_id = document.getElementById(dom_or_id);
                }
                var mf = (optional_microformat) ? optional_microformat : self.microformat;
                // /
                var asset = mf.read( {
                    html : dom_or_id
                });
                // FAKE!!! (for now)
                self.events.signal(self, 'asset.update');

                return asset;
            }
            this.html.push = function(dom_or_id, options) {
                options = options || {};
                options.microformat = options.microformat || self.microformat;
                options.asset = options.asset || self._asset;
                // /argument resolution
                if (typeof dom_or_id == 'string') {
                    dom_or_id = document.getElementById(dom_or_id);
                }
                if (options.asset) {
                    if (options.asset != self._asset) {
                        var updated = (options.microformat.update // replace
                                                                    // or update
                        && options.microformat.update(options.asset, dom_or_id.firstChild));
                        if (!updated) {
                            var asset_html = options.microformat.create(options.asset);
                            if (options.microformat.write) {
                                options.microformat.write(asset_html, dom_or_id);
                            } else if (asset_html.text) {
                                dom_or_id.innerHTML = asset_html.text;
                                self.html.put(document.getElementById(asset_html.htmlID));
                            }
                        }
                    }
                }
            }
        }

    }// AssetView
    ,
    'AssetManager' : function(config) {
        this.config = (config) ? config : {
            // defaults
            'storage' : Sherd.Base.Storage,
            'layers' : {

            }
        };

    }// AssetManager
    ,
    'Storage' : function() {
        Sherd.Base.Observer.call(this);// inherit

    var _local_objects = {};
    var localid_counter = 0;
    this._localid = function(obj_or_id) {
        var localid;
        if (typeof obj_or_id == 'string') {
            localid = obj_ord_id;
        } else if (hasAttr(obj_or_id, 'local_id')) {
            localid = obj_or_id['local_id'];
        } else {
            localid = String(++localid_counter)
        }
        return localid;
    }
    this._local = function(id, obj) {
        if (arguments.length > 1) {
            _local_objects[id] = obj;
        }
        return (hasAttr(_local_objects, id)) ? _local_objects[id] : false;
    }
    this.load = function(obj_or_id) {

    };
    this.get = function(obj_or_id) {
        var localid = this._localid(obj_or_id);
        return this._local(localid);
    };
    this.save = function(obj) {
        var localid = this._localid(obj);
        this._local(localid, obj);
    };
    this.remove = function(obj_or_id) {

    };

    this._update = function() {
        this.callListeners('update', [ this ]);
    }
}//Storage
}
//Base

/* connected functions
 con_func(event,src
 */
if (typeof MochiKit != 'undefined') {
    Sherd.Base.Events = {
        'connect' : function(subject, event, self, func) {
            if (typeof subject.nodeType != 'undefined' || subject == window
                    || subject == document) {
                event = 'on' + event;
            }
            var disc = MochiKit.Signal.connect(subject, event, self, func);
            return {
                disconnect : function() {
                    MochiKit.Signal.disconnect(disc);
                }
            }
        },
        'signal' : function(subject, event) {
            MochiKit.Signal.signal(subject, event);
        }
    }
} //mochikit
else if (typeof jQuery != 'undefined') {
    Sherd.Base.Events = {
        'connect' : function(subject, event, self, func) {
            var disc = jQuery(subject).bind(event, function() {
                func.call(self, event, this);
            });
            return {
                disconnect : function() {
                    disc.unbind(event);
                }
            }
        },
        'signal' : function(subject, event) {
            jQuery(subject).trigger(event);
        }
    }
} //jquery
else if (typeof YUI != 'undefined') {

}//YUI
else {
    throw Error("Use a framework, Dude! MochiKit, jQuery, YUI, whatever!");
}