/*
 * Plate.js
 * by platec
 */
var Plate = (function () {
    function Observer(data) {
        this.data = data;
        this.walk(data);
    }

    Observer.prototype.walk = function (data) {
        var self = this;
        Object.keys(data).forEach(function (key) {
            self.defineReactive(data, key, data[key]);
        });
    };

    Observer.prototype.defineReactive = function (data, key, val) {
        var dep = new Dep();
        observe(val);
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            get: function getter() {
                if (Dep.target) {
                    dep.addSub(Dep.target);
                }
                return val;
            },
            set: function setter(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                dep.notify();
            }
        });
    };

    function observe(value) {
        if (!value || typeof value !== 'object') {
            return;
        }
        return new Observer(value);
    }

    function Dep() {
        this.subs = [];
    }

    Dep.prototype.addSub = function (sub) {
        this.subs.push(sub);
    };

    Dep.prototype.notify = function () {
        this.subs.forEach(function (sub) {
            sub.update();
        });
    };

    Dep.target = null;

    function Watcher(vm, exp, cb) {
        this.cb = cb;
        this.vm = vm;
        this.exp = exp;
        this.value = this.get();
    }

    Watcher.prototype.update = function () {
        this.run();
    };

    Watcher.prototype.run = function () {
        var value = this.vm.data[this.exp];
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);
        }
    };

    Watcher.prototype.get = function () {
        Dep.target = this;
        var value = this.vm.data[this.exp];
        Dep.target = null;
        return value;
    };

    function Compile(el, vm) {
        this.vm = vm;
        this.el = document.querySelector(el);
        this.fragment = null;
        this.init();
    }

    Compile.prototype.init = function () {
        if (this.el) {
            this.fragment = this.nodeToFragment(this.el);
            this.compileElement(this.fragment);
            this.el.appendChild(this.fragment);
        } else {
            console.log('element not exist');
        }
    };

    Compile.prototype.nodeToFragment = function (el) {
        var fragment = document.createDocumentFragment();
        var child = el.firstChild;
        while (child) {
            fragment.appendChild(child);
            child = el.firstChild;
        }
        return fragment;
    };

    Compile.prototype.compileElement = function (el) {
        var self = this;
        var childNodes = el.childNodes;
        Array.prototype.slice.call(childNodes).forEach(function (node) {
            var reg = /\{\{(.*)\}\}/;
            var text = node.textContent;
            if (isElementNode(node)) {
                self.compile(node);
            } else if (isTextNode(node) && reg.test(text)) {
                self.compileText(node, reg.exec(text)[1].trim());
            }
            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node);
            }
        });
    };

    Compile.prototype.compile = function (node) {
        var nodeAttrs = node.attributes;
        var self = this;
        Array.prototype.forEach.call(nodeAttrs, function (attr) {
            var attrName = attr.name;
            if (isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                if (isEventDirective(dir)) {
                    self.compileEvent(node, self.vm, exp, dir);
                } else {
                    //v-show,model
                    switch (dir) {
                        case 'show':
                            self.compileShow(node, self.vm, exp, dir);
                            break;
                        case 'model':
                            self.compileModel(node, self.vm, exp, dir);
                            break;
                    }
                }
                node.removeAttribute(attrName);
            }
        });
    };

    Compile.prototype.compileText = function (node, exp) {
        var self = this;
        var initText = this.vm[exp];
        updateText(node, initText);
        new Watcher(this.vm, exp, function (value) {
            updateText(node, value);
        });
    };

    Compile.prototype.compileEvent = function (node, vm, exp, dir) {
        var eventType = dir.split(':')[1];
        var cb = vm.methods && vm.methods[exp];
        if (eventType && cb) {
            node.addEventListener(eventType, cb.bind(vm), false);
        }
    };

    Compile.prototype.compileShow = function (node, vm, exp, dir) {
        var value = stringToBoolean(exp.trim());
        if (typeof value != 'boolean') {
            value = vm[value];
        }
        displayNode(node, value);
        new Watcher(this.vm, exp, function (value) {
            displayNode(node, value);
        });
    }


    Compile.prototype.compileModel = function (node, vm, exp, dir) {
        var self = this;
        var val = this.vm[exp];
        modelUpdater(node, val);
        new Watcher(this.vm, exp, function (value) {
            modelUpdater(node, value);
        });

        node.addEventListener('input', function (e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            self.vm[exp] = newValue;
            val = newValue;
        });
    };

    function displayNode(node, value) {
        node.style.display = value ? 'block' : 'none';
    }

    function updateText(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    }

    function modelUpdater(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }

    function isDirective(attr) {
        return attr.indexOf('v-') == 0;
    }

    function isEventDirective(dir) {
        return dir.indexOf('on:') == 0;
    }

    function stringToBoolean(val) {
        if (val === 'true') {
            return true;
        }
        if (val === 'false') {
            return false;
        }
        return val;
    }
 
    function isElementNode(node) {
        return node.nodeType == 1;
    }

    function isTextNode(node) {
        return node.nodeType == 3;
    }

    function Plate(options) {
        var self = this;
        this.data = options.data;
        this.methods = options.methods;

        Object.keys(this.data).forEach(function (key) {
            self.proxyKeys(key);
        })

        observe(this.data);
        new Compile(options.el, this);
    }

    Plate.prototype.proxyKeys = function (key) {
        var self = this;
        Object.defineProperty(this, key, {
            enumerable: false,
            configurable: true,
            get: function getter() {
                return self.data[key];
            },
            set: function setter(newVal) {
                self.data[key] = newVal;
            }
        })
    }
    return Plate;
})();