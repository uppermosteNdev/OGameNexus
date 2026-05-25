var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  "use strict";
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  var dexie_min = { exports: {} };
  (function(module, exports$1) {
    ((e, t) => {
      module.exports = t();
    })(commonjsGlobal, function() {
      var B = function(e2, t2) {
        return (B = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? function(e3, t3) {
          e3.__proto__ = t3;
        } : function(e3, t3) {
          for (var n2 in t3) Object.prototype.hasOwnProperty.call(t3, n2) && (e3[n2] = t3[n2]);
        }))(e2, t2);
      };
      var _ = function() {
        return (_ = Object.assign || function(e2) {
          for (var t2, n2 = 1, r2 = arguments.length; n2 < r2; n2++) for (var o2 in t2 = arguments[n2]) Object.prototype.hasOwnProperty.call(t2, o2) && (e2[o2] = t2[o2]);
          return e2;
        }).apply(this, arguments);
      };
      function R(e2, t2, n2) {
        for (var r2, o2 = 0, i2 = t2.length; o2 < i2; o2++) !r2 && o2 in t2 || ((r2 = r2 || Array.prototype.slice.call(t2, 0, o2))[o2] = t2[o2]);
        return e2.concat(r2 || Array.prototype.slice.call(t2));
      }
      var f = "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : "undefined" != typeof window ? window : commonjsGlobal, O = Object.keys, x = Array.isArray;
      function a(t2, n2) {
        return "object" == typeof n2 && O(n2).forEach(function(e2) {
          t2[e2] = n2[e2];
        }), t2;
      }
      "undefined" == typeof Promise || f.Promise || (f.Promise = Promise);
      var F = Object.getPrototypeOf, M = {}.hasOwnProperty;
      function m(e2, t2) {
        return M.call(e2, t2);
      }
      function N(t2, n2) {
        "function" == typeof n2 && (n2 = n2(F(t2))), ("undefined" == typeof Reflect ? O : Reflect.ownKeys)(n2).forEach(function(e2) {
          u(t2, e2, n2[e2]);
        });
      }
      var L = Object.defineProperty;
      function u(e2, t2, n2, r2) {
        L(e2, t2, a(n2 && m(n2, "get") && "function" == typeof n2.get ? { get: n2.get, set: n2.set, configurable: true } : { value: n2, configurable: true, writable: true }, r2));
      }
      function U(t2) {
        return { from: function(e2) {
          return t2.prototype = Object.create(e2.prototype), u(t2.prototype, "constructor", t2), { extend: N.bind(null, t2.prototype) };
        } };
      }
      var V = Object.getOwnPropertyDescriptor;
      var z = [].slice;
      function W(e2, t2, n2) {
        return z.call(e2, t2, n2);
      }
      function Y(e2, t2) {
        return t2(e2);
      }
      function $(e2) {
        if (!e2) throw new Error("Assertion Failed");
      }
      function Q(e2) {
        f.setImmediate ? setImmediate(e2) : setTimeout(e2, 0);
      }
      function c(e2, t2) {
        if ("string" == typeof t2 && m(e2, t2)) return e2[t2];
        if (!t2) return e2;
        if ("string" != typeof t2) {
          for (var n2 = [], r2 = 0, o2 = t2.length; r2 < o2; ++r2) {
            var i2 = c(e2, t2[r2]);
            n2.push(i2);
          }
          return n2;
        }
        var a2, u2 = t2.indexOf(".");
        return -1 === u2 || null == (a2 = e2[t2.substr(0, u2)]) ? void 0 : c(a2, t2.substr(u2 + 1));
      }
      function b(e2, t2, n2) {
        if (e2 && void 0 !== t2 && !("isFrozen" in Object && Object.isFrozen(e2))) if ("string" != typeof t2 && "length" in t2) {
          $("string" != typeof n2 && "length" in n2);
          for (var r2 = 0, o2 = t2.length; r2 < o2; ++r2) b(e2, t2[r2], n2[r2]);
        } else {
          var i2, a2, u2 = t2.indexOf(".");
          -1 !== u2 ? (i2 = t2.substr(0, u2), "" === (u2 = t2.substr(u2 + 1)) ? void 0 === n2 ? x(e2) && !isNaN(parseInt(i2)) ? e2.splice(i2, 1) : delete e2[i2] : e2[i2] = n2 : b(a2 = (a2 = e2[i2]) && m(e2, i2) ? a2 : e2[i2] = {}, u2, n2)) : void 0 === n2 ? x(e2) && !isNaN(parseInt(t2)) ? e2.splice(t2, 1) : delete e2[t2] : e2[t2] = n2;
        }
      }
      function G(e2) {
        var t2, n2 = {};
        for (t2 in e2) m(e2, t2) && (n2[t2] = e2[t2]);
        return n2;
      }
      var X = [].concat;
      function H(e2) {
        return X.apply([], e2);
      }
      var e = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(H([8, 16, 32, 64].map(function(t2) {
        return ["Int", "Uint", "Float"].map(function(e2) {
          return e2 + t2 + "Array";
        });
      }))).filter(function(e2) {
        return f[e2];
      }), J = new Set(e.map(function(e2) {
        return f[e2];
      }));
      var Z = null;
      function ee(e2) {
        Z = /* @__PURE__ */ new WeakMap();
        e2 = function e3(t2) {
          if (!t2 || "object" != typeof t2) return t2;
          var n2 = Z.get(t2);
          if (n2) return n2;
          if (x(t2)) {
            n2 = [], Z.set(t2, n2);
            for (var r2 = 0, o2 = t2.length; r2 < o2; ++r2) n2.push(e3(t2[r2]));
          } else if (J.has(t2.constructor)) n2 = t2;
          else {
            var i2, a2 = F(t2);
            for (i2 in n2 = a2 === Object.prototype ? {} : Object.create(a2), Z.set(t2, n2), t2) m(t2, i2) && (n2[i2] = e3(t2[i2]));
          }
          return n2;
        }(e2);
        return Z = null, e2;
      }
      var te = {}.toString;
      function ne(e2) {
        return te.call(e2).slice(8, -1);
      }
      var re = "undefined" != typeof Symbol ? Symbol.iterator : "@@iterator", oe = "symbol" == typeof re ? function(e2) {
        var t2;
        return null != e2 && (t2 = e2[re]) && t2.apply(e2);
      } : function() {
        return null;
      };
      function ie(e2, t2) {
        t2 = e2.indexOf(t2);
        0 <= t2 && e2.splice(t2, 1);
      }
      var ae = {};
      function n(e2) {
        var t2, n2, r2, o2;
        if (1 === arguments.length) {
          if (x(e2)) return e2.slice();
          if (this === ae && "string" == typeof e2) return [e2];
          if (o2 = oe(e2)) for (n2 = []; !(r2 = o2.next()).done; ) n2.push(r2.value);
          else {
            if (null == e2) return [e2];
            if ("number" != typeof (t2 = e2.length)) return [e2];
            for (n2 = new Array(t2); t2--; ) n2[t2] = e2[t2];
          }
        } else for (t2 = arguments.length, n2 = new Array(t2); t2--; ) n2[t2] = arguments[t2];
        return n2;
      }
      var ue = "undefined" != typeof Symbol ? function(e2) {
        return "AsyncFunction" === e2[Symbol.toStringTag];
      } : function() {
        return false;
      }, e = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], t = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(e), se = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
      function ce(e2, t2) {
        this.name = e2, this.message = t2;
      }
      function le(e2, t2) {
        return e2 + ". Errors: " + Object.keys(t2).map(function(e3) {
          return t2[e3].toString();
        }).filter(function(e3, t3, n2) {
          return n2.indexOf(e3) === t3;
        }).join("\n");
      }
      function fe(e2, t2, n2, r2) {
        this.failures = t2, this.failedKeys = r2, this.successCount = n2, this.message = le(e2, t2);
      }
      function he(e2, t2) {
        this.name = "BulkError", this.failures = Object.keys(t2).map(function(e3) {
          return t2[e3];
        }), this.failuresByPos = t2, this.message = le(e2, this.failures);
      }
      U(ce).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), U(fe).from(ce), U(he).from(ce);
      var de = t.reduce(function(e2, t2) {
        return e2[t2] = t2 + "Error", e2;
      }, {}), pe = ce, k = t.reduce(function(e2, n2) {
        var r2 = n2 + "Error";
        function t2(e3, t3) {
          this.name = r2, e3 ? "string" == typeof e3 ? (this.message = "".concat(e3).concat(t3 ? "\n " + t3 : ""), this.inner = t3 || null) : "object" == typeof e3 && (this.message = "".concat(e3.name, " ").concat(e3.message), this.inner = e3) : (this.message = se[n2] || r2, this.inner = null);
        }
        return U(t2).from(pe), e2[n2] = t2, e2;
      }, {}), ye = (k.Syntax = SyntaxError, k.Type = TypeError, k.Range = RangeError, e.reduce(function(e2, t2) {
        return e2[t2 + "Error"] = k[t2], e2;
      }, {}));
      e = t.reduce(function(e2, t2) {
        return -1 === ["Syntax", "Type", "Range"].indexOf(t2) && (e2[t2 + "Error"] = k[t2]), e2;
      }, {});
      function g() {
      }
      function ve(e2) {
        return e2;
      }
      function me(t2, n2) {
        return null == t2 || t2 === ve ? n2 : function(e2) {
          return n2(t2(e2));
        };
      }
      function be(e2, t2) {
        return function() {
          e2.apply(this, arguments), t2.apply(this, arguments);
        };
      }
      function ge(o2, i2) {
        return o2 === g ? i2 : function() {
          var e2 = o2.apply(this, arguments), t2 = (void 0 !== e2 && (arguments[0] = e2), this.onsuccess), n2 = this.onerror, r2 = (this.onsuccess = null, this.onerror = null, i2.apply(this, arguments));
          return t2 && (this.onsuccess = this.onsuccess ? be(t2, this.onsuccess) : t2), n2 && (this.onerror = this.onerror ? be(n2, this.onerror) : n2), void 0 !== r2 ? r2 : e2;
        };
      }
      function we(n2, r2) {
        return n2 === g ? r2 : function() {
          n2.apply(this, arguments);
          var e2 = this.onsuccess, t2 = this.onerror;
          this.onsuccess = this.onerror = null, r2.apply(this, arguments), e2 && (this.onsuccess = this.onsuccess ? be(e2, this.onsuccess) : e2), t2 && (this.onerror = this.onerror ? be(t2, this.onerror) : t2);
        };
      }
      function _e(o2, i2) {
        return o2 === g ? i2 : function(e2) {
          var t2 = o2.apply(this, arguments), e2 = (a(e2, t2), this.onsuccess), n2 = this.onerror, r2 = (this.onsuccess = null, this.onerror = null, i2.apply(this, arguments));
          return e2 && (this.onsuccess = this.onsuccess ? be(e2, this.onsuccess) : e2), n2 && (this.onerror = this.onerror ? be(n2, this.onerror) : n2), void 0 === t2 ? void 0 === r2 ? void 0 : r2 : a(t2, r2);
        };
      }
      function xe(e2, t2) {
        return e2 === g ? t2 : function() {
          return false !== t2.apply(this, arguments) && e2.apply(this, arguments);
        };
      }
      function ke(o2, i2) {
        return o2 === g ? i2 : function() {
          var e2 = o2.apply(this, arguments);
          if (e2 && "function" == typeof e2.then) {
            for (var t2 = this, n2 = arguments.length, r2 = new Array(n2); n2--; ) r2[n2] = arguments[n2];
            return e2.then(function() {
              return i2.apply(t2, r2);
            });
          }
          return i2.apply(this, arguments);
        };
      }
      e.ModifyError = fe, e.DexieError = ce, e.BulkError = he;
      var l = "undefined" != typeof location && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function Oe(e2) {
        l = e2;
      }
      var Pe = {}, Ke = 100, Ee = "undefined" == typeof Promise ? [] : (t = Promise.resolve(), "undefined" != typeof crypto && crypto.subtle ? [Ee = crypto.subtle.digest("SHA-512", new Uint8Array([0])), F(Ee), t] : [t, F(t), t]), t = Ee[0], Se = Ee[1], Se = Se && Se.then, je = t && t.constructor, Ae = !!Ee[2];
      var Ce = function(e2, t2) {
        Re.push([e2, t2]), Ie && (queueMicrotask(Ye), Ie = false);
      }, Te = true, Ie = true, qe = [], De = [], Be = ve, s = { id: "global", global: true, ref: 0, unhandleds: [], onunhandled: g, pgp: false, env: {}, finalize: g }, P = s, Re = [], Fe = 0, Me = [];
      function K(e2) {
        if ("object" != typeof this) throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = false;
        var t2 = this._PSD = P;
        if ("function" != typeof e2) {
          if (e2 !== Pe) throw new TypeError("Not a function");
          this._state = arguments[1], this._value = arguments[2], false === this._state && Ue(this, this._value);
        } else this._state = null, this._value = null, ++t2.ref, function t3(r2, e3) {
          try {
            e3(function(n2) {
              if (null === r2._state) {
                if (n2 === r2) throw new TypeError("A promise cannot be resolved with itself.");
                var e4 = r2._lib && $e();
                n2 && "function" == typeof n2.then ? t3(r2, function(e5, t4) {
                  n2 instanceof K ? n2._then(e5, t4) : n2.then(e5, t4);
                }) : (r2._state = true, r2._value = n2, Ve(r2)), e4 && Qe();
              }
            }, Ue.bind(null, r2));
          } catch (e4) {
            Ue(r2, e4);
          }
        }(this, e2);
      }
      var Ne = { get: function() {
        var u2 = P, t2 = et;
        function e2(n2, r2) {
          var o2 = this, i2 = !u2.global && (u2 !== P || t2 !== et), a2 = i2 && !v(), e3 = new K(function(e4, t3) {
            ze(o2, new Le(ut(n2, u2, i2, a2), ut(r2, u2, i2, a2), e4, t3, u2));
          });
          return this._consoleTask && (e3._consoleTask = this._consoleTask), e3;
        }
        return e2.prototype = Pe, e2;
      }, set: function(e2) {
        u(this, "then", e2 && e2.prototype === Pe ? Ne : { get: function() {
          return e2;
        }, set: Ne.set });
      } };
      function Le(e2, t2, n2, r2, o2) {
        this.onFulfilled = "function" == typeof e2 ? e2 : null, this.onRejected = "function" == typeof t2 ? t2 : null, this.resolve = n2, this.reject = r2, this.psd = o2;
      }
      function Ue(e2, t2) {
        var n2, r2;
        De.push(t2), null === e2._state && (n2 = e2._lib && $e(), t2 = Be(t2), e2._state = false, e2._value = t2, r2 = e2, qe.some(function(e3) {
          return e3._value === r2._value;
        }) || qe.push(r2), Ve(e2), n2) && Qe();
      }
      function Ve(e2) {
        var t2 = e2._listeners;
        e2._listeners = [];
        for (var n2 = 0, r2 = t2.length; n2 < r2; ++n2) ze(e2, t2[n2]);
        var o2 = e2._PSD;
        --o2.ref || o2.finalize(), 0 === Fe && (++Fe, Ce(function() {
          0 == --Fe && Ge();
        }, []));
      }
      function ze(e2, t2) {
        if (null === e2._state) e2._listeners.push(t2);
        else {
          var n2 = e2._state ? t2.onFulfilled : t2.onRejected;
          if (null === n2) return (e2._state ? t2.resolve : t2.reject)(e2._value);
          ++t2.psd.ref, ++Fe, Ce(We, [n2, e2, t2]);
        }
      }
      function We(e2, t2, n2) {
        try {
          var r2, o2 = t2._value;
          !t2._state && De.length && (De = []), r2 = l && t2._consoleTask ? t2._consoleTask.run(function() {
            return e2(o2);
          }) : e2(o2), t2._state || -1 !== De.indexOf(o2) || ((e3) => {
            for (var t3 = qe.length; t3; ) if (qe[--t3]._value === e3._value) return qe.splice(t3, 1);
          })(t2), n2.resolve(r2);
        } catch (e3) {
          n2.reject(e3);
        } finally {
          0 == --Fe && Ge(), --n2.psd.ref || n2.psd.finalize();
        }
      }
      function Ye() {
        at(s, function() {
          $e() && Qe();
        });
      }
      function $e() {
        var e2 = Te;
        return Ie = Te = false, e2;
      }
      function Qe() {
        var e2, t2, n2;
        do {
          for (; 0 < Re.length; ) for (e2 = Re, Re = [], n2 = e2.length, t2 = 0; t2 < n2; ++t2) {
            var r2 = e2[t2];
            r2[0].apply(null, r2[1]);
          }
        } while (0 < Re.length);
        Ie = Te = true;
      }
      function Ge() {
        for (var e2 = qe, t2 = (qe = [], e2.forEach(function(e3) {
          e3._PSD.onunhandled.call(null, e3._value, e3);
        }), Me.slice(0)), n2 = t2.length; n2; ) t2[--n2]();
      }
      function Xe(e2) {
        return new K(Pe, false, e2);
      }
      function E(n2, r2) {
        var o2 = P;
        return function() {
          var e2 = $e(), t2 = P;
          try {
            return h(o2, true), n2.apply(this, arguments);
          } catch (e3) {
            r2 && r2(e3);
          } finally {
            h(t2, false), e2 && Qe();
          }
        };
      }
      N(K.prototype, { then: Ne, _then: function(e2, t2) {
        ze(this, new Le(null, null, e2, t2, P));
      }, catch: function(e2) {
        var t2, n2;
        return 1 === arguments.length ? this.then(null, e2) : (t2 = e2, n2 = arguments[1], "function" == typeof t2 ? this.then(null, function(e3) {
          return (e3 instanceof t2 ? n2 : Xe)(e3);
        }) : this.then(null, function(e3) {
          return (e3 && e3.name === t2 ? n2 : Xe)(e3);
        }));
      }, finally: function(t2) {
        return this.then(function(e2) {
          return K.resolve(t2()).then(function() {
            return e2;
          });
        }, function(e2) {
          return K.resolve(t2()).then(function() {
            return Xe(e2);
          });
        });
      }, timeout: function(r2, o2) {
        var i2 = this;
        return r2 < 1 / 0 ? new K(function(e2, t2) {
          var n2 = setTimeout(function() {
            return t2(new k.Timeout(o2));
          }, r2);
          i2.then(e2, t2).finally(clearTimeout.bind(null, n2));
        }) : this;
      } }), "undefined" != typeof Symbol && Symbol.toStringTag && u(K.prototype, Symbol.toStringTag, "Dexie.Promise"), s.env = it(), N(K, { all: function() {
        var i2 = n.apply(null, arguments).map(rt);
        return new K(function(n2, r2) {
          0 === i2.length && n2([]);
          var o2 = i2.length;
          i2.forEach(function(e2, t2) {
            return K.resolve(e2).then(function(e3) {
              i2[t2] = e3, --o2 || n2(i2);
            }, r2);
          });
        });
      }, resolve: function(n2) {
        return n2 instanceof K ? n2 : n2 && "function" == typeof n2.then ? new K(function(e2, t2) {
          n2.then(e2, t2);
        }) : new K(Pe, true, n2);
      }, reject: Xe, race: function() {
        var e2 = n.apply(null, arguments).map(rt);
        return new K(function(t2, n2) {
          e2.map(function(e3) {
            return K.resolve(e3).then(t2, n2);
          });
        });
      }, PSD: { get: function() {
        return P;
      }, set: function(e2) {
        return P = e2;
      } }, totalEchoes: { get: function() {
        return et;
      } }, newPSD: y, usePSD: at, scheduler: { get: function() {
        return Ce;
      }, set: function(e2) {
        Ce = e2;
      } }, rejectionMapper: { get: function() {
        return Be;
      }, set: function(e2) {
        Be = e2;
      } }, follow: function(o2, n2) {
        return new K(function(e2, t2) {
          return y(function(n3, r2) {
            var e3 = P;
            e3.unhandleds = [], e3.onunhandled = r2, e3.finalize = be(function() {
              var t3, e4 = this;
              t3 = function() {
                0 === e4.unhandleds.length ? n3() : r2(e4.unhandleds[0]);
              }, Me.push(function e5() {
                t3(), Me.splice(Me.indexOf(e5), 1);
              }), ++Fe, Ce(function() {
                0 == --Fe && Ge();
              }, []);
            }, e3.finalize), o2();
          }, n2, e2, t2);
        });
      } }), je && (je.allSettled && u(K, "allSettled", function() {
        var e2 = n.apply(null, arguments).map(rt);
        return new K(function(n2) {
          0 === e2.length && n2([]);
          var r2 = e2.length, o2 = new Array(r2);
          e2.forEach(function(e3, t2) {
            return K.resolve(e3).then(function(e4) {
              return o2[t2] = { status: "fulfilled", value: e4 };
            }, function(e4) {
              return o2[t2] = { status: "rejected", reason: e4 };
            }).then(function() {
              return --r2 || n2(o2);
            });
          });
        });
      }), je.any && "undefined" != typeof AggregateError && u(K, "any", function() {
        var e2 = n.apply(null, arguments).map(rt);
        return new K(function(n2, r2) {
          0 === e2.length && r2(new AggregateError([]));
          var o2 = e2.length, i2 = new Array(o2);
          e2.forEach(function(e3, t2) {
            return K.resolve(e3).then(function(e4) {
              return n2(e4);
            }, function(e4) {
              i2[t2] = e4, --o2 || r2(new AggregateError(i2));
            });
          });
        });
      }), je.withResolvers) && (K.withResolvers = je.withResolvers);
      var i = { awaits: 0, echoes: 0, id: 0 }, He = 0, Je = [], Ze = 0, et = 0, tt = 0;
      function y(e2, t2, n2, r2) {
        var o2 = P, i2 = Object.create(o2), t2 = (i2.parent = o2, i2.ref = 0, i2.global = false, i2.id = ++tt, s.env, i2.env = Ae ? { Promise: K, PromiseProp: { value: K, configurable: true, writable: true }, all: K.all, race: K.race, allSettled: K.allSettled, any: K.any, resolve: K.resolve, reject: K.reject } : {}, t2 && a(i2, t2), ++o2.ref, i2.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, at(i2, e2, n2, r2));
        return 0 === i2.ref && i2.finalize(), t2;
      }
      function nt() {
        return i.id || (i.id = ++He), ++i.awaits, i.echoes += Ke, i.id;
      }
      function v() {
        return !!i.awaits && (0 == --i.awaits && (i.id = 0), i.echoes = i.awaits * Ke, true);
      }
      function rt(e2) {
        return i.echoes && e2 && e2.constructor === je ? (nt(), e2.then(function(e3) {
          return v(), e3;
        }, function(e3) {
          return v(), w(e3);
        })) : e2;
      }
      function ot() {
        var e2 = Je[Je.length - 1];
        Je.pop(), h(e2, false);
      }
      function h(e2, t2) {
        var n2, r2, o2 = P;
        (t2 ? !i.echoes || Ze++ && e2 === P : !Ze || --Ze && e2 === P) || queueMicrotask(t2 ? (function(e3) {
          ++et, i.echoes && 0 != --i.echoes || (i.echoes = i.awaits = i.id = 0), Je.push(P), h(e3, true);
        }).bind(null, e2) : ot), e2 !== P && (P = e2, o2 === s && (s.env = it()), Ae) && (n2 = s.env.Promise, r2 = e2.env, o2.global || e2.global) && (Object.defineProperty(f, "Promise", r2.PromiseProp), n2.all = r2.all, n2.race = r2.race, n2.resolve = r2.resolve, n2.reject = r2.reject, r2.allSettled && (n2.allSettled = r2.allSettled), r2.any) && (n2.any = r2.any);
      }
      function it() {
        var e2 = f.Promise;
        return Ae ? { Promise: e2, PromiseProp: Object.getOwnPropertyDescriptor(f, "Promise"), all: e2.all, race: e2.race, allSettled: e2.allSettled, any: e2.any, resolve: e2.resolve, reject: e2.reject } : {};
      }
      function at(e2, t2, n2, r2, o2) {
        var i2 = P;
        try {
          return h(e2, true), t2(n2, r2, o2);
        } finally {
          h(i2, false);
        }
      }
      function ut(t2, n2, r2, o2) {
        return "function" != typeof t2 ? t2 : function() {
          var e2 = P;
          r2 && nt(), h(n2, true);
          try {
            return t2.apply(this, arguments);
          } finally {
            h(e2, false), o2 && queueMicrotask(v);
          }
        };
      }
      function st(e2) {
        Promise === je && 0 === i.echoes ? 0 === Ze ? e2() : enqueueNativeMicroTask(e2) : setTimeout(e2, 0);
      }
      -1 === ("" + Se).indexOf("[native code]") && (nt = v = g);
      var w = K.reject;
      var ct = String.fromCharCode(65535), S = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", lt = "String expected.", ft = [], ht = "__dbnames", dt = "readonly", pt = "readwrite";
      function yt(e2, t2) {
        return e2 ? t2 ? function() {
          return e2.apply(this, arguments) && t2.apply(this, arguments);
        } : e2 : t2;
      }
      var vt = { type: 3, lower: -1 / 0, lowerOpen: false, upper: [[]], upperOpen: false };
      function mt(t2) {
        return "string" != typeof t2 || /\./.test(t2) ? function(e2) {
          return e2;
        } : function(e2) {
          return void 0 === e2[t2] && t2 in e2 && delete (e2 = ee(e2))[t2], e2;
        };
      }
      function bt() {
        throw k.Type("Entity instances must never be new:ed. Instances are generated by the framework bypassing the constructor.");
      }
      function j(e2, t2) {
        try {
          var n2 = gt(e2), r2 = gt(t2);
          if (n2 !== r2) return "Array" === n2 ? 1 : "Array" === r2 ? -1 : "binary" === n2 ? 1 : "binary" === r2 ? -1 : "string" === n2 ? 1 : "string" === r2 ? -1 : "Date" === n2 ? 1 : "Date" !== r2 ? NaN : -1;
          switch (n2) {
            case "number":
            case "Date":
            case "string":
              return t2 < e2 ? 1 : e2 < t2 ? -1 : 0;
            case "binary":
              for (var o2 = wt(e2), i2 = wt(t2), a2 = o2.length, u2 = i2.length, s2 = a2 < u2 ? a2 : u2, c2 = 0; c2 < s2; ++c2) if (o2[c2] !== i2[c2]) return o2[c2] < i2[c2] ? -1 : 1;
              return a2 === u2 ? 0 : a2 < u2 ? -1 : 1;
            case "Array":
              for (var l2 = e2, f2 = t2, h2 = l2.length, d2 = f2.length, p2 = h2 < d2 ? h2 : d2, y2 = 0; y2 < p2; ++y2) {
                var v2 = j(l2[y2], f2[y2]);
                if (0 !== v2) return v2;
              }
              return h2 === d2 ? 0 : h2 < d2 ? -1 : 1;
          }
        } catch (e3) {
        }
        return NaN;
      }
      function gt(e2) {
        var t2 = typeof e2;
        return "object" == t2 && (ArrayBuffer.isView(e2) || "ArrayBuffer" === (t2 = ne(e2))) ? "binary" : t2;
      }
      function wt(e2) {
        return e2 instanceof Uint8Array ? e2 : ArrayBuffer.isView(e2) ? new Uint8Array(e2.buffer, e2.byteOffset, e2.byteLength) : new Uint8Array(e2);
      }
      function _t(t2, n2, r2) {
        var e2 = t2.schema.yProps;
        return e2 ? (n2 && 0 < r2.numFailures && (n2 = n2.filter(function(e3, t3) {
          return !r2.failures[t3];
        })), Promise.all(e2.map(function(e3) {
          e3 = e3.updatesTable;
          return n2 ? t2.db.table(e3).where("k").anyOf(n2).delete() : t2.db.table(e3).clear();
        })).then(function() {
          return r2;
        })) : r2;
      }
      kt.prototype.execute = function(e2) {
        var t2 = this["@@propmod"];
        if (void 0 !== t2.add) {
          var n2 = t2.add;
          if (x(n2)) return R(R([], x(e2) ? e2 : [], true), n2).sort();
          if ("number" == typeof n2) return (Number(e2) || 0) + n2;
          if ("bigint" == typeof n2) try {
            return BigInt(e2) + n2;
          } catch (e3) {
            return BigInt(0) + n2;
          }
          throw new TypeError("Invalid term ".concat(n2));
        }
        if (void 0 !== t2.remove) {
          var r2 = t2.remove;
          if (x(r2)) return x(e2) ? e2.filter(function(e3) {
            return !r2.includes(e3);
          }).sort() : [];
          if ("number" == typeof r2) return Number(e2) - r2;
          if ("bigint" == typeof r2) try {
            return BigInt(e2) - r2;
          } catch (e3) {
            return BigInt(0) - r2;
          }
          throw new TypeError("Invalid subtrahend ".concat(r2));
        }
        n2 = null == (n2 = t2.replacePrefix) ? void 0 : n2[0];
        return n2 && "string" == typeof e2 && e2.startsWith(n2) ? t2.replacePrefix[1] + e2.substring(n2.length) : e2;
      };
      var xt = kt;
      function kt(e2) {
        this["@@propmod"] = e2;
      }
      function Ot(e2, t2) {
        for (var n2 = O(t2), r2 = n2.length, o2 = false, i2 = 0; i2 < r2; ++i2) {
          var a2 = n2[i2], u2 = t2[a2], s2 = c(e2, a2);
          u2 instanceof xt ? (b(e2, a2, u2.execute(s2)), o2 = true) : s2 !== u2 && (b(e2, a2, u2), o2 = true);
        }
        return o2;
      }
      r.prototype._trans = function(e2, r2, t2) {
        var n2 = this._tx || P.trans, o2 = this.name, i2 = l && "undefined" != typeof console && console.createTask && console.createTask("Dexie: ".concat("readonly" === e2 ? "read" : "write", " ").concat(this.name));
        function a2(e3, t3, n3) {
          if (n3.schema[o2]) return r2(n3.idbtrans, n3);
          throw new k.NotFound("Table " + o2 + " not part of transaction");
        }
        var u2 = $e();
        try {
          var s2 = n2 && n2.db._novip === this.db._novip ? n2 === P.trans ? n2._promise(e2, a2, t2) : y(function() {
            return n2._promise(e2, a2, t2);
          }, { trans: n2, transless: P.transless || P }) : function t3(n3, r3, o3, i3) {
            if (n3.idbdb && (n3._state.openComplete || P.letThrough || n3._vip)) {
              var a3 = n3._createTransaction(r3, o3, n3._dbSchema);
              try {
                a3.create(), n3._state.PR1398_maxLoop = 3;
              } catch (e3) {
                return e3.name === de.InvalidState && n3.isOpen() && 0 < --n3._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), n3.close({ disableAutoOpen: false }), n3.open().then(function() {
                  return t3(n3, r3, o3, i3);
                })) : w(e3);
              }
              return a3._promise(r3, function(e3, t4) {
                return y(function() {
                  return P.trans = a3, i3(e3, t4, a3);
                });
              }).then(function(e3) {
                if ("readwrite" === r3) try {
                  a3.idbtrans.commit();
                } catch (e4) {
                }
                return "readonly" === r3 ? e3 : a3._completion.then(function() {
                  return e3;
                });
              });
            }
            if (n3._state.openComplete) return w(new k.DatabaseClosed(n3._state.dbOpenError));
            if (!n3._state.isBeingOpened) {
              if (!n3._state.autoOpen) return w(new k.DatabaseClosed());
              n3.open().catch(g);
            }
            return n3._state.dbReadyPromise.then(function() {
              return t3(n3, r3, o3, i3);
            });
          }(this.db, e2, [this.name], a2);
          return i2 && (s2._consoleTask = i2, s2 = s2.catch(function(e3) {
            return console.trace(e3), w(e3);
          })), s2;
        } finally {
          u2 && Qe();
        }
      }, r.prototype.get = function(t2, e2) {
        var n2 = this;
        return t2 && t2.constructor === Object ? this.where(t2).first(e2) : null == t2 ? w(new k.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(e3) {
          return n2.core.get({ trans: e3, key: t2 }).then(function(e4) {
            return n2.hook.reading.fire(e4);
          });
        }).then(e2);
      }, r.prototype.where = function(i2) {
        if ("string" == typeof i2) return new this.db.WhereClause(this, i2);
        if (x(i2)) return new this.db.WhereClause(this, "[".concat(i2.join("+"), "]"));
        var n2 = O(i2);
        if (1 === n2.length) return this.where(n2[0]).equals(i2[n2[0]]);
        var e2 = this.schema.indexes.concat(this.schema.primKey).filter(function(t3) {
          if (t3.compound && n2.every(function(e4) {
            return 0 <= t3.keyPath.indexOf(e4);
          })) {
            for (var e3 = 0; e3 < n2.length; ++e3) if (-1 === n2.indexOf(t3.keyPath[e3])) return false;
            return true;
          }
          return false;
        }).sort(function(e3, t3) {
          return e3.keyPath.length - t3.keyPath.length;
        })[0];
        if (e2 && this.db._maxKey !== ct) return t2 = e2.keyPath.slice(0, n2.length), this.where(t2).equals(t2.map(function(e3) {
          return i2[e3];
        }));
        !e2 && l && console.warn("The query ".concat(JSON.stringify(i2), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(n2.join("+"), "]"));
        var a2 = this.schema.idxByName;
        function u2(e3, t3) {
          return 0 === j(e3, t3);
        }
        var t2 = n2.reduce(function(e3, t3) {
          var n3 = e3[0], e3 = e3[1], r3 = a2[t3], o2 = i2[t3];
          return [n3 || r3, n3 || !r3 ? yt(e3, r3 && r3.multi ? function(e4) {
            e4 = c(e4, t3);
            return x(e4) && e4.some(function(e5) {
              return u2(o2, e5);
            });
          } : function(e4) {
            return u2(o2, c(e4, t3));
          }) : e3];
        }, [null, null]), r2 = t2[0], t2 = t2[1];
        return r2 ? this.where(r2.name).equals(i2[r2.keyPath]).filter(t2) : e2 ? this.filter(t2) : this.where(n2).equals("");
      }, r.prototype.filter = function(e2) {
        return this.toCollection().and(e2);
      }, r.prototype.count = function(e2) {
        return this.toCollection().count(e2);
      }, r.prototype.offset = function(e2) {
        return this.toCollection().offset(e2);
      }, r.prototype.limit = function(e2) {
        return this.toCollection().limit(e2);
      }, r.prototype.each = function(e2) {
        return this.toCollection().each(e2);
      }, r.prototype.toArray = function(e2) {
        return this.toCollection().toArray(e2);
      }, r.prototype.toCollection = function() {
        return new this.db.Collection(new this.db.WhereClause(this));
      }, r.prototype.orderBy = function(e2) {
        return new this.db.Collection(new this.db.WhereClause(this, x(e2) ? "[".concat(e2.join("+"), "]") : e2));
      }, r.prototype.reverse = function() {
        return this.toCollection().reverse();
      }, r.prototype.mapToClass = function(r2) {
        for (var i2 = this.db, a2 = this.name, o2 = ((this.schema.mappedClass = r2).prototype instanceof bt && (r2 = ((e3) => {
          var t3 = o3, n2 = e3;
          if ("function" != typeof n2 && null !== n2) throw new TypeError("Class extends value " + String(n2) + " is not a constructor or null");
          function r3() {
            this.constructor = t3;
          }
          function o3() {
            return null !== e3 && e3.apply(this, arguments) || this;
          }
          return B(t3, n2), t3.prototype = null === n2 ? Object.create(n2) : (r3.prototype = n2.prototype, new r3()), Object.defineProperty(o3.prototype, "db", { get: function() {
            return i2;
          }, enumerable: false, configurable: true }), o3.prototype.table = function() {
            return a2;
          }, o3;
        })(r2)), /* @__PURE__ */ new Set()), e2 = r2.prototype; e2; e2 = F(e2)) Object.getOwnPropertyNames(e2).forEach(function(e3) {
          return o2.add(e3);
        });
        function t2(e3) {
          if (!e3) return e3;
          var t3, n2 = Object.create(r2.prototype);
          for (t3 in e3) if (!o2.has(t3)) try {
            n2[t3] = e3[t3];
          } catch (e4) {
          }
          return n2;
        }
        return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = t2, this.hook("reading", t2), r2;
      }, r.prototype.defineClass = function() {
        return this.mapToClass(function(e2) {
          a(this, e2);
        });
      }, r.prototype.add = function(t2, n2) {
        var r2 = this, e2 = this.schema.primKey, o2 = e2.auto, i2 = e2.keyPath, a2 = t2;
        return i2 && o2 && (a2 = mt(i2)(t2)), this._trans("readwrite", function(e3) {
          return r2.core.mutate({ trans: e3, type: "add", keys: null != n2 ? [n2] : null, values: [a2] });
        }).then(function(e3) {
          return e3.numFailures ? K.reject(e3.failures[0]) : e3.lastResult;
        }).then(function(e3) {
          if (i2) try {
            b(t2, i2, e3);
          } catch (e4) {
          }
          return e3;
        });
      }, r.prototype.upsert = function(r2, o2) {
        var i2 = this, a2 = this.schema.primKey.keyPath;
        return this._trans("readwrite", function(n2) {
          return i2.core.get({ trans: n2, key: r2 }).then(function(t2) {
            var e2 = null != t2 ? t2 : {};
            return Ot(e2, o2), a2 && b(e2, a2, r2), i2.core.mutate({ trans: n2, type: "put", values: [e2], keys: [r2], upsert: true, updates: { keys: [r2], changeSpecs: [o2] } }).then(function(e3) {
              return e3.numFailures ? K.reject(e3.failures[0]) : !!t2;
            });
          });
        });
      }, r.prototype.update = function(e2, t2) {
        return "object" != typeof e2 || x(e2) ? this.where(":id").equals(e2).modify(t2) : void 0 === (e2 = c(e2, this.schema.primKey.keyPath)) ? w(new k.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(e2).modify(t2);
      }, r.prototype.put = function(t2, n2) {
        var r2 = this, e2 = this.schema.primKey, o2 = e2.auto, i2 = e2.keyPath, a2 = t2;
        return i2 && o2 && (a2 = mt(i2)(t2)), this._trans("readwrite", function(e3) {
          return r2.core.mutate({ trans: e3, type: "put", values: [a2], keys: null != n2 ? [n2] : null });
        }).then(function(e3) {
          return e3.numFailures ? K.reject(e3.failures[0]) : e3.lastResult;
        }).then(function(e3) {
          if (i2) try {
            b(t2, i2, e3);
          } catch (e4) {
          }
          return e3;
        });
      }, r.prototype.delete = function(t2) {
        var n2 = this;
        return this._trans("readwrite", function(e2) {
          return n2.core.mutate({ trans: e2, type: "delete", keys: [t2] }).then(function(e3) {
            return _t(n2, [t2], e3);
          }).then(function(e3) {
            return e3.numFailures ? K.reject(e3.failures[0]) : void 0;
          });
        });
      }, r.prototype.clear = function() {
        var t2 = this;
        return this._trans("readwrite", function(e2) {
          return t2.core.mutate({ trans: e2, type: "deleteRange", range: vt }).then(function(e3) {
            return _t(t2, null, e3);
          });
        }).then(function(e2) {
          return e2.numFailures ? K.reject(e2.failures[0]) : void 0;
        });
      }, r.prototype.bulkGet = function(t2) {
        var n2 = this;
        return this._trans("readonly", function(e2) {
          return n2.core.getMany({ keys: t2, trans: e2 }).then(function(e3) {
            return e3.map(function(e4) {
              return n2.hook.reading.fire(e4);
            });
          });
        });
      }, r.prototype.bulkAdd = function(o2, e2, t2) {
        var i2 = this, a2 = Array.isArray(e2) ? e2 : void 0, u2 = (t2 = t2 || (a2 ? void 0 : e2)) ? t2.allKeys : void 0;
        return this._trans("readwrite", function(e3) {
          var t3 = i2.schema.primKey, n2 = t3.auto, t3 = t3.keyPath;
          if (t3 && a2) throw new k.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
          if (a2 && a2.length !== o2.length) throw new k.InvalidArgument("Arguments objects and keys must have the same length");
          var r2 = o2.length, n2 = t3 && n2 ? o2.map(mt(t3)) : o2;
          return i2.core.mutate({ trans: e3, type: "add", keys: a2, values: n2, wantResults: u2 }).then(function(e4) {
            var t4 = e4.numFailures, n3 = e4.failures;
            if (0 === t4) return u2 ? e4.results : e4.lastResult;
            throw new he("".concat(i2.name, ".bulkAdd(): ").concat(t4, " of ").concat(r2, " operations failed"), n3);
          });
        });
      }, r.prototype.bulkPut = function(o2, e2, t2) {
        var i2 = this, a2 = Array.isArray(e2) ? e2 : void 0, u2 = (t2 = t2 || (a2 ? void 0 : e2)) ? t2.allKeys : void 0;
        return this._trans("readwrite", function(e3) {
          var t3 = i2.schema.primKey, n2 = t3.auto, t3 = t3.keyPath;
          if (t3 && a2) throw new k.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (a2 && a2.length !== o2.length) throw new k.InvalidArgument("Arguments objects and keys must have the same length");
          var r2 = o2.length, n2 = t3 && n2 ? o2.map(mt(t3)) : o2;
          return i2.core.mutate({ trans: e3, type: "put", keys: a2, values: n2, wantResults: u2 }).then(function(e4) {
            var t4 = e4.numFailures, n3 = e4.failures;
            if (0 === t4) return u2 ? e4.results : e4.lastResult;
            throw new he("".concat(i2.name, ".bulkPut(): ").concat(t4, " of ").concat(r2, " operations failed"), n3);
          });
        });
      }, r.prototype.bulkUpdate = function(t2) {
        var h2 = this, n2 = this.core, r2 = t2.map(function(e2) {
          return e2.key;
        }), o2 = t2.map(function(e2) {
          return e2.changes;
        }), d2 = [];
        return this._trans("readwrite", function(e2) {
          return n2.getMany({ trans: e2, keys: r2, cache: "clone" }).then(function(c2) {
            var l2 = [], f2 = [], s2 = (t2.forEach(function(e3, t3) {
              var n3 = e3.key, r3 = e3.changes, o3 = c2[t3];
              if (o3) {
                for (var i2 = 0, a2 = Object.keys(r3); i2 < a2.length; i2++) {
                  var u2 = a2[i2], s3 = r3[u2];
                  if (u2 === h2.schema.primKey.keyPath) {
                    if (0 !== j(s3, n3)) throw new k.Constraint("Cannot update primary key in bulkUpdate()");
                  } else b(o3, u2, s3);
                }
                d2.push(t3), l2.push(n3), f2.push(o3);
              }
            }), l2.length);
            return n2.mutate({ trans: e2, type: "put", keys: l2, values: f2, updates: { keys: r2, changeSpecs: o2 } }).then(function(e3) {
              var t3 = e3.numFailures, n3 = e3.failures;
              if (0 === t3) return s2;
              for (var r3 = 0, o3 = Object.keys(n3); r3 < o3.length; r3++) {
                var i2, a2 = o3[r3], u2 = d2[Number(a2)];
                null != u2 && (i2 = n3[a2], delete n3[a2], n3[u2] = i2);
              }
              throw new he("".concat(h2.name, ".bulkUpdate(): ").concat(t3, " of ").concat(s2, " operations failed"), n3);
            });
          });
        });
      }, r.prototype.bulkDelete = function(t2) {
        var r2 = this, o2 = t2.length;
        return this._trans("readwrite", function(e2) {
          return r2.core.mutate({ trans: e2, type: "delete", keys: t2 }).then(function(e3) {
            return _t(r2, t2, e3);
          });
        }).then(function(e2) {
          var t3 = e2.numFailures, n2 = e2.failures;
          if (0 === t3) return e2.lastResult;
          throw new he("".concat(r2.name, ".bulkDelete(): ").concat(t3, " of ").concat(o2, " operations failed"), n2);
        });
      };
      var Pt = r;
      function r() {
      }
      function Kt(o2) {
        function t2(e3, t3) {
          if (t3) {
            for (var n3 = arguments.length, r2 = new Array(n3 - 1); --n3; ) r2[n3 - 1] = arguments[n3];
            return a2[e3].subscribe.apply(null, r2), o2;
          }
          if ("string" == typeof e3) return a2[e3];
        }
        var a2 = {};
        t2.addEventType = u2;
        for (var e2 = 1, n2 = arguments.length; e2 < n2; ++e2) u2(arguments[e2]);
        return t2;
        function u2(e3, n3, r2) {
          var o3, i2;
          if ("object" != typeof e3) return n3 = n3 || xe, i2 = { subscribers: [], fire: r2 = r2 || g, subscribe: function(e4) {
            -1 === i2.subscribers.indexOf(e4) && (i2.subscribers.push(e4), i2.fire = n3(i2.fire, e4));
          }, unsubscribe: function(t3) {
            i2.subscribers = i2.subscribers.filter(function(e4) {
              return e4 !== t3;
            }), i2.fire = i2.subscribers.reduce(n3, r2);
          } }, a2[e3] = t2[e3] = i2;
          O(o3 = e3).forEach(function(e4) {
            var t3 = o3[e4];
            if (x(t3)) u2(e4, o3[e4][0], o3[e4][1]);
            else {
              if ("asap" !== t3) throw new k.InvalidArgument("Invalid event config");
              var n4 = u2(e4, ve, function() {
                for (var e5 = arguments.length, t4 = new Array(e5); e5--; ) t4[e5] = arguments[e5];
                n4.subscribers.forEach(function(e6) {
                  Q(function() {
                    e6.apply(null, t4);
                  });
                });
              });
            }
          });
        }
      }
      function Et(e2, t2) {
        return U(t2).from({ prototype: e2 }), t2;
      }
      function St(e2, t2) {
        return !(e2.filter || e2.algorithm || e2.or) && (t2 ? e2.justLimit : !e2.replayFilter);
      }
      function jt(e2, t2) {
        e2.filter = yt(e2.filter, t2);
      }
      function At(e2, t2, n2) {
        var r2 = e2.replayFilter;
        e2.replayFilter = r2 ? function() {
          return yt(r2(), t2());
        } : t2, e2.justLimit = n2 && !r2;
      }
      function Ct(e2, t2) {
        if (e2.isPrimKey) return t2.primaryKey;
        var n2 = t2.getIndexByKeyPath(e2.index);
        if (n2) return n2;
        throw new k.Schema("KeyPath " + e2.index + " on object store " + t2.name + " is not indexed");
      }
      function Tt(e2, t2, n2) {
        var r2 = Ct(e2, t2.schema);
        return t2.openCursor({ trans: n2, values: !e2.keysOnly, reverse: "prev" === e2.dir, unique: !!e2.unique, query: { index: r2, range: e2.range } });
      }
      function It(e2, i2, t2, n2) {
        var a2, r2, u2 = e2.replayFilter ? yt(e2.filter, e2.replayFilter()) : e2.filter;
        return e2.or ? (a2 = {}, r2 = function(e3, t3, n3) {
          var r3, o2;
          u2 && !u2(t3, n3, function(e4) {
            return t3.stop(e4);
          }, function(e4) {
            return t3.fail(e4);
          }) || ("[object ArrayBuffer]" === (o2 = "" + (r3 = t3.primaryKey)) && (o2 = "" + new Uint8Array(r3)), m(a2, o2)) || (a2[o2] = true, i2(e3, t3, n3));
        }, Promise.all([e2.or._iterate(r2, t2), qt(Tt(e2, n2, t2), e2.algorithm, r2, !e2.keysOnly && e2.valueMapper)])) : qt(Tt(e2, n2, t2), yt(e2.algorithm, u2), i2, !e2.keysOnly && e2.valueMapper);
      }
      function qt(e2, r2, o2, i2) {
        var a2 = E(i2 ? function(e3, t2, n2) {
          return o2(i2(e3), t2, n2);
        } : o2);
        return e2.then(function(n2) {
          if (n2) return n2.start(function() {
            var t2 = function() {
              return n2.continue();
            };
            r2 && !r2(n2, function(e3) {
              return t2 = e3;
            }, function(e3) {
              n2.stop(e3), t2 = g;
            }, function(e3) {
              n2.fail(e3), t2 = g;
            }) || a2(n2.value, n2, function(e3) {
              return t2 = e3;
            }), t2();
          });
        });
      }
      o.prototype._read = function(e2, t2) {
        var n2 = this._ctx;
        return n2.error ? n2.table._trans(null, w.bind(null, n2.error)) : n2.table._trans("readonly", e2).then(t2);
      }, o.prototype._write = function(e2) {
        var t2 = this._ctx;
        return t2.error ? t2.table._trans(null, w.bind(null, t2.error)) : t2.table._trans("readwrite", e2, "locked");
      }, o.prototype._addAlgorithm = function(e2) {
        var t2 = this._ctx;
        t2.algorithm = yt(t2.algorithm, e2);
      }, o.prototype._iterate = function(e2, t2) {
        return It(this._ctx, e2, t2, this._ctx.table.core);
      }, o.prototype.clone = function(e2) {
        var t2 = Object.create(this.constructor.prototype), n2 = Object.create(this._ctx);
        return e2 && a(n2, e2), t2._ctx = n2, t2;
      }, o.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, o.prototype.each = function(t2) {
        var n2 = this._ctx;
        return this._read(function(e2) {
          return It(n2, t2, e2, n2.table.core);
        });
      }, o.prototype.count = function(e2) {
        var o2 = this;
        return this._read(function(e3) {
          var t2, n2 = o2._ctx, r2 = n2.table.core;
          return St(n2, true) ? r2.count({ trans: e3, query: { index: Ct(n2, r2.schema), range: n2.range } }).then(function(e4) {
            return Math.min(e4, n2.limit);
          }) : (t2 = 0, It(n2, function() {
            return ++t2, false;
          }, e3, r2).then(function() {
            return t2;
          }));
        }).then(e2);
      }, o.prototype.sortBy = function(e2, t2) {
        var n2 = e2.split(".").reverse(), r2 = n2[0], o2 = n2.length - 1;
        function i2(e3, t3) {
          return t3 ? i2(e3[n2[t3]], t3 - 1) : e3[r2];
        }
        var a2 = "next" === this._ctx.dir ? 1 : -1;
        function u2(e3, t3) {
          return j(i2(e3, o2), i2(t3, o2)) * a2;
        }
        return this.toArray(function(e3) {
          return e3.sort(u2);
        }).then(t2);
      }, o.prototype.toArray = function(e2) {
        var i2 = this;
        return this._read(function(e3) {
          var t2, n2, r2, o2 = i2._ctx;
          return "next" === o2.dir && St(o2, true) && 0 < o2.limit ? (t2 = o2.valueMapper, n2 = Ct(o2, o2.table.core.schema), o2.table.core.query({ trans: e3, limit: o2.limit, values: true, query: { index: n2, range: o2.range } }).then(function(e4) {
            e4 = e4.result;
            return t2 ? e4.map(t2) : e4;
          })) : (r2 = [], It(o2, function(e4) {
            return r2.push(e4);
          }, e3, o2.table.core).then(function() {
            return r2;
          }));
        }, e2);
      }, o.prototype.offset = function(t2) {
        var e2 = this._ctx;
        return t2 <= 0 || (e2.offset += t2, St(e2) ? At(e2, function() {
          var n2 = t2;
          return function(e3, t3) {
            return 0 === n2 || (1 === n2 ? --n2 : t3(function() {
              e3.advance(n2), n2 = 0;
            }), false);
          };
        }) : At(e2, function() {
          var e3 = t2;
          return function() {
            return --e3 < 0;
          };
        })), this;
      }, o.prototype.limit = function(e2) {
        return this._ctx.limit = Math.min(this._ctx.limit, e2), At(this._ctx, function() {
          var r2 = e2;
          return function(e3, t2, n2) {
            return --r2 <= 0 && t2(n2), 0 <= r2;
          };
        }, true), this;
      }, o.prototype.until = function(r2, o2) {
        return jt(this._ctx, function(e2, t2, n2) {
          return !r2(e2.value) || (t2(n2), o2);
        }), this;
      }, o.prototype.first = function(e2) {
        return this.limit(1).toArray(function(e3) {
          return e3[0];
        }).then(e2);
      }, o.prototype.last = function(e2) {
        return this.reverse().first(e2);
      }, o.prototype.filter = function(t2) {
        var e2;
        return jt(this._ctx, function(e3) {
          return t2(e3.value);
        }), (e2 = this._ctx).isMatch = yt(e2.isMatch, t2), this;
      }, o.prototype.and = function(e2) {
        return this.filter(e2);
      }, o.prototype.or = function(e2) {
        return new this.db.WhereClause(this._ctx.table, e2, this);
      }, o.prototype.reverse = function() {
        return this._ctx.dir = "prev" === this._ctx.dir ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
      }, o.prototype.desc = function() {
        return this.reverse();
      }, o.prototype.eachKey = function(n2) {
        var e2 = this._ctx;
        return e2.keysOnly = !e2.isMatch, this.each(function(e3, t2) {
          n2(t2.key, t2);
        });
      }, o.prototype.eachUniqueKey = function(e2) {
        return this._ctx.unique = "unique", this.eachKey(e2);
      }, o.prototype.eachPrimaryKey = function(n2) {
        var e2 = this._ctx;
        return e2.keysOnly = !e2.isMatch, this.each(function(e3, t2) {
          n2(t2.primaryKey, t2);
        });
      }, o.prototype.keys = function(e2) {
        var t2 = this._ctx, n2 = (t2.keysOnly = !t2.isMatch, []);
        return this.each(function(e3, t3) {
          n2.push(t3.key);
        }).then(function() {
          return n2;
        }).then(e2);
      }, o.prototype.primaryKeys = function(e2) {
        var n2 = this._ctx;
        if ("next" === n2.dir && St(n2, true) && 0 < n2.limit) return this._read(function(e3) {
          var t2 = Ct(n2, n2.table.core.schema);
          return n2.table.core.query({ trans: e3, values: false, limit: n2.limit, query: { index: t2, range: n2.range } });
        }).then(function(e3) {
          return e3.result;
        }).then(e2);
        n2.keysOnly = !n2.isMatch;
        var r2 = [];
        return this.each(function(e3, t2) {
          r2.push(t2.primaryKey);
        }).then(function() {
          return r2;
        }).then(e2);
      }, o.prototype.uniqueKeys = function(e2) {
        return this._ctx.unique = "unique", this.keys(e2);
      }, o.prototype.firstKey = function(e2) {
        return this.limit(1).keys(function(e3) {
          return e3[0];
        }).then(e2);
      }, o.prototype.lastKey = function(e2) {
        return this.reverse().firstKey(e2);
      }, o.prototype.distinct = function() {
        var n2, e2 = this._ctx, e2 = e2.index && e2.table.schema.idxByName[e2.index];
        return e2 && e2.multi && (n2 = {}, jt(this._ctx, function(e3) {
          var e3 = e3.primaryKey.toString(), t2 = m(n2, e3);
          return n2[e3] = true, !t2;
        })), this;
      }, o.prototype.modify = function(x2) {
        var n2 = this, k2 = this._ctx;
        return this._write(function(p2) {
          function y2(e3, t3) {
            var n3 = t3.failures;
            u2 += e3 - t3.numFailures;
            for (var r2 = 0, o2 = O(n3); r2 < o2.length; r2++) {
              var i2 = o2[r2];
              a2.push(n3[i2]);
            }
          }
          var v2 = "function" == typeof x2 ? x2 : function(e3) {
            return Ot(e3, x2);
          }, m2 = k2.table.core, e2 = m2.schema.primaryKey, b2 = e2.outbound, g2 = e2.extractKey, w2 = 200, e2 = n2.db._options.modifyChunkSize, a2 = (e2 && (w2 = "object" == typeof e2 ? e2[m2.name] || e2["*"] || 200 : e2), []), u2 = 0, t2 = [], _2 = x2 === Bt;
          return n2.clone().primaryKeys().then(function(f2) {
            function h2(s2) {
              var c2 = Math.min(w2, f2.length - s2), l2 = f2.slice(s2, s2 + c2);
              return (_2 ? Promise.resolve([]) : m2.getMany({ trans: p2, keys: l2, cache: "immutable" })).then(function(e3) {
                var n3 = [], t3 = [], r2 = b2 ? [] : null, o2 = _2 ? l2 : [];
                if (!_2) for (var i2 = 0; i2 < c2; ++i2) {
                  var a3 = e3[i2], u3 = { value: ee(a3), primKey: f2[s2 + i2] };
                  false !== v2.call(u3, u3.value, u3) && (null == u3.value ? o2.push(f2[s2 + i2]) : b2 || 0 === j(g2(a3), g2(u3.value)) ? (t3.push(u3.value), b2 && r2.push(f2[s2 + i2])) : (o2.push(f2[s2 + i2]), n3.push(u3.value)));
                }
                return Promise.resolve(0 < n3.length && m2.mutate({ trans: p2, type: "add", values: n3 }).then(function(e4) {
                  for (var t4 in e4.failures) o2.splice(parseInt(t4), 1);
                  y2(n3.length, e4);
                })).then(function() {
                  return (0 < t3.length || d2 && "object" == typeof x2) && m2.mutate({ trans: p2, type: "put", keys: r2, values: t3, criteria: d2, changeSpec: "function" != typeof x2 && x2, isAdditionalChunk: 0 < s2 }).then(function(e4) {
                    return y2(t3.length, e4);
                  });
                }).then(function() {
                  return (0 < o2.length || d2 && _2) && m2.mutate({ trans: p2, type: "delete", keys: o2, criteria: d2, isAdditionalChunk: 0 < s2 }).then(function(e4) {
                    return _t(k2.table, o2, e4);
                  }).then(function(e4) {
                    return y2(o2.length, e4);
                  });
                }).then(function() {
                  return f2.length > s2 + c2 && h2(s2 + w2);
                });
              });
            }
            var d2 = St(k2) && k2.limit === 1 / 0 && ("function" != typeof x2 || _2) && { index: k2.index, range: k2.range };
            return h2(0).then(function() {
              if (0 < a2.length) throw new fe("Error modifying one or more objects", a2, u2, t2);
              return f2.length;
            });
          });
        });
      }, o.prototype.delete = function() {
        var o2 = this._ctx, n2 = o2.range;
        return !St(o2) || o2.table.schema.yProps || !o2.isPrimKey && 3 !== n2.type ? this.modify(Bt) : this._write(function(e2) {
          var t2 = o2.table.core.schema.primaryKey, r2 = n2;
          return o2.table.core.count({ trans: e2, query: { index: t2, range: r2 } }).then(function(n3) {
            return o2.table.core.mutate({ trans: e2, type: "deleteRange", range: r2 }).then(function(e3) {
              var t3 = e3.failures, e3 = e3.numFailures;
              if (e3) throw new fe("Could not delete some values", Object.keys(t3).map(function(e4) {
                return t3[e4];
              }), n3 - e3);
              return n3 - e3;
            });
          });
        });
      };
      var Dt = o;
      function o() {
      }
      var Bt = function(e2, t2) {
        return t2.value = null;
      };
      function Rt(e2, t2) {
        return e2 < t2 ? -1 : e2 === t2 ? 0 : 1;
      }
      function Ft(e2, t2) {
        return t2 < e2 ? -1 : e2 === t2 ? 0 : 1;
      }
      function A(e2, t2, n2) {
        e2 = e2 instanceof Ut ? new e2.Collection(e2) : e2;
        return e2._ctx.error = new (n2 || TypeError)(t2), e2;
      }
      function Mt(e2) {
        return new e2.Collection(e2, function() {
          return Lt("");
        }).limit(0);
      }
      function Nt(e2, s2, n2, r2) {
        var o2, c2, l2, f2, h2, d2, p2, y2 = n2.length;
        if (!n2.every(function(e3) {
          return "string" == typeof e3;
        })) return A(e2, lt);
        function t2(e3) {
          o2 = "next" === e3 ? function(e4) {
            return e4.toUpperCase();
          } : function(e4) {
            return e4.toLowerCase();
          }, c2 = "next" === e3 ? function(e4) {
            return e4.toLowerCase();
          } : function(e4) {
            return e4.toUpperCase();
          }, l2 = "next" === e3 ? Rt : Ft;
          var t3 = n2.map(function(e4) {
            return { lower: c2(e4), upper: o2(e4) };
          }).sort(function(e4, t4) {
            return l2(e4.lower, t4.lower);
          });
          f2 = t3.map(function(e4) {
            return e4.upper;
          }), h2 = t3.map(function(e4) {
            return e4.lower;
          }), p2 = "next" === (d2 = e3) ? "" : r2;
        }
        t2("next");
        var e2 = new e2.Collection(e2, function() {
          return C(f2[0], h2[y2 - 1] + r2);
        }), v2 = (e2._ondirectionchange = function(e3) {
          t2(e3);
        }, 0);
        return e2._addAlgorithm(function(e3, t3, n3) {
          var r3 = e3.key;
          if ("string" == typeof r3) {
            var o3 = c2(r3);
            if (s2(o3, h2, v2)) return true;
            for (var i2 = null, a2 = v2; a2 < y2; ++a2) {
              var u2 = ((e4, t4, n4, r4, o4, i3) => {
                for (var a3 = Math.min(e4.length, r4.length), u3 = -1, s3 = 0; s3 < a3; ++s3) {
                  var c3 = t4[s3];
                  if (c3 !== r4[s3]) return o4(e4[s3], n4[s3]) < 0 ? e4.substr(0, s3) + n4[s3] + n4.substr(s3 + 1) : o4(e4[s3], r4[s3]) < 0 ? e4.substr(0, s3) + r4[s3] + n4.substr(s3 + 1) : 0 <= u3 ? e4.substr(0, u3) + t4[u3] + n4.substr(u3 + 1) : null;
                  o4(e4[s3], c3) < 0 && (u3 = s3);
                }
                return a3 < r4.length && "next" === i3 ? e4 + n4.substr(e4.length) : a3 < e4.length && "prev" === i3 ? e4.substr(0, n4.length) : u3 < 0 ? null : e4.substr(0, u3) + r4[u3] + n4.substr(u3 + 1);
              })(r3, o3, f2[a2], h2[a2], l2, d2);
              null === u2 && null === i2 ? v2 = a2 + 1 : (null === i2 || 0 < l2(i2, u2)) && (i2 = u2);
            }
            t3(null !== i2 ? function() {
              e3.continue(i2 + p2);
            } : n3);
          }
          return false;
        }), e2;
      }
      function C(e2, t2, n2, r2) {
        return { type: 2, lower: e2, upper: t2, lowerOpen: n2, upperOpen: r2 };
      }
      function Lt(e2) {
        return { type: 1, lower: e2, upper: e2 };
      }
      Object.defineProperty(d.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: false, configurable: true }), d.prototype.between = function(e2, t2, n2, r2) {
        n2 = false !== n2, r2 = true === r2;
        try {
          return 0 < this._cmp(e2, t2) || 0 === this._cmp(e2, t2) && (n2 || r2) && (!n2 || !r2) ? Mt(this) : new this.Collection(this, function() {
            return C(e2, t2, !n2, !r2);
          });
        } catch (e3) {
          return A(this, S);
        }
      }, d.prototype.equals = function(e2) {
        return null == e2 ? A(this, S) : new this.Collection(this, function() {
          return Lt(e2);
        });
      }, d.prototype.above = function(e2) {
        return null == e2 ? A(this, S) : new this.Collection(this, function() {
          return C(e2, void 0, true);
        });
      }, d.prototype.aboveOrEqual = function(e2) {
        return null == e2 ? A(this, S) : new this.Collection(this, function() {
          return C(e2, void 0, false);
        });
      }, d.prototype.below = function(e2) {
        return null == e2 ? A(this, S) : new this.Collection(this, function() {
          return C(void 0, e2, false, true);
        });
      }, d.prototype.belowOrEqual = function(e2) {
        return null == e2 ? A(this, S) : new this.Collection(this, function() {
          return C(void 0, e2);
        });
      }, d.prototype.startsWith = function(e2) {
        return "string" != typeof e2 ? A(this, lt) : this.between(e2, e2 + ct, true, true);
      }, d.prototype.startsWithIgnoreCase = function(e2) {
        return "" === e2 ? this.startsWith(e2) : Nt(this, function(e3, t2) {
          return 0 === e3.indexOf(t2[0]);
        }, [e2], ct);
      }, d.prototype.equalsIgnoreCase = function(e2) {
        return Nt(this, function(e3, t2) {
          return e3 === t2[0];
        }, [e2], "");
      }, d.prototype.anyOfIgnoreCase = function() {
        var e2 = n.apply(ae, arguments);
        return 0 === e2.length ? Mt(this) : Nt(this, function(e3, t2) {
          return -1 !== t2.indexOf(e3);
        }, e2, "");
      }, d.prototype.startsWithAnyOfIgnoreCase = function() {
        var e2 = n.apply(ae, arguments);
        return 0 === e2.length ? Mt(this) : Nt(this, function(t2, e3) {
          return e3.some(function(e4) {
            return 0 === t2.indexOf(e4);
          });
        }, e2, ct);
      }, d.prototype.anyOf = function() {
        var e2, o2, t2 = this, i2 = n.apply(ae, arguments), a2 = this._cmp;
        try {
          i2.sort(a2);
        } catch (e3) {
          return A(this, S);
        }
        return 0 === i2.length ? Mt(this) : ((e2 = new this.Collection(this, function() {
          return C(i2[0], i2[i2.length - 1]);
        }))._ondirectionchange = function(e3) {
          a2 = "next" === e3 ? t2._ascending : t2._descending, i2.sort(a2);
        }, o2 = 0, e2._addAlgorithm(function(e3, t3, n2) {
          for (var r2 = e3.key; 0 < a2(r2, i2[o2]); ) if (++o2 === i2.length) return t3(n2), false;
          return 0 === a2(r2, i2[o2]) || (t3(function() {
            e3.continue(i2[o2]);
          }), false);
        }), e2);
      }, d.prototype.notEqual = function(e2) {
        return this.inAnyRange([[-1 / 0, e2], [e2, this.db._maxKey]], { includeLowers: false, includeUppers: false });
      }, d.prototype.noneOf = function() {
        var e2 = n.apply(ae, arguments);
        if (0 === e2.length) return new this.Collection(this);
        try {
          e2.sort(this._ascending);
        } catch (e3) {
          return A(this, S);
        }
        var t2 = e2.reduce(function(e3, t3) {
          return e3 ? e3.concat([[e3[e3.length - 1][1], t3]]) : [[-1 / 0, t3]];
        }, null);
        return t2.push([e2[e2.length - 1], this.db._maxKey]), this.inAnyRange(t2, { includeLowers: false, includeUppers: false });
      }, d.prototype.inAnyRange = function(e2, t2) {
        var i2 = this, a2 = this._cmp, u2 = this._ascending, n2 = this._descending, s2 = this._min, c2 = this._max;
        if (0 === e2.length) return Mt(this);
        if (!e2.every(function(e3) {
          return void 0 !== e3[0] && void 0 !== e3[1] && u2(e3[0], e3[1]) <= 0;
        })) return A(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", k.InvalidArgument);
        var r2 = !t2 || false !== t2.includeLowers, o2 = t2 && true === t2.includeUppers;
        var l2, f2 = u2;
        function h2(e3, t3) {
          return f2(e3[0], t3[0]);
        }
        try {
          (l2 = e2.reduce(function(e3, t3) {
            for (var n3 = 0, r3 = e3.length; n3 < r3; ++n3) {
              var o3 = e3[n3];
              if (a2(t3[0], o3[1]) < 0 && 0 < a2(t3[1], o3[0])) {
                o3[0] = s2(o3[0], t3[0]), o3[1] = c2(o3[1], t3[1]);
                break;
              }
            }
            return n3 === r3 && e3.push(t3), e3;
          }, [])).sort(h2);
        } catch (e3) {
          return A(this, S);
        }
        var d2 = 0, p2 = o2 ? function(e3) {
          return 0 < u2(e3, l2[d2][1]);
        } : function(e3) {
          return 0 <= u2(e3, l2[d2][1]);
        }, y2 = r2 ? function(e3) {
          return 0 < n2(e3, l2[d2][0]);
        } : function(e3) {
          return 0 <= n2(e3, l2[d2][0]);
        };
        var v2 = p2, t2 = new this.Collection(this, function() {
          return C(l2[0][0], l2[l2.length - 1][1], !r2, !o2);
        });
        return t2._ondirectionchange = function(e3) {
          f2 = "next" === e3 ? (v2 = p2, u2) : (v2 = y2, n2), l2.sort(h2);
        }, t2._addAlgorithm(function(e3, t3, n3) {
          for (var r3, o3 = e3.key; v2(o3); ) if (++d2 === l2.length) return t3(n3), false;
          return !p2(r3 = o3) && !y2(r3) || (0 === i2._cmp(o3, l2[d2][1]) || 0 === i2._cmp(o3, l2[d2][0]) || t3(function() {
            f2 === u2 ? e3.continue(l2[d2][0]) : e3.continue(l2[d2][1]);
          }), false);
        }), t2;
      }, d.prototype.startsWithAnyOf = function() {
        var e2 = n.apply(ae, arguments);
        return e2.every(function(e3) {
          return "string" == typeof e3;
        }) ? 0 === e2.length ? Mt(this) : this.inAnyRange(e2.map(function(e3) {
          return [e3, e3 + ct];
        })) : A(this, "startsWithAnyOf() only works with strings");
      };
      var Ut = d;
      function d() {
      }
      function T(t2) {
        return E(function(e2) {
          return Vt(e2), t2(e2.target.error), false;
        });
      }
      function Vt(e2) {
        e2.stopPropagation && e2.stopPropagation(), e2.preventDefault && e2.preventDefault();
      }
      var zt = "storagemutated", Wt = "x-storagemutated-1", Yt = Kt(null, zt), $t = (p.prototype._lock = function() {
        return $(!P.global), ++this._reculock, 1 !== this._reculock || P.global || (P.lockOwnerFor = this), this;
      }, p.prototype._unlock = function() {
        if ($(!P.global), 0 == --this._reculock) for (P.global || (P.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var e2 = this._blockedFuncs.shift();
          try {
            at(e2[1], e2[0]);
          } catch (e3) {
          }
        }
        return this;
      }, p.prototype._locked = function() {
        return this._reculock && P.lockOwnerFor !== this;
      }, p.prototype.create = function(t2) {
        var n2 = this;
        if (this.mode) {
          var e2 = this.db.idbdb, r2 = this.db._state.dbOpenError;
          if ($(!this.idbtrans), !t2 && !e2) switch (r2 && r2.name) {
            case "DatabaseClosedError":
              throw new k.DatabaseClosed(r2);
            case "MissingAPIError":
              throw new k.MissingAPI(r2.message, r2);
            default:
              throw new k.OpenFailed(r2);
          }
          if (!this.active) throw new k.TransactionInactive();
          $(null === this._completion._state), (t2 = this.idbtrans = t2 || (this.db.core || e2).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = E(function(e3) {
            Vt(e3), n2._reject(t2.error);
          }), t2.onabort = E(function(e3) {
            Vt(e3), n2.active && n2._reject(new k.Abort(t2.error)), n2.active = false, n2.on("abort").fire(e3);
          }), t2.oncomplete = E(function() {
            n2.active = false, n2._resolve(), "mutatedParts" in t2 && Yt.storagemutated.fire(t2.mutatedParts);
          });
        }
        return this;
      }, p.prototype._promise = function(n2, r2, o2) {
        var e2, i2 = this;
        return "readwrite" === n2 && "readwrite" !== this.mode ? w(new k.ReadOnly("Transaction is readonly")) : this.active ? this._locked() ? new K(function(e3, t2) {
          i2._blockedFuncs.push([function() {
            i2._promise(n2, r2, o2).then(e3, t2);
          }, P]);
        }) : o2 ? y(function() {
          var e3 = new K(function(e4, t2) {
            i2._lock();
            var n3 = r2(e4, t2, i2);
            n3 && n3.then && n3.then(e4, t2);
          });
          return e3.finally(function() {
            return i2._unlock();
          }), e3._lib = true, e3;
        }) : ((e2 = new K(function(e3, t2) {
          var n3 = r2(e3, t2, i2);
          n3 && n3.then && n3.then(e3, t2);
        }))._lib = true, e2) : w(new k.TransactionInactive());
      }, p.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, p.prototype.waitFor = function(e2) {
        var t2, r2 = this._root(), o2 = K.resolve(e2), i2 = (r2._waitingFor ? r2._waitingFor = r2._waitingFor.then(function() {
          return o2;
        }) : (r2._waitingFor = o2, r2._waitingQueue = [], t2 = r2.idbtrans.objectStore(r2.storeNames[0]), function e3() {
          for (++r2._spinCount; r2._waitingQueue.length; ) r2._waitingQueue.shift()();
          r2._waitingFor && (t2.get(-1 / 0).onsuccess = e3);
        }()), r2._waitingFor);
        return new K(function(t3, n2) {
          o2.then(function(e3) {
            return r2._waitingQueue.push(E(t3.bind(null, e3)));
          }, function(e3) {
            return r2._waitingQueue.push(E(n2.bind(null, e3)));
          }).finally(function() {
            r2._waitingFor === i2 && (r2._waitingFor = null);
          });
        });
      }, p.prototype.abort = function() {
        this.active && (this.active = false, this.idbtrans && this.idbtrans.abort(), this._reject(new k.Abort()));
      }, p.prototype.table = function(e2) {
        var t2 = this._memoizedTables || (this._memoizedTables = {});
        if (m(t2, e2)) return t2[e2];
        var n2 = this.schema[e2];
        if (n2) return (n2 = new this.db.Table(e2, n2, this)).core = this.db.core.table(e2), t2[e2] = n2;
        throw new k.NotFound("Table " + e2 + " not part of transaction");
      }, p);
      function p() {
      }
      function Qt(e2, t2, n2, r2, o2, i2, a2, u2) {
        return { name: e2, keyPath: t2, unique: n2, multi: r2, auto: o2, compound: i2, src: (n2 && !a2 ? "&" : "") + (r2 ? "*" : "") + (o2 ? "++" : "") + Gt(t2), type: u2 };
      }
      function Gt(e2) {
        return "string" == typeof e2 ? e2 : e2 ? "[" + [].join.call(e2, "+") + "]" : "";
      }
      function Xt(e2, t2, n2) {
        return { name: e2, primKey: t2, indexes: n2, mappedClass: null, idxByName: (r2 = function(e3) {
          return [e3.name, e3];
        }, n2.reduce(function(e3, t3, n3) {
          t3 = r2(t3, n3);
          return t3 && (e3[t3[0]] = t3[1]), e3;
        }, {})) };
        var r2;
      }
      var Ht = function(e2) {
        try {
          return e2.only([[]]), Ht = function() {
            return [[]];
          }, [[]];
        } catch (e3) {
          return Ht = function() {
            return ct;
          }, ct;
        }
      };
      function Jt(t2) {
        return null == t2 ? function() {
        } : "string" == typeof t2 ? 1 === (n2 = t2).split(".").length ? function(e2) {
          return e2[n2];
        } : function(e2) {
          return c(e2, n2);
        } : function(e2) {
          return c(e2, t2);
        };
        var n2;
      }
      function Zt(e2) {
        return [].slice.call(e2);
      }
      var en = 0;
      function tn(e2) {
        return null == e2 ? ":id" : "string" == typeof e2 ? e2 : "[".concat(e2.join("+"), "]");
      }
      function nn(e2, o2, t2) {
        function _2(e3) {
          if (3 === e3.type) return null;
          if (4 === e3.type) throw new Error("Cannot convert never type to IDBKeyRange");
          var t3 = e3.lower, n3 = e3.upper, r3 = e3.lowerOpen, e3 = e3.upperOpen;
          return void 0 === t3 ? void 0 === n3 ? null : o2.upperBound(n3, !!e3) : void 0 === n3 ? o2.lowerBound(t3, !!r3) : o2.bound(t3, n3, !!r3, !!e3);
        }
        function n2(e3) {
          var h2, w2 = e3.name;
          return { name: w2, schema: e3, mutate: function(e4) {
            var y2 = e4.trans, v2 = e4.type, m2 = e4.keys, b2 = e4.values, g2 = e4.range;
            return new Promise(function(t3, e5) {
              t3 = E(t3);
              var n3 = y2.objectStore(w2), r3 = null == n3.keyPath, o3 = "put" === v2 || "add" === v2;
              if (!o3 && "delete" !== v2 && "deleteRange" !== v2) throw new Error("Invalid operation type: " + v2);
              var i3, a3 = (m2 || b2 || { length: 1 }).length;
              if (m2 && b2 && m2.length !== b2.length) throw new Error("Given keys array must have same length as given values array.");
              if (0 === a3) return t3({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function u3(e6) {
                ++l2, Vt(e6);
              }
              var s2 = [], c2 = [], l2 = 0;
              if ("deleteRange" === v2) {
                if (4 === g2.type) return t3({ numFailures: l2, failures: c2, results: [], lastResult: void 0 });
                3 === g2.type ? s2.push(i3 = n3.clear()) : s2.push(i3 = n3.delete(_2(g2)));
              } else {
                var r3 = o3 ? r3 ? [b2, m2] : [b2, null] : [m2, null], f2 = r3[0], h3 = r3[1];
                if (o3) for (var d2 = 0; d2 < a3; ++d2) s2.push(i3 = h3 && void 0 !== h3[d2] ? n3[v2](f2[d2], h3[d2]) : n3[v2](f2[d2])), i3.onerror = u3;
                else for (d2 = 0; d2 < a3; ++d2) s2.push(i3 = n3[v2](f2[d2])), i3.onerror = u3;
              }
              function p2(e6) {
                e6 = e6.target.result, s2.forEach(function(e7, t4) {
                  return null != e7.error && (c2[t4] = e7.error);
                }), t3({ numFailures: l2, failures: c2, results: "delete" === v2 ? m2 : s2.map(function(e7) {
                  return e7.result;
                }), lastResult: e6 });
              }
              i3.onerror = function(e6) {
                u3(e6), p2(e6);
              }, i3.onsuccess = p2;
            });
          }, getMany: function(e4) {
            var f2 = e4.trans, h3 = e4.keys;
            return new Promise(function(t3, e5) {
              t3 = E(t3);
              for (var n3, r3 = f2.objectStore(w2), o3 = h3.length, i3 = new Array(o3), a3 = 0, u3 = 0, s2 = function(e6) {
                e6 = e6.target;
                i3[e6._pos] = e6.result, ++u3 === a3 && t3(i3);
              }, c2 = T(e5), l2 = 0; l2 < o3; ++l2) null != h3[l2] && ((n3 = r3.get(h3[l2]))._pos = l2, n3.onsuccess = s2, n3.onerror = c2, ++a3);
              0 === a3 && t3(i3);
            });
          }, get: function(e4) {
            var r3 = e4.trans, o3 = e4.key;
            return new Promise(function(t3, e5) {
              t3 = E(t3);
              var n3 = r3.objectStore(w2).get(o3);
              n3.onsuccess = function(e6) {
                return t3(e6.target.result);
              }, n3.onerror = T(e5);
            });
          }, query: (h2 = a2, function(f2) {
            return new Promise(function(n3, e4) {
              n3 = E(n3);
              var r3, o3, i3, t3 = f2.trans, a3 = f2.values, u3 = f2.limit, s2 = f2.query, c2 = u3 === 1 / 0 ? void 0 : u3, l2 = s2.index, s2 = s2.range, t3 = t3.objectStore(w2), t3 = l2.isPrimaryKey ? t3 : t3.index(l2.name), l2 = _2(s2);
              if (0 === u3) return n3({ result: [] });
              h2 ? ((s2 = a3 ? t3.getAll(l2, c2) : t3.getAllKeys(l2, c2)).onsuccess = function(e5) {
                return n3({ result: e5.target.result });
              }, s2.onerror = T(e4)) : (r3 = 0, o3 = !a3 && "openKeyCursor" in t3 ? t3.openKeyCursor(l2) : t3.openCursor(l2), i3 = [], o3.onsuccess = function(e5) {
                var t4 = o3.result;
                return !t4 || (i3.push(a3 ? t4.value : t4.primaryKey), ++r3 === u3) ? n3({ result: i3 }) : void t4.continue();
              }, o3.onerror = T(e4));
            });
          }), openCursor: function(e4) {
            var c2 = e4.trans, i3 = e4.values, a3 = e4.query, u3 = e4.reverse, l2 = e4.unique;
            return new Promise(function(t3, n3) {
              t3 = E(t3);
              var e5 = a3.index, r3 = a3.range, o3 = c2.objectStore(w2), o3 = e5.isPrimaryKey ? o3 : o3.index(e5.name), e5 = u3 ? l2 ? "prevunique" : "prev" : l2 ? "nextunique" : "next", s2 = !i3 && "openKeyCursor" in o3 ? o3.openKeyCursor(_2(r3), e5) : o3.openCursor(_2(r3), e5);
              s2.onerror = T(n3), s2.onsuccess = E(function(e6) {
                var r4, o4, i4, a4, u4 = s2.result;
                u4 ? (u4.___id = ++en, u4.done = false, r4 = u4.continue.bind(u4), o4 = (o4 = u4.continuePrimaryKey) && o4.bind(u4), i4 = u4.advance.bind(u4), a4 = function() {
                  throw new Error("Cursor not stopped");
                }, u4.trans = c2, u4.stop = u4.continue = u4.continuePrimaryKey = u4.advance = function() {
                  throw new Error("Cursor not started");
                }, u4.fail = E(n3), u4.next = function() {
                  var e7 = this, t4 = 1;
                  return this.start(function() {
                    return t4-- ? e7.continue() : e7.stop();
                  }).then(function() {
                    return e7;
                  });
                }, u4.start = function(e7) {
                  function t4() {
                    if (s2.result) try {
                      e7();
                    } catch (e8) {
                      u4.fail(e8);
                    }
                    else u4.done = true, u4.start = function() {
                      throw new Error("Cursor behind last entry");
                    }, u4.stop();
                  }
                  var n4 = new Promise(function(t5, e8) {
                    t5 = E(t5), s2.onerror = T(e8), u4.fail = e8, u4.stop = function(e9) {
                      u4.stop = u4.continue = u4.continuePrimaryKey = u4.advance = a4, t5(e9);
                    };
                  });
                  return s2.onsuccess = E(function(e8) {
                    s2.onsuccess = t4, t4();
                  }), u4.continue = r4, u4.continuePrimaryKey = o4, u4.advance = i4, t4(), n4;
                }, t3(u4)) : t3(null);
              }, n3);
            });
          }, count: function(e4) {
            var t3 = e4.query, o3 = e4.trans, i3 = t3.index, a3 = t3.range;
            return new Promise(function(t4, e5) {
              var n3 = o3.objectStore(w2), n3 = i3.isPrimaryKey ? n3 : n3.index(i3.name), r3 = _2(a3), r3 = r3 ? n3.count(r3) : n3.count();
              r3.onsuccess = E(function(e6) {
                return t4(e6.target.result);
              }), r3.onerror = T(e5);
            });
          } };
        }
        r2 = t2, i2 = Zt((t2 = e2).objectStoreNames);
        var r2, t2 = { schema: { name: t2.name, tables: i2.map(function(e3) {
          return r2.objectStore(e3);
        }).map(function(t3) {
          var e3 = t3.keyPath, n3 = t3.autoIncrement, r3 = x(e3), o3 = {}, r3 = { name: t3.name, primaryKey: { name: null, isPrimaryKey: true, outbound: null == e3, compound: r3, keyPath: e3, autoIncrement: n3, unique: true, extractKey: Jt(e3) }, indexes: Zt(t3.indexNames).map(function(e4) {
            return t3.index(e4);
          }).map(function(e4) {
            var t4 = e4.name, n4 = e4.unique, r4 = e4.multiEntry, e4 = e4.keyPath, t4 = { name: t4, compound: x(e4), keyPath: e4, unique: n4, multiEntry: r4, extractKey: Jt(e4) };
            return o3[tn(e4)] = t4;
          }), getIndexByKeyPath: function(e4) {
            return o3[tn(e4)];
          } };
          return o3[":id"] = r3.primaryKey, null != e3 && (o3[tn(e3)] = r3.primaryKey), r3;
        }) }, hasGetAll: 0 < i2.length && "getAll" in r2.objectStore(i2[0]) && !("undefined" != typeof navigator && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }, i2 = t2.schema, a2 = t2.hasGetAll, t2 = i2.tables.map(n2), u2 = {};
        return t2.forEach(function(e3) {
          return u2[e3.name] = e3;
        }), { stack: "dbcore", transaction: e2.transaction.bind(e2), table: function(e3) {
          if (u2[e3]) return u2[e3];
          throw new Error("Table '".concat(e3, "' not found"));
        }, MIN_KEY: -1 / 0, MAX_KEY: Ht(o2), schema: i2 };
      }
      function rn(e2, t2, n2, r2) {
        n2 = n2.IDBKeyRange;
        return t2 = nn(t2, n2, r2), { dbcore: e2.dbcore.reduce(function(e3, t3) {
          t3 = t3.create;
          return _(_({}, e3), t3(e3));
        }, t2) };
      }
      function on(n2, e2) {
        var t2 = e2.db, t2 = rn(n2._middlewares, t2, n2._deps, e2);
        n2.core = t2.dbcore, n2.tables.forEach(function(e3) {
          var t3 = e3.name;
          n2.core.schema.tables.some(function(e4) {
            return e4.name === t3;
          }) && (e3.core = n2.core.table(t3), n2[t3] instanceof n2.Table) && (n2[t3].core = e3.core);
        });
      }
      function an(o2, e2, t2, i2) {
        t2.forEach(function(n2) {
          var r2 = i2[n2];
          e2.forEach(function(e3) {
            var t3 = function e4(t4, n3) {
              return V(t4, n3) || (t4 = F(t4)) && e4(t4, n3);
            }(e3, n2);
            (!t3 || "value" in t3 && void 0 === t3.value) && (e3 === o2.Transaction.prototype || e3 instanceof o2.Transaction ? u(e3, n2, { get: function() {
              return this.table(n2);
            }, set: function(e4) {
              L(this, n2, { value: e4, writable: true, configurable: true, enumerable: true });
            } }) : e3[n2] = new o2.Table(n2, r2));
          });
        });
      }
      function un(n2, e2) {
        e2.forEach(function(e3) {
          for (var t2 in e3) e3[t2] instanceof n2.Table && delete e3[t2];
        });
      }
      function sn(e2, t2) {
        return e2._cfg.version - t2._cfg.version;
      }
      function cn(n2, r2, o2, e2) {
        var i2 = n2._dbSchema, a2 = (o2.objectStoreNames.contains("$meta") && !i2.$meta && (i2.$meta = Xt("$meta", mn("")[0], []), n2._storeNames.push("$meta")), n2._createTransaction("readwrite", n2._storeNames, i2)), u2 = (a2.create(o2), a2._completion.catch(e2), a2._reject.bind(a2)), s2 = P.transless || P;
        y(function() {
          if (P.trans = a2, P.transless = s2, 0 !== r2) return on(n2, o2), t2 = r2, ((e3 = a2).storeNames.includes("$meta") ? e3.table("$meta").get("version").then(function(e4) {
            return null != e4 ? e4 : t2;
          }) : K.resolve(t2)).then(function(e4) {
            var s3 = n2, c2 = e4, l2 = a2, f2 = o2, t3 = [], e4 = s3._versions, h2 = s3._dbSchema = yn(0, s3.idbdb, f2);
            return 0 === (e4 = e4.filter(function(e5) {
              return e5._cfg.version >= c2;
            })).length ? K.resolve() : (e4.forEach(function(u3) {
              t3.push(function() {
                var t4, n3, r3, o3 = h2, e5 = u3._cfg.dbschema, i3 = (vn(s3, o3, f2), vn(s3, e5, f2), h2 = s3._dbSchema = e5, fn(o3, e5)), a3 = (i3.add.forEach(function(e6) {
                  hn(f2, e6[0], e6[1].primKey, e6[1].indexes);
                }), i3.change.forEach(function(e6) {
                  if (e6.recreate) throw new k.Upgrade("Not yet support for changing primary key");
                  var t5 = f2.objectStore(e6.name);
                  e6.add.forEach(function(e7) {
                    return pn(t5, e7);
                  }), e6.change.forEach(function(e7) {
                    t5.deleteIndex(e7.name), pn(t5, e7);
                  }), e6.del.forEach(function(e7) {
                    return t5.deleteIndex(e7);
                  });
                }), u3._cfg.contentUpgrade);
                if (a3 && u3._cfg.version > c2) return on(s3, f2), l2._memoizedTables = {}, t4 = G(e5), i3.del.forEach(function(e6) {
                  t4[e6] = o3[e6];
                }), un(s3, [s3.Transaction.prototype]), an(s3, [s3.Transaction.prototype], O(t4), t4), l2.schema = t4, (n3 = ue(a3)) && nt(), e5 = K.follow(function() {
                  var e6;
                  (r3 = a3(l2)) && n3 && (e6 = v.bind(null, null), r3.then(e6, e6));
                }), r3 && "function" == typeof r3.then ? K.resolve(r3) : e5.then(function() {
                  return r3;
                });
              }), t3.push(function(e5) {
                var t4, n3, r3 = u3._cfg.dbschema;
                t4 = r3, n3 = e5, [].slice.call(n3.db.objectStoreNames).forEach(function(e6) {
                  return null == t4[e6] && n3.db.deleteObjectStore(e6);
                }), un(s3, [s3.Transaction.prototype]), an(s3, [s3.Transaction.prototype], s3._storeNames, s3._dbSchema), l2.schema = s3._dbSchema;
              }), t3.push(function(e5) {
                s3.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(s3.idbdb.version / 10) === u3._cfg.version ? (s3.idbdb.deleteObjectStore("$meta"), delete s3._dbSchema.$meta, s3._storeNames = s3._storeNames.filter(function(e6) {
                  return "$meta" !== e6;
                })) : e5.objectStore("$meta").put(u3._cfg.version, "version"));
              });
            }), function e5() {
              return t3.length ? K.resolve(t3.shift()(l2.idbtrans)).then(e5) : K.resolve();
            }().then(function() {
              dn(h2, f2);
            }));
          }).catch(u2);
          var e3, t2;
          O(i2).forEach(function(e4) {
            hn(o2, e4, i2[e4].primKey, i2[e4].indexes);
          }), on(n2, o2), K.follow(function() {
            return n2.on.populate.fire(a2);
          }).catch(u2);
        });
      }
      function ln(e2, r2) {
        dn(e2._dbSchema, r2), r2.db.version % 10 != 0 || r2.objectStoreNames.contains("$meta") || r2.db.createObjectStore("$meta").add(Math.ceil(r2.db.version / 10 - 1), "version");
        var t2 = yn(0, e2.idbdb, r2);
        vn(e2, e2._dbSchema, r2);
        for (var n2 = 0, o2 = fn(t2, e2._dbSchema).change; n2 < o2.length; n2++) {
          var i2 = ((t3) => {
            if (t3.change.length || t3.recreate) return console.warn("Unable to patch indexes of table ".concat(t3.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var n3 = r2.objectStore(t3.name);
            t3.add.forEach(function(e3) {
              l && console.debug("Dexie upgrade patch: Creating missing index ".concat(t3.name, ".").concat(e3.src)), pn(n3, e3);
            });
          })(o2[n2]);
          if ("object" == typeof i2) return i2.value;
        }
      }
      function fn(e2, t2) {
        var n2, r2 = { del: [], add: [], change: [] };
        for (n2 in e2) t2[n2] || r2.del.push(n2);
        for (n2 in t2) {
          var o2 = e2[n2], i2 = t2[n2];
          if (o2) {
            var a2 = { name: n2, def: i2, recreate: false, del: [], add: [], change: [] };
            if ("" + (o2.primKey.keyPath || "") != "" + (i2.primKey.keyPath || "") || o2.primKey.auto !== i2.primKey.auto) a2.recreate = true, r2.change.push(a2);
            else {
              var u2 = o2.idxByName, s2 = i2.idxByName, c2 = void 0;
              for (c2 in u2) s2[c2] || a2.del.push(c2);
              for (c2 in s2) {
                var l2 = u2[c2], f2 = s2[c2];
                l2 ? l2.src !== f2.src && a2.change.push(f2) : a2.add.push(f2);
              }
              (0 < a2.del.length || 0 < a2.add.length || 0 < a2.change.length) && r2.change.push(a2);
            }
          } else r2.add.push([n2, i2]);
        }
        return r2;
      }
      function hn(e2, t2, n2, r2) {
        var o2 = e2.db.createObjectStore(t2, n2.keyPath ? { keyPath: n2.keyPath, autoIncrement: n2.auto } : { autoIncrement: n2.auto });
        r2.forEach(function(e3) {
          return pn(o2, e3);
        });
      }
      function dn(t2, n2) {
        O(t2).forEach(function(e2) {
          n2.db.objectStoreNames.contains(e2) || (l && console.debug("Dexie: Creating missing table", e2), hn(n2, e2, t2[e2].primKey, t2[e2].indexes));
        });
      }
      function pn(e2, t2) {
        e2.createIndex(t2.name, t2.keyPath, { unique: t2.unique, multiEntry: t2.multi });
      }
      function yn(e2, t2, u2) {
        var s2 = {};
        return W(t2.objectStoreNames, 0).forEach(function(e3) {
          for (var t3 = u2.objectStore(e3), n2 = Qt(Gt(a2 = t3.keyPath), a2 || "", true, false, !!t3.autoIncrement, a2 && "string" != typeof a2, true), r2 = [], o2 = 0; o2 < t3.indexNames.length; ++o2) {
            var i2 = t3.index(t3.indexNames[o2]), a2 = i2.keyPath, i2 = Qt(i2.name, a2, !!i2.unique, !!i2.multiEntry, false, a2 && "string" != typeof a2, false);
            r2.push(i2);
          }
          s2[e3] = Xt(e3, n2, r2);
        }), s2;
      }
      function vn(e2, t2, n2) {
        for (var r2 = n2.db.objectStoreNames, o2 = 0; o2 < r2.length; ++o2) {
          var i2 = r2[o2], a2 = n2.objectStore(i2);
          e2._hasGetAll = "getAll" in a2;
          for (var u2 = 0; u2 < a2.indexNames.length; ++u2) {
            var s2, c2 = a2.indexNames[u2], l2 = a2.index(c2).keyPath, l2 = "string" == typeof l2 ? l2 : "[" + W(l2).join("+") + "]";
            t2[i2] && (s2 = t2[i2].idxByName[l2]) && (s2.name = c2, delete t2[i2].idxByName[l2], t2[i2].idxByName[c2] = s2);
          }
        }
        "undefined" != typeof navigator && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && f.WorkerGlobalScope && f instanceof f.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (e2._hasGetAll = false);
      }
      function mn(e2) {
        return e2.split(",").map(function(e3, t2) {
          var n2 = e3.split(":"), r2 = null == (r2 = n2[1]) ? void 0 : r2.trim(), n2 = (e3 = n2[0].trim()).replace(/([&*]|\+\+)/g, ""), o2 = /^\[/.test(n2) ? n2.match(/^\[(.*)\]$/)[1].split("+") : n2;
          return Qt(n2, o2 || null, /\&/.test(e3), /\*/.test(e3), /\+\+/.test(e3), x(o2), 0 === t2, r2);
        });
      }
      gn.prototype._createTableSchema = Xt, gn.prototype._parseIndexSyntax = mn, gn.prototype._parseStoresSpec = function(r2, o2) {
        var i2 = this;
        O(r2).forEach(function(e2) {
          if (null !== r2[e2]) {
            var t2 = i2._parseIndexSyntax(r2[e2]), n2 = t2.shift();
            if (!n2) throw new k.Schema("Invalid schema for table " + e2 + ": " + r2[e2]);
            if (n2.unique = true, n2.multi) throw new k.Schema("Primary key cannot be multiEntry*");
            t2.forEach(function(e3) {
              if (e3.auto) throw new k.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!e3.keyPath) throw new k.Schema("Index must have a name and cannot be an empty string");
            });
            n2 = i2._createTableSchema(e2, n2, t2);
            o2[e2] = n2;
          }
        });
      }, gn.prototype.stores = function(e2) {
        var t2 = this.db, e2 = (this._cfg.storesSource = this._cfg.storesSource ? a(this._cfg.storesSource, e2) : e2, t2._versions), n2 = {}, r2 = {};
        return e2.forEach(function(e3) {
          a(n2, e3._cfg.storesSource), r2 = e3._cfg.dbschema = {}, e3._parseStoresSpec(n2, r2);
        }), t2._dbSchema = r2, un(t2, [t2._allTables, t2, t2.Transaction.prototype]), an(t2, [t2._allTables, t2, t2.Transaction.prototype, this._cfg.tables], O(r2), r2), t2._storeNames = O(r2), this;
      }, gn.prototype.upgrade = function(e2) {
        return this._cfg.contentUpgrade = ke(this._cfg.contentUpgrade || g, e2), this;
      };
      var bn = gn;
      function gn() {
      }
      function wn(e2, t2) {
        var n2 = e2._dbNamesDB;
        return n2 || (n2 = e2._dbNamesDB = new q(ht, { addons: [], indexedDB: e2, IDBKeyRange: t2 })).version(1).stores({ dbnames: "name" }), n2.table("dbnames");
      }
      function _n(e2) {
        return e2 && "function" == typeof e2.databases;
      }
      function xn(e2) {
        return y(function() {
          return P.letThrough = true, e2();
        });
      }
      function kn(e2) {
        return !("from" in e2);
      }
      var I = function(e2, t2) {
        var n2;
        if (!this) return n2 = new I(), e2 && "d" in e2 && a(n2, e2), n2;
        a(this, arguments.length ? { d: 1, from: e2, to: 1 < arguments.length ? t2 : e2 } : { d: 0 });
      };
      function On(e2, t2, n2) {
        var r2 = j(t2, n2);
        if (!isNaN(r2)) {
          if (0 < r2) throw RangeError();
          if (kn(e2)) return a(e2, { from: t2, to: n2, d: 1 });
          var r2 = e2.l, o2 = e2.r;
          if (j(n2, e2.from) < 0) return r2 ? On(r2, t2, n2) : e2.l = { from: t2, to: n2, d: 1, l: null, r: null }, Sn(e2);
          if (0 < j(t2, e2.to)) return o2 ? On(o2, t2, n2) : e2.r = { from: t2, to: n2, d: 1, l: null, r: null }, Sn(e2);
          j(t2, e2.from) < 0 && (e2.from = t2, e2.l = null, e2.d = o2 ? o2.d + 1 : 1), 0 < j(n2, e2.to) && (e2.to = n2, e2.r = null, e2.d = e2.l ? e2.l.d + 1 : 1);
          t2 = !e2.r;
          r2 && !e2.l && Pn(e2, r2), o2 && t2 && Pn(e2, o2);
        }
      }
      function Pn(e2, t2) {
        kn(t2) || function e3(t3, n2) {
          var r2 = n2.from, o2 = n2.l, i2 = n2.r;
          On(t3, r2, n2.to), o2 && e3(t3, o2), i2 && e3(t3, i2);
        }(e2, t2);
      }
      function Kn(e2, t2) {
        var n2 = En(t2), r2 = n2.next();
        if (!r2.done) for (var o2 = r2.value, i2 = En(e2), a2 = i2.next(o2.from), u2 = a2.value; !r2.done && !a2.done; ) {
          if (j(u2.from, o2.to) <= 0 && 0 <= j(u2.to, o2.from)) return true;
          j(o2.from, u2.from) < 0 ? o2 = (r2 = n2.next(u2.from)).value : u2 = (a2 = i2.next(o2.from)).value;
        }
        return false;
      }
      function En(e2) {
        var n2 = kn(e2) ? null : { s: 0, n: e2 };
        return { next: function(e3) {
          for (var t2 = 0 < arguments.length; n2; ) switch (n2.s) {
            case 0:
              if (n2.s = 1, t2) for (; n2.n.l && j(e3, n2.n.from) < 0; ) n2 = { up: n2, n: n2.n.l, s: 1 };
              else for (; n2.n.l; ) n2 = { up: n2, n: n2.n.l, s: 1 };
            case 1:
              if (n2.s = 2, !t2 || j(e3, n2.n.to) <= 0) return { value: n2.n, done: false };
            case 2:
              if (n2.n.r) {
                n2.s = 3, n2 = { up: n2, n: n2.n.r, s: 0 };
                continue;
              }
            case 3:
              n2 = n2.up;
          }
          return { done: true };
        } };
      }
      function Sn(e2) {
        var t2, n2, r2, o2 = ((null == (o2 = e2.r) ? void 0 : o2.d) || 0) - ((null == (o2 = e2.l) ? void 0 : o2.d) || 0), o2 = 1 < o2 ? "r" : o2 < -1 ? "l" : "";
        o2 && (t2 = "r" == o2 ? "l" : "r", n2 = _({}, e2), r2 = e2[o2], e2.from = r2.from, e2.to = r2.to, e2[o2] = r2[o2], n2[o2] = r2[t2], (e2[t2] = n2).d = jn(n2)), e2.d = jn(e2);
      }
      function jn(e2) {
        var t2 = e2.r, e2 = e2.l;
        return (t2 ? e2 ? Math.max(t2.d, e2.d) : t2.d : e2 ? e2.d : 0) + 1;
      }
      function An(t2, n2) {
        return O(n2).forEach(function(e2) {
          t2[e2] ? Pn(t2[e2], n2[e2]) : t2[e2] = function e3(t3) {
            var n3, r2, o2 = {};
            for (n3 in t3) m(t3, n3) && (r2 = t3[n3], o2[n3] = !r2 || "object" != typeof r2 || J.has(r2.constructor) ? r2 : e3(r2));
            return o2;
          }(n2[e2]);
        }), t2;
      }
      function Cn(t2, n2) {
        return t2.all || n2.all || Object.keys(t2).some(function(e2) {
          return n2[e2] && Kn(n2[e2], t2[e2]);
        });
      }
      N(I.prototype, ((t = { add: function(e2) {
        return Pn(this, e2), this;
      }, addKey: function(e2) {
        return On(this, e2, e2), this;
      }, addKeys: function(e2) {
        var t2 = this;
        return e2.forEach(function(e3) {
          return On(t2, e3, e3);
        }), this;
      }, hasKey: function(e2) {
        var t2 = En(this).next(e2).value;
        return t2 && j(t2.from, e2) <= 0 && 0 <= j(t2.to, e2);
      } })[re] = function() {
        return En(this);
      }, t));
      var Tn = {}, In = {}, qn = false;
      function Dn(e2) {
        An(In, e2), qn || (qn = true, setTimeout(function() {
          qn = false, Bn(In, !(In = {}));
        }, 0));
      }
      function Bn(e2, t2) {
        void 0 === t2 && (t2 = false);
        var n2 = /* @__PURE__ */ new Set();
        if (e2.all) for (var r2 = 0, o2 = Object.values(Tn); r2 < o2.length; r2++) Rn(u2 = o2[r2], e2, n2, t2);
        else for (var i2 in e2) {
          var a2, u2, i2 = /^idb\:\/\/(.*)\/(.*)\//.exec(i2);
          i2 && (a2 = i2[1], i2 = i2[2], u2 = Tn["idb://".concat(a2, "/").concat(i2)]) && Rn(u2, e2, n2, t2);
        }
        n2.forEach(function(e3) {
          return e3();
        });
      }
      function Rn(e2, t2, n2, r2) {
        for (var o2 = [], i2 = 0, a2 = Object.entries(e2.queries.query); i2 < a2.length; i2++) {
          for (var u2 = a2[i2], s2 = u2[0], c2 = [], l2 = 0, f2 = u2[1]; l2 < f2.length; l2++) {
            var h2 = f2[l2];
            Cn(t2, h2.obsSet) ? h2.subscribers.forEach(function(e3) {
              return n2.add(e3);
            }) : r2 && c2.push(h2);
          }
          r2 && o2.push([s2, c2]);
        }
        if (r2) for (var d2 = 0, p2 = o2; d2 < p2.length; d2++) {
          var y2 = p2[d2], s2 = y2[0], c2 = y2[1];
          e2.queries.query[s2] = c2;
        }
      }
      function Fn(h2) {
        var d2 = h2._state, r2 = h2._deps.indexedDB;
        if (d2.isBeingOpened || h2.idbdb) return d2.dbReadyPromise.then(function() {
          return d2.dbOpenError ? w(d2.dbOpenError) : h2;
        });
        d2.isBeingOpened = true, d2.dbOpenError = null, d2.openComplete = false;
        var t2 = d2.openCanceller, p2 = Math.round(10 * h2.verno), y2 = false;
        function e2() {
          if (d2.openCanceller !== t2) throw new k.DatabaseClosed("db.open() was cancelled");
        }
        function v2() {
          return new K(function(c2, n3) {
            if (e2(), !r2) throw new k.MissingAPI();
            var l2 = h2.name, f2 = d2.autoSchema || !p2 ? r2.open(l2) : r2.open(l2, p2);
            if (!f2) throw new k.MissingAPI();
            f2.onerror = T(n3), f2.onblocked = E(h2._fireOnBlocked), f2.onupgradeneeded = E(function(e3) {
              var t3;
              m2 = f2.transaction, d2.autoSchema && !h2._options.allowEmptyDB ? (f2.onerror = Vt, m2.abort(), f2.result.close(), (t3 = r2.deleteDatabase(l2)).onsuccess = t3.onerror = E(function() {
                n3(new k.NoSuchDatabase("Database ".concat(l2, " doesnt exist")));
              })) : (m2.onerror = T(n3), t3 = e3.oldVersion > Math.pow(2, 62) ? 0 : e3.oldVersion, b2 = t3 < 1, h2.idbdb = f2.result, y2 && ln(h2, m2), cn(h2, t3 / 10, m2, n3));
            }, n3), f2.onsuccess = E(function() {
              m2 = null;
              var e3, t3, n4, r3, o3, i2, a2 = h2.idbdb = f2.result, u2 = W(a2.objectStoreNames);
              if (0 < u2.length) try {
                var s2 = a2.transaction(1 === (o3 = u2).length ? o3[0] : o3, "readonly");
                if (d2.autoSchema) i2 = a2, r3 = s2, (n4 = h2).verno = i2.version / 10, r3 = n4._dbSchema = yn(0, i2, r3), n4._storeNames = W(i2.objectStoreNames, 0), an(n4, [n4._allTables], O(r3), r3);
                else if (vn(h2, h2._dbSchema, s2), t3 = s2, ((t3 = fn(yn(0, (e3 = h2).idbdb, t3), e3._dbSchema)).add.length || t3.change.some(function(e4) {
                  return e4.add.length || e4.change.length;
                })) && !y2) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), a2.close(), p2 = a2.version + 1, y2 = true, c2(v2());
                on(h2, s2);
              } catch (e4) {
              }
              ft.push(h2), a2.onversionchange = E(function(e4) {
                d2.vcFired = true, h2.on("versionchange").fire(e4);
              }), a2.onclose = E(function() {
                h2.close({ disableAutoOpen: false });
              }), b2 && (u2 = h2._deps, o3 = l2, _n(i2 = u2.indexedDB) || o3 === ht || wn(i2, u2.IDBKeyRange).put({ name: o3 }).catch(g)), c2();
            }, n3);
          }).catch(function(e3) {
            switch (null == e3 ? void 0 : e3.name) {
              case "UnknownError":
                if (0 < d2.PR1398_maxLoop) return d2.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), v2();
                break;
              case "VersionError":
                if (0 < p2) return p2 = 0, v2();
            }
            return K.reject(e3);
          });
        }
        var n2, o2 = d2.dbReadyResolve, m2 = null, b2 = false;
        return K.race([t2, ("undefined" == typeof navigator ? K.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(e3) {
          function t3() {
            return indexedDB.databases().finally(e3);
          }
          n2 = setInterval(t3, 100), t3();
        }).finally(function() {
          return clearInterval(n2);
        }) : Promise.resolve()).then(v2)]).then(function() {
          return e2(), d2.onReadyBeingFired = [], K.resolve(xn(function() {
            return h2.on.ready.fire(h2.vip);
          })).then(function e3() {
            var t3;
            if (0 < d2.onReadyBeingFired.length) return t3 = d2.onReadyBeingFired.reduce(ke, g), d2.onReadyBeingFired = [], K.resolve(xn(function() {
              return t3(h2.vip);
            })).then(e3);
          });
        }).finally(function() {
          d2.openCanceller === t2 && (d2.onReadyBeingFired = null, d2.isBeingOpened = false);
        }).catch(function(e3) {
          d2.dbOpenError = e3;
          try {
            m2 && m2.abort();
          } catch (e4) {
          }
          return t2 === d2.openCanceller && h2._close(), w(e3);
        }).finally(function() {
          d2.openComplete = true, o2();
        }).then(function() {
          var n3;
          return b2 && (n3 = {}, h2.tables.forEach(function(t3) {
            t3.schema.indexes.forEach(function(e3) {
              e3.name && (n3["idb://".concat(h2.name, "/").concat(t3.name, "/").concat(e3.name)] = new I(-1 / 0, [[[]]]));
            }), n3["idb://".concat(h2.name, "/").concat(t3.name, "/")] = n3["idb://".concat(h2.name, "/").concat(t3.name, "/:dels")] = new I(-1 / 0, [[[]]]);
          }), Yt(zt).fire(n3), Bn(n3, true)), h2;
        });
      }
      function Mn(t2) {
        function e2(e3) {
          return t2.next(e3);
        }
        var r2 = n2(e2), o2 = n2(function(e3) {
          return t2.throw(e3);
        });
        function n2(n3) {
          return function(e3) {
            var e3 = n3(e3), t3 = e3.value;
            return e3.done ? t3 : t3 && "function" == typeof t3.then ? t3.then(r2, o2) : x(t3) ? Promise.all(t3).then(r2, o2) : r2(t3);
          };
        }
        return n2(e2)();
      }
      function Nn(e2, t2, n2) {
        for (var r2 = x(e2) ? e2.slice() : [e2], o2 = 0; o2 < n2; ++o2) r2.push(t2);
        return r2;
      }
      var Ln = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(l2) {
        return _(_({}, l2), { table: function(e2) {
          var i2 = l2.table(e2), e2 = i2.schema, u2 = {}, s2 = [];
          function c2(e3, t3, n3) {
            var r3 = tn(e3), o3 = u2[r3] = u2[r3] || [], i3 = null == e3 ? 0 : "string" == typeof e3 ? 1 : e3.length, a3 = 0 < t3, r3 = _(_({}, n3), { name: a3 ? "".concat(r3, "(virtual-from:").concat(n3.name, ")") : n3.name, lowLevelIndex: n3, isVirtual: a3, keyTail: t3, keyLength: i3, extractKey: Jt(e3), unique: !a3 && n3.unique });
            return o3.push(r3), r3.isPrimaryKey || s2.push(r3), 1 < i3 && c2(2 === i3 ? e3[0] : e3.slice(0, i3 - 1), t3 + 1, n3), o3.sort(function(e4, t4) {
              return e4.keyTail - t4.keyTail;
            }), r3;
          }
          var t2 = c2(e2.primaryKey.keyPath, 0, e2.primaryKey);
          u2[":id"] = [t2];
          for (var n2 = 0, r2 = e2.indexes; n2 < r2.length; n2++) {
            var o2 = r2[n2];
            c2(o2.keyPath, 0, o2);
          }
          function a2(e3) {
            var t3, n3 = e3.query.index;
            return n3.isVirtual ? _(_({}, e3), { query: { index: n3.lowLevelIndex, range: (t3 = e3.query.range, n3 = n3.keyTail, { type: 1 === t3.type ? 2 : t3.type, lower: Nn(t3.lower, t3.lowerOpen ? l2.MAX_KEY : l2.MIN_KEY, n3), lowerOpen: true, upper: Nn(t3.upper, t3.upperOpen ? l2.MIN_KEY : l2.MAX_KEY, n3), upperOpen: true }) } }) : e3;
          }
          return _(_({}, i2), { schema: _(_({}, e2), { primaryKey: t2, indexes: s2, getIndexByKeyPath: function(e3) {
            return (e3 = u2[tn(e3)]) && e3[0];
          } }), count: function(e3) {
            return i2.count(a2(e3));
          }, query: function(e3) {
            return i2.query(a2(e3));
          }, openCursor: function(t3) {
            var e3 = t3.query.index, r3 = e3.keyTail, o3 = e3.keyLength;
            return e3.isVirtual ? i2.openCursor(a2(t3)).then(function(e4) {
              return e4 && n3(e4);
            }) : i2.openCursor(t3);
            function n3(n4) {
              return Object.create(n4, { continue: { value: function(e4) {
                null != e4 ? n4.continue(Nn(e4, t3.reverse ? l2.MAX_KEY : l2.MIN_KEY, r3)) : t3.unique ? n4.continue(n4.key.slice(0, o3).concat(t3.reverse ? l2.MIN_KEY : l2.MAX_KEY, r3)) : n4.continue();
              } }, continuePrimaryKey: { value: function(e4, t4) {
                n4.continuePrimaryKey(Nn(e4, l2.MAX_KEY, r3), t4);
              } }, primaryKey: { get: function() {
                return n4.primaryKey;
              } }, key: { get: function() {
                var e4 = n4.key;
                return 1 === o3 ? e4[0] : e4.slice(0, o3);
              } }, value: { get: function() {
                return n4.value;
              } } });
            }
          } });
        } });
      } };
      function Un(o2, i2, a2, u2) {
        return a2 = a2 || {}, u2 = u2 || "", O(o2).forEach(function(e2) {
          var t2, n2, r2;
          m(i2, e2) ? (t2 = o2[e2], n2 = i2[e2], "object" == typeof t2 && "object" == typeof n2 && t2 && n2 ? (r2 = ne(t2)) !== ne(n2) ? a2[u2 + e2] = i2[e2] : "Object" === r2 ? Un(t2, n2, a2, u2 + e2 + ".") : t2 !== n2 && (a2[u2 + e2] = i2[e2]) : t2 !== n2 && (a2[u2 + e2] = i2[e2])) : a2[u2 + e2] = void 0;
        }), O(i2).forEach(function(e2) {
          m(o2, e2) || (a2[u2 + e2] = i2[e2]);
        }), a2;
      }
      function Vn(e2, t2) {
        return "delete" === t2.type ? t2.keys : t2.keys || t2.values.map(e2.extractKey);
      }
      var zn = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(e2) {
        return _(_({}, e2), { table: function(r2) {
          var y2 = e2.table(r2), v2 = y2.schema.primaryKey;
          return _(_({}, y2), { mutate: function(e3) {
            var t2 = P.trans, n2 = t2.table(r2).hook, h2 = n2.deleting, d2 = n2.creating, p2 = n2.updating;
            switch (e3.type) {
              case "add":
                if (d2.fire === g) break;
                return t2._promise("readwrite", function() {
                  return a2(e3);
                }, true);
              case "put":
                if (d2.fire === g && p2.fire === g) break;
                return t2._promise("readwrite", function() {
                  return a2(e3);
                }, true);
              case "delete":
                if (h2.fire === g) break;
                return t2._promise("readwrite", function() {
                  return a2(e3);
                }, true);
              case "deleteRange":
                if (h2.fire === g) break;
                return t2._promise("readwrite", function() {
                  return function n3(r3, o2, i2) {
                    return y2.query({ trans: r3, values: false, query: { index: v2, range: o2 }, limit: i2 }).then(function(e4) {
                      var t3 = e4.result;
                      return a2({ type: "delete", keys: t3, trans: r3 }).then(function(e5) {
                        return 0 < e5.numFailures ? Promise.reject(e5.failures[0]) : t3.length < i2 ? { failures: [], numFailures: 0, lastResult: void 0 } : n3(r3, _(_({}, o2), { lower: t3[t3.length - 1], lowerOpen: true }), i2);
                      });
                    });
                  }(e3.trans, e3.range, 1e4);
                }, true);
            }
            return y2.mutate(e3);
            function a2(c2) {
              var e4, t3, n3, l2 = P.trans, f2 = c2.keys || Vn(v2, c2);
              if (f2) return "delete" !== (c2 = "add" === c2.type || "put" === c2.type ? _(_({}, c2), { keys: f2 }) : _({}, c2)).type && (c2.values = R([], c2.values)), c2.keys && (c2.keys = R([], c2.keys)), e4 = y2, n3 = f2, ("add" === (t3 = c2).type ? Promise.resolve([]) : e4.getMany({ trans: t3.trans, keys: n3, cache: "immutable" })).then(function(u2) {
                var s2 = f2.map(function(e5, t4) {
                  var n4, r3, o2, i2 = u2[t4], a3 = { onerror: null, onsuccess: null };
                  return "delete" === c2.type ? h2.fire.call(a3, e5, i2, l2) : "add" === c2.type || void 0 === i2 ? (n4 = d2.fire.call(a3, e5, c2.values[t4], l2), null == e5 && null != n4 && (c2.keys[t4] = e5 = n4, v2.outbound || b(c2.values[t4], v2.keyPath, e5))) : (n4 = Un(i2, c2.values[t4]), (r3 = p2.fire.call(a3, n4, e5, i2, l2)) && (o2 = c2.values[t4], Object.keys(r3).forEach(function(e6) {
                    m(o2, e6) ? o2[e6] = r3[e6] : b(o2, e6, r3[e6]);
                  }))), a3;
                });
                return y2.mutate(c2).then(function(e5) {
                  for (var t4 = e5.failures, n4 = e5.results, r3 = e5.numFailures, e5 = e5.lastResult, o2 = 0; o2 < f2.length; ++o2) {
                    var i2 = (n4 || f2)[o2], a3 = s2[o2];
                    null == i2 ? a3.onerror && a3.onerror(t4[o2]) : a3.onsuccess && a3.onsuccess("put" === c2.type && u2[o2] ? c2.values[o2] : i2);
                  }
                  return { failures: t4, results: n4, numFailures: r3, lastResult: e5 };
                }).catch(function(t4) {
                  return s2.forEach(function(e5) {
                    return e5.onerror && e5.onerror(t4);
                  }), Promise.reject(t4);
                });
              });
              throw new Error("Keys missing");
            }
          } });
        } });
      } };
      function Wn(e2, t2, n2) {
        try {
          if (!t2) return null;
          if (t2.keys.length < e2.length) return null;
          for (var r2 = [], o2 = 0, i2 = 0; o2 < t2.keys.length && i2 < e2.length; ++o2) 0 === j(t2.keys[o2], e2[i2]) && (r2.push(n2 ? ee(t2.values[o2]) : t2.values[o2]), ++i2);
          return r2.length === e2.length ? r2 : null;
        } catch (e3) {
          return null;
        }
      }
      var Yn = { stack: "dbcore", level: -1, create: function(t2) {
        return { table: function(e2) {
          var n2 = t2.table(e2);
          return _(_({}, n2), { getMany: function(t3) {
            var e3;
            return t3.cache ? (e3 = Wn(t3.keys, t3.trans._cache, "clone" === t3.cache)) ? K.resolve(e3) : n2.getMany(t3).then(function(e4) {
              return t3.trans._cache = { keys: t3.keys, values: "clone" === t3.cache ? ee(e4) : e4 }, e4;
            }) : n2.getMany(t3);
          }, mutate: function(e3) {
            return "add" !== e3.type && (e3.trans._cache = null), n2.mutate(e3);
          } });
        } };
      } };
      function $n(e2, t2) {
        return "readonly" === e2.trans.mode && !!e2.subscr && !e2.trans.explicit && "disabled" !== e2.trans.db._options.cache && !t2.schema.primaryKey.outbound;
      }
      function Qn(e2, t2) {
        switch (e2) {
          case "query":
            return t2.values && !t2.unique;
          case "get":
          case "getMany":
          case "count":
          case "openCursor":
            return false;
        }
      }
      var Gn = { stack: "dbcore", level: 0, name: "Observability", create: function(b2) {
        var g2 = b2.schema.name, w2 = new I(b2.MIN_KEY, b2.MAX_KEY);
        return _(_({}, b2), { transaction: function(e2, t2, n2) {
          if (P.subscr && "readonly" !== t2) throw new k.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(P.querier));
          return b2.transaction(e2, t2, n2);
        }, table: function(d2) {
          function e2(e3) {
            var t3, e3 = e3.query;
            return [t3 = e3.index, new I(null != (t3 = (e3 = e3.range).lower) ? t3 : b2.MIN_KEY, null != (t3 = e3.upper) ? t3 : b2.MAX_KEY)];
          }
          var p2 = b2.table(d2), y2 = p2.schema, v2 = y2.primaryKey, t2 = y2.indexes, c2 = v2.extractKey, l2 = v2.outbound, m2 = v2.autoIncrement && t2.filter(function(e3) {
            return e3.compound && e3.keyPath.includes(v2.keyPath);
          }), n2 = _(_({}, p2), { mutate: function(a2) {
            function u2(e4) {
              return e4 = "idb://".concat(g2, "/").concat(d2, "/").concat(e4), n3[e4] || (n3[e4] = new I());
            }
            var e3, i2, s2, t3 = a2.trans, n3 = a2.mutatedParts || (a2.mutatedParts = {}), r2 = u2(""), o2 = u2(":dels"), c3 = a2.type, l3 = "deleteRange" === a2.type ? [a2.range] : "delete" === a2.type ? [a2.keys] : a2.values.length < 50 ? [Vn(v2, a2).filter(function(e4) {
              return e4;
            }), a2.values] : [], f3 = l3[0], l3 = l3[1], h2 = a2.trans._cache;
            return x(f3) ? (r2.addKeys(f3), (c3 = "delete" === c3 || f3.length === l3.length ? Wn(f3, h2) : null) || o2.addKeys(f3), (c3 || l3) && (e3 = u2, i2 = c3, s2 = l3, y2.indexes.forEach(function(t4) {
              var n4 = e3(t4.name || "");
              function r3(e4) {
                return null != e4 ? t4.extractKey(e4) : null;
              }
              function o3(e4) {
                t4.multiEntry && x(e4) ? e4.forEach(function(e5) {
                  return n4.addKey(e5);
                }) : n4.addKey(e4);
              }
              (i2 || s2).forEach(function(e4, t5) {
                var n5 = i2 && r3(i2[t5]), t5 = s2 && r3(s2[t5]);
                0 !== j(n5, t5) && (null != n5 && o3(n5), null != t5) && o3(t5);
              });
            }))) : f3 ? (l3 = { from: null != (h2 = f3.lower) ? h2 : b2.MIN_KEY, to: null != (c3 = f3.upper) ? c3 : b2.MAX_KEY }, o2.add(l3), r2.add(l3)) : (r2.add(w2), o2.add(w2), y2.indexes.forEach(function(e4) {
              return u2(e4.name).add(w2);
            })), p2.mutate(a2).then(function(i3) {
              return !f3 || "add" !== a2.type && "put" !== a2.type || (r2.addKeys(i3.results), m2 && m2.forEach(function(t4) {
                for (var e4 = a2.values.map(function(e5) {
                  return t4.extractKey(e5);
                }), n4 = t4.keyPath.findIndex(function(e5) {
                  return e5 === v2.keyPath;
                }), r3 = 0, o3 = i3.results.length; r3 < o3; ++r3) e4[r3][n4] = i3.results[r3];
                u2(t4.name).addKeys(e4);
              })), t3.mutatedParts = An(t3.mutatedParts || {}, n3), i3;
            });
          } }), f2 = { get: function(e3) {
            return [v2, new I(e3.key)];
          }, getMany: function(e3) {
            return [v2, new I().addKeys(e3.keys)];
          }, count: e2, query: e2, openCursor: e2 };
          return O(f2).forEach(function(s2) {
            n2[s2] = function(o2) {
              var e3 = P.subscr, t3 = !!e3, n3 = $n(P, p2) && Qn(s2, o2) ? o2.obsSet = {} : e3;
              if (t3) {
                var i2, e3 = function(e4) {
                  e4 = "idb://".concat(g2, "/").concat(d2, "/").concat(e4);
                  return n3[e4] || (n3[e4] = new I());
                }, a2 = e3(""), u2 = e3(":dels"), t3 = f2[s2](o2), r2 = t3[0], t3 = t3[1];
                if (("query" === s2 && r2.isPrimaryKey && !o2.values ? u2 : e3(r2.name || "")).add(t3), !r2.isPrimaryKey) {
                  if ("count" !== s2) return i2 = "query" === s2 && l2 && o2.values && p2.query(_(_({}, o2), { values: false })), p2[s2].apply(this, arguments).then(function(t4) {
                    if ("query" === s2) {
                      if (l2 && o2.values) return i2.then(function(e5) {
                        e5 = e5.result;
                        return a2.addKeys(e5), t4;
                      });
                      var e4 = o2.values ? t4.result.map(c2) : t4.result;
                      (o2.values ? a2 : u2).addKeys(e4);
                    } else {
                      var n4, r3;
                      if ("openCursor" === s2) return r3 = o2.values, (n4 = t4) && Object.create(n4, { key: { get: function() {
                        return u2.addKey(n4.primaryKey), n4.key;
                      } }, primaryKey: { get: function() {
                        var e5 = n4.primaryKey;
                        return u2.addKey(e5), e5;
                      } }, value: { get: function() {
                        return r3 && a2.addKey(n4.primaryKey), n4.value;
                      } } });
                    }
                    return t4;
                  });
                  u2.add(w2);
                }
              }
              return p2[s2].apply(this, arguments);
            };
          }), n2;
        } });
      } };
      function Xn(e2, t2, n2) {
        var r2;
        return 0 === n2.numFailures ? t2 : "deleteRange" === t2.type || (r2 = t2.keys ? t2.keys.length : "values" in t2 && t2.values ? t2.values.length : 1, n2.numFailures === r2) ? null : (r2 = _({}, t2), x(r2.keys) && (r2.keys = r2.keys.filter(function(e3, t3) {
          return !(t3 in n2.failures);
        })), "values" in r2 && x(r2.values) && (r2.values = r2.values.filter(function(e3, t3) {
          return !(t3 in n2.failures);
        })), r2);
      }
      function Hn(e2, t2) {
        return n2 = e2, (void 0 === (r2 = t2).lower || (r2.lowerOpen ? 0 < j(n2, r2.lower) : 0 <= j(n2, r2.lower))) && (n2 = e2, void 0 === (r2 = t2).upper || (r2.upperOpen ? j(n2, r2.upper) < 0 : j(n2, r2.upper) <= 0));
        var n2, r2;
      }
      function Jn(e2, d2, t2, n2, r2, o2) {
        var i2, p2, y2, v2, m2, a2;
        return !t2 || 0 === t2.length || (i2 = d2.query.index, p2 = i2.multiEntry, y2 = d2.query.range, v2 = n2.schema.primaryKey.extractKey, m2 = i2.extractKey, a2 = (i2.lowLevelIndex || i2).extractKey, (n2 = t2.reduce(function(e3, t3) {
          var n3 = e3, r3 = [];
          if ("add" === t3.type || "put" === t3.type) for (var o3 = new I(), i3 = t3.values.length - 1; 0 <= i3; --i3) {
            var a3, u2 = t3.values[i3], s2 = v2(u2);
            !o3.hasKey(s2) && (a3 = m2(u2), p2 && x(a3) ? a3.some(function(e4) {
              return Hn(e4, y2);
            }) : Hn(a3, y2)) && (o3.addKey(s2), r3.push(u2));
          }
          switch (t3.type) {
            case "add":
              var c2 = new I().addKeys(d2.values ? e3.map(function(e4) {
                return v2(e4);
              }) : e3), n3 = e3.concat(d2.values ? r3.filter(function(e4) {
                e4 = v2(e4);
                return !c2.hasKey(e4) && (c2.addKey(e4), true);
              }) : r3.map(function(e4) {
                return v2(e4);
              }).filter(function(e4) {
                return !c2.hasKey(e4) && (c2.addKey(e4), true);
              }));
              break;
            case "put":
              var l2 = new I().addKeys(t3.values.map(function(e4) {
                return v2(e4);
              }));
              n3 = e3.filter(function(e4) {
                return !l2.hasKey(d2.values ? v2(e4) : e4);
              }).concat(d2.values ? r3 : r3.map(function(e4) {
                return v2(e4);
              }));
              break;
            case "delete":
              var f2 = new I().addKeys(t3.keys);
              n3 = e3.filter(function(e4) {
                return !f2.hasKey(d2.values ? v2(e4) : e4);
              });
              break;
            case "deleteRange":
              var h2 = t3.range;
              n3 = e3.filter(function(e4) {
                return !Hn(v2(e4), h2);
              });
          }
          return n3;
        }, e2)) === e2) ? e2 : (n2.sort(function(e3, t3) {
          return j(a2(e3), a2(t3)) || j(v2(e3), v2(t3));
        }), d2.limit && d2.limit < 1 / 0 && (n2.length > d2.limit ? n2.length = d2.limit : e2.length === d2.limit && n2.length < d2.limit && (r2.dirty = true)), o2 ? Object.freeze(n2) : n2);
      }
      function Zn(e2, t2) {
        return 0 === j(e2.lower, t2.lower) && 0 === j(e2.upper, t2.upper) && !!e2.lowerOpen == !!t2.lowerOpen && !!e2.upperOpen == !!t2.upperOpen;
      }
      function er(e2, t2) {
        return ((e3, t3, n2, r2) => {
          if (void 0 === e3) return void 0 !== t3 ? -1 : 0;
          if (void 0 === t3) return 1;
          if (0 === (e3 = j(e3, t3))) {
            if (n2 && r2) return 0;
            if (n2) return 1;
            if (r2) return -1;
          }
          return e3;
        })(e2.lower, t2.lower, e2.lowerOpen, t2.lowerOpen) <= 0 && 0 <= ((e3, t3, n2, r2) => {
          if (void 0 === e3) return void 0 !== t3 ? 1 : 0;
          if (void 0 === t3) return -1;
          if (0 === (e3 = j(e3, t3))) {
            if (n2 && r2) return 0;
            if (n2) return -1;
            if (r2) return 1;
          }
          return e3;
        })(e2.upper, t2.upper, e2.upperOpen, t2.upperOpen);
      }
      function tr(n2, r2, o2, e2) {
        n2.subscribers.add(o2), e2.addEventListener("abort", function() {
          var e3, t2;
          n2.subscribers.delete(o2), 0 === n2.subscribers.size && (e3 = n2, t2 = r2, setTimeout(function() {
            0 === e3.subscribers.size && ie(t2, e3);
          }, 3e3));
        });
      }
      var nr = { stack: "dbcore", level: 0, name: "Cache", create: function(k2) {
        var O2 = k2.schema.name;
        return _(_({}, k2), { transaction: function(g2, w2, e2) {
          var _2, t2, x2 = k2.transaction(g2, w2, e2);
          return "readwrite" === w2 && (e2 = (_2 = new AbortController()).signal, x2.addEventListener("abort", (t2 = function(b2) {
            return function() {
              if (_2.abort(), "readwrite" === w2) {
                for (var t3 = /* @__PURE__ */ new Set(), e3 = 0, n2 = g2; e3 < n2.length; e3++) {
                  var r2 = n2[e3], o2 = Tn["idb://".concat(O2, "/").concat(r2)];
                  if (o2) {
                    var i2 = k2.table(r2), a2 = o2.optimisticOps.filter(function(e4) {
                      return e4.trans === x2;
                    });
                    if (x2._explicit && b2 && x2.mutatedParts) for (var u2 = 0, s2 = Object.values(o2.queries.query); u2 < s2.length; u2++) for (var c2 = 0, l2 = (d2 = s2[u2]).slice(); c2 < l2.length; c2++) Cn((p2 = l2[c2]).obsSet, x2.mutatedParts) && (ie(d2, p2), p2.subscribers.forEach(function(e4) {
                      return t3.add(e4);
                    }));
                    else if (0 < a2.length) {
                      o2.optimisticOps = o2.optimisticOps.filter(function(e4) {
                        return e4.trans !== x2;
                      });
                      for (var f2 = 0, h2 = Object.values(o2.queries.query); f2 < h2.length; f2++) for (var d2, p2, y2, v2 = 0, m2 = (d2 = h2[f2]).slice(); v2 < m2.length; v2++) null != (p2 = m2[v2]).res && x2.mutatedParts && (b2 && !p2.dirty ? (y2 = Object.isFrozen(p2.res), y2 = Jn(p2.res, p2.req, a2, i2, p2, y2), p2.dirty ? (ie(d2, p2), p2.subscribers.forEach(function(e4) {
                        return t3.add(e4);
                      })) : y2 !== p2.res && (p2.res = y2, p2.promise = K.resolve({ result: y2 }))) : (p2.dirty && ie(d2, p2), p2.subscribers.forEach(function(e4) {
                        return t3.add(e4);
                      })));
                    }
                  }
                }
                t3.forEach(function(e4) {
                  return e4();
                });
              }
            };
          })(false), { signal: e2 }), x2.addEventListener("error", t2(false), { signal: e2 }), x2.addEventListener("complete", t2(true), { signal: e2 })), x2;
        }, table: function(s2) {
          var c2 = k2.table(s2), o2 = c2.schema.primaryKey;
          return _(_({}, c2), { mutate: function(t2) {
            var n2, e2 = P.trans;
            return !o2.outbound && "disabled" !== e2.db._options.cache && !e2.explicit && "readwrite" === e2.idbtrans.mode && (n2 = Tn["idb://".concat(O2, "/").concat(s2)]) ? (e2 = c2.mutate(t2), "add" !== t2.type && "put" !== t2.type || !(50 <= t2.values.length || Vn(o2, t2).some(function(e3) {
              return null == e3;
            })) ? (n2.optimisticOps.push(t2), t2.mutatedParts && Dn(t2.mutatedParts), e2.then(function(e3) {
              0 < e3.numFailures && (ie(n2.optimisticOps, t2), (e3 = Xn(0, t2, e3)) && n2.optimisticOps.push(e3), t2.mutatedParts) && Dn(t2.mutatedParts);
            }), e2.catch(function() {
              ie(n2.optimisticOps, t2), t2.mutatedParts && Dn(t2.mutatedParts);
            })) : e2.then(function(r2) {
              var e3 = Xn(0, _(_({}, t2), { values: t2.values.map(function(e4, t3) {
                var n3;
                return r2.failures[t3] ? e4 : (b(n3 = null != (n3 = o2.keyPath) && n3.includes(".") ? ee(e4) : _({}, e4), o2.keyPath, r2.results[t3]), n3);
              }) }), r2);
              n2.optimisticOps.push(e3), queueMicrotask(function() {
                return t2.mutatedParts && Dn(t2.mutatedParts);
              });
            }), e2) : c2.mutate(t2);
          }, query: function(t2) {
            var o3, e2, n2, r2, i2, a2, u2;
            return $n(P, c2) && Qn("query", t2) ? (o3 = "immutable" === (null == (n2 = P.trans) ? void 0 : n2.db._options.cache), e2 = (n2 = P).requery, n2 = n2.signal, a2 = ((e3, t3, n3, r3) => {
              var o4 = Tn["idb://".concat(e3, "/").concat(t3)];
              if (!o4) return [];
              if (!(e3 = o4.queries[n3])) return [null, false, o4, null];
              var i3 = e3[(r3.query ? r3.query.index.name : null) || ""];
              if (!i3) return [null, false, o4, null];
              switch (n3) {
                case "query":
                  var a3 = i3.find(function(e4) {
                    return e4.req.limit === r3.limit && e4.req.values === r3.values && Zn(e4.req.query.range, r3.query.range);
                  });
                  return a3 ? [a3, true, o4, i3] : [i3.find(function(e4) {
                    return ("limit" in e4.req ? e4.req.limit : 1 / 0) >= r3.limit && (!r3.values || e4.req.values) && er(e4.req.query.range, r3.query.range);
                  }), false, o4, i3];
                case "count":
                  a3 = i3.find(function(e4) {
                    return Zn(e4.req.query.range, r3.query.range);
                  });
                  return [a3, !!a3, o4, i3];
              }
            })(O2, s2, "query", t2), u2 = a2[0], r2 = a2[2], i2 = a2[3], u2 && a2[1] ? u2.obsSet = t2.obsSet : (a2 = c2.query(t2).then(function(e3) {
              var t3 = e3.result;
              if (u2 && (u2.res = t3), o3) {
                for (var n3 = 0, r3 = t3.length; n3 < r3; ++n3) Object.freeze(t3[n3]);
                Object.freeze(t3);
              } else e3.result = ee(t3);
              return e3;
            }).catch(function(e3) {
              return i2 && u2 && ie(i2, u2), Promise.reject(e3);
            }), u2 = { obsSet: t2.obsSet, promise: a2, subscribers: /* @__PURE__ */ new Set(), type: "query", req: t2, dirty: false }, i2 ? i2.push(u2) : (i2 = [u2], (r2 = r2 || (Tn["idb://".concat(O2, "/").concat(s2)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[t2.query.index.name || ""] = i2)), tr(u2, i2, e2, n2), u2.promise.then(function(e3) {
              return { result: Jn(e3.result, t2, null == r2 ? void 0 : r2.optimisticOps, c2, u2, o3) };
            })) : c2.query(t2);
          } });
        } });
      } };
      function rr(e2, r2) {
        return new Proxy(e2, { get: function(e3, t2, n2) {
          return "db" === t2 ? r2 : Reflect.get(e3, t2, n2);
        } });
      }
      D.prototype.version = function(t2) {
        if (isNaN(t2) || t2 < 0.1) throw new k.Type("Given version is not a positive number");
        if (t2 = Math.round(10 * t2) / 10, this.idbdb || this._state.isBeingOpened) throw new k.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, t2);
        var e2 = this._versions, n2 = e2.filter(function(e3) {
          return e3._cfg.version === t2;
        })[0];
        return n2 || (n2 = new this.Version(t2), e2.push(n2), e2.sort(sn), n2.stores({}), this._state.autoSchema = false), n2;
      }, D.prototype._whenReady = function(e2) {
        var n2 = this;
        return this.idbdb && (this._state.openComplete || P.letThrough || this._vip) ? e2() : new K(function(e3, t2) {
          if (n2._state.openComplete) return t2(new k.DatabaseClosed(n2._state.dbOpenError));
          if (!n2._state.isBeingOpened) {
            if (!n2._state.autoOpen) return void t2(new k.DatabaseClosed());
            n2.open().catch(g);
          }
          n2._state.dbReadyPromise.then(e3, t2);
        }).then(e2);
      }, D.prototype.use = function(e2) {
        var t2 = e2.stack, n2 = e2.create, r2 = e2.level, e2 = e2.name, o2 = (e2 && this.unuse({ stack: t2, name: e2 }), this._middlewares[t2] || (this._middlewares[t2] = []));
        return o2.push({ stack: t2, create: n2, level: null == r2 ? 10 : r2, name: e2 }), o2.sort(function(e3, t3) {
          return e3.level - t3.level;
        }), this;
      }, D.prototype.unuse = function(e2) {
        var t2 = e2.stack, n2 = e2.name, r2 = e2.create;
        return t2 && this._middlewares[t2] && (this._middlewares[t2] = this._middlewares[t2].filter(function(e3) {
          return r2 ? e3.create !== r2 : !!n2 && e3.name !== n2;
        })), this;
      }, D.prototype.open = function() {
        var e2 = this;
        return at(s, function() {
          return Fn(e2);
        });
      }, D.prototype._close = function() {
        this.on.close.fire(new CustomEvent("close"));
        var n2 = this._state, e2 = ft.indexOf(this);
        if (0 <= e2 && ft.splice(e2, 1), this.idbdb) {
          try {
            this.idbdb.close();
          } catch (e3) {
          }
          this.idbdb = null;
        }
        n2.isBeingOpened || (n2.dbReadyPromise = new K(function(e3) {
          n2.dbReadyResolve = e3;
        }), n2.openCanceller = new K(function(e3, t2) {
          n2.cancelOpen = t2;
        }));
      }, D.prototype.close = function(e2) {
        var e2 = (void 0 === e2 ? { disableAutoOpen: true } : e2).disableAutoOpen, t2 = this._state;
        e2 ? (t2.isBeingOpened && t2.cancelOpen(new k.DatabaseClosed()), this._close(), t2.autoOpen = false, t2.dbOpenError = new k.DatabaseClosed()) : (this._close(), t2.autoOpen = this._options.autoOpen || t2.isBeingOpened, t2.openComplete = false, t2.dbOpenError = null);
      }, D.prototype.delete = function(n2) {
        var o2 = this, i2 = (void 0 === n2 && (n2 = { disableAutoOpen: true }), 0 < arguments.length && "object" != typeof arguments[0]), a2 = this._state;
        return new K(function(r2, t2) {
          function e2() {
            o2.close(n2);
            var e3 = o2._deps.indexedDB.deleteDatabase(o2.name);
            e3.onsuccess = E(function() {
              var e4, t3, n3;
              e4 = o2._deps, t3 = o2.name, _n(n3 = e4.indexedDB) || t3 === ht || wn(n3, e4.IDBKeyRange).delete(t3).catch(g), r2();
            }), e3.onerror = T(t2), e3.onblocked = o2._fireOnBlocked;
          }
          if (i2) throw new k.InvalidArgument("Invalid closeOptions argument to db.delete()");
          a2.isBeingOpened ? a2.dbReadyPromise.then(e2) : e2();
        });
      }, D.prototype.backendDB = function() {
        return this.idbdb;
      }, D.prototype.isOpen = function() {
        return null !== this.idbdb;
      }, D.prototype.hasBeenClosed = function() {
        var e2 = this._state.dbOpenError;
        return e2 && "DatabaseClosed" === e2.name;
      }, D.prototype.hasFailed = function() {
        return null !== this._state.dbOpenError;
      }, D.prototype.dynamicallyOpened = function() {
        return this._state.autoSchema;
      }, Object.defineProperty(D.prototype, "tables", { get: function() {
        var t2 = this;
        return O(this._allTables).map(function(e2) {
          return t2._allTables[e2];
        });
      }, enumerable: false, configurable: true }), D.prototype.transaction = function() {
        var e2 = (function(e3, t2, n2) {
          var r2 = arguments.length;
          if (r2 < 2) throw new k.InvalidArgument("Too few arguments");
          for (var o2 = new Array(r2 - 1); --r2; ) o2[r2 - 1] = arguments[r2];
          return n2 = o2.pop(), [e3, H(o2), n2];
        }).apply(this, arguments);
        return this._transaction.apply(this, e2);
      }, D.prototype._transaction = function(e2, t2, n2) {
        var r2, o2, i2 = this, a2 = P.trans, u2 = (a2 && a2.db === this && -1 === e2.indexOf("!") || (a2 = null), -1 !== e2.indexOf("?"));
        e2 = e2.replace("!", "").replace("?", "");
        try {
          if (o2 = t2.map(function(e3) {
            e3 = e3 instanceof i2.Table ? e3.name : e3;
            if ("string" != typeof e3) throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return e3;
          }), "r" == e2 || e2 === dt) r2 = dt;
          else {
            if ("rw" != e2 && e2 != pt) throw new k.InvalidArgument("Invalid transaction mode: " + e2);
            r2 = pt;
          }
          if (a2) {
            if (a2.mode === dt && r2 === pt) {
              if (!u2) throw new k.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              a2 = null;
            }
            a2 && o2.forEach(function(e3) {
              if (a2 && -1 === a2.storeNames.indexOf(e3)) {
                if (!u2) throw new k.SubTransaction("Table " + e3 + " not included in parent transaction.");
                a2 = null;
              }
            }), u2 && a2 && !a2.active && (a2 = null);
          }
        } catch (n3) {
          return a2 ? a2._promise(null, function(e3, t3) {
            t3(n3);
          }) : w(n3);
        }
        var s2 = (function o3(i3, a3, u3, s3, c2) {
          return K.resolve().then(function() {
            var e3 = P.transless || P, t3 = i3._createTransaction(a3, u3, i3._dbSchema, s3), e3 = (t3.explicit = true, { trans: t3, transless: e3 });
            if (s3) t3.idbtrans = s3.idbtrans;
            else try {
              t3.create(), t3.idbtrans._explicit = true, i3._state.PR1398_maxLoop = 3;
            } catch (e4) {
              return e4.name === de.InvalidState && i3.isOpen() && 0 < --i3._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), i3.close({ disableAutoOpen: false }), i3.open().then(function() {
                return o3(i3, a3, u3, null, c2);
              })) : w(e4);
            }
            var n3, r3 = ue(c2), e3 = (r3 && nt(), K.follow(function() {
              var e4;
              (n3 = c2.call(t3, t3)) && (r3 ? (e4 = v.bind(null, null), n3.then(e4, e4)) : "function" == typeof n3.next && "function" == typeof n3.throw && (n3 = Mn(n3)));
            }, e3));
            return (n3 && "function" == typeof n3.then ? K.resolve(n3).then(function(e4) {
              return t3.active ? e4 : w(new k.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : e3.then(function() {
              return n3;
            })).then(function(e4) {
              return s3 && t3._resolve(), t3._completion.then(function() {
                return e4;
              });
            }).catch(function(e4) {
              return t3._reject(e4), w(e4);
            });
          });
        }).bind(null, this, r2, o2, a2, n2);
        return a2 ? a2._promise(r2, s2, "lock") : P.trans ? at(P.transless, function() {
          return i2._whenReady(s2);
        }) : this._whenReady(s2);
      }, D.prototype.table = function(e2) {
        if (m(this._allTables, e2)) return this._allTables[e2];
        throw new k.InvalidTable("Table ".concat(e2, " does not exist"));
      };
      var q = D;
      function D(e2, t2) {
        var i2, r2, a2, n2, o2, u2 = this, s2 = (this._middlewares = {}, this.verno = 0, D.dependencies), s2 = (this._options = t2 = _({ addons: D.addons, autoOpen: true, indexedDB: s2.indexedDB, IDBKeyRange: s2.IDBKeyRange, cache: "cloned" }, t2), this._deps = { indexedDB: t2.indexedDB, IDBKeyRange: t2.IDBKeyRange }, t2.addons), c2 = (this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this, { dbOpenError: null, isBeingOpened: false, onReadyBeingFired: null, openComplete: false, dbReadyResolve: g, dbReadyPromise: null, cancelOpen: g, openCanceller: null, autoSchema: true, PR1398_maxLoop: 3, autoOpen: t2.autoOpen }), l2 = (c2.dbReadyPromise = new K(function(e3) {
          c2.dbReadyResolve = e3;
        }), c2.openCanceller = new K(function(e3, t3) {
          c2.cancelOpen = t3;
        }), this._state = c2, this.name = e2, this.on = Kt(this, "populate", "blocked", "versionchange", "close", { ready: [ke, g] }), this.once = function(n3, r3) {
          var o3 = function() {
            for (var e3 = [], t3 = 0; t3 < arguments.length; t3++) e3[t3] = arguments[t3];
            u2.on(n3).unsubscribe(o3), r3.apply(u2, e3);
          };
          return u2.on(n3, o3);
        }, this.on.ready.subscribe = Y(this.on.ready.subscribe, function(o3) {
          return function(n3, r3) {
            D.vip(function() {
              var t3, e3 = u2._state;
              e3.openComplete ? (e3.dbOpenError || K.resolve().then(n3), r3 && o3(n3)) : e3.onReadyBeingFired ? (e3.onReadyBeingFired.push(n3), r3 && o3(n3)) : (o3(n3), t3 = u2, r3 || o3(function e4() {
                t3.on.ready.unsubscribe(n3), t3.on.ready.unsubscribe(e4);
              }));
            });
          };
        }), this.Collection = (i2 = this, Et(Dt.prototype, function(e3, t3) {
          this.db = i2;
          var n3 = vt, r3 = null;
          if (t3) try {
            n3 = t3();
          } catch (e4) {
            r3 = e4;
          }
          var t3 = e3._ctx, e3 = t3.table, o3 = e3.hook.reading.fire;
          this._ctx = { table: e3, index: t3.index, isPrimKey: !t3.index || e3.schema.primKey.keyPath && t3.index === e3.schema.primKey.name, range: n3, keysOnly: false, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: true, isMatch: null, offset: 0, limit: 1 / 0, error: r3, or: t3.or, valueMapper: o3 !== ve ? o3 : null };
        })), this.Table = (r2 = this, Et(Pt.prototype, function(e3, t3, n3) {
          this.db = r2, this._tx = n3, this.name = e3, this.schema = t3, this.hook = r2._allTables[e3] ? r2._allTables[e3].hook : Kt(null, { creating: [ge, g], reading: [me, ve], updating: [_e, g], deleting: [we, g] });
        })), this.Transaction = (a2 = this, Et($t.prototype, function(e3, t3, n3, r3, o3) {
          var i3 = this;
          "readonly" !== e3 && t3.forEach(function(e4) {
            e4 = null == (e4 = n3[e4]) ? void 0 : e4.yProps;
            e4 && (t3 = t3.concat(e4.map(function(e5) {
              return e5.updatesTable;
            })));
          }), this.db = a2, this.mode = e3, this.storeNames = t3, this.schema = n3, this.chromeTransactionDurability = r3, this.idbtrans = null, this.on = Kt(this, "complete", "error", "abort"), this.parent = o3 || null, this.active = true, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new K(function(e4, t4) {
            i3._resolve = e4, i3._reject = t4;
          }), this._completion.then(function() {
            i3.active = false, i3.on.complete.fire();
          }, function(e4) {
            var t4 = i3.active;
            return i3.active = false, i3.on.error.fire(e4), i3.parent ? i3.parent._reject(e4) : t4 && i3.idbtrans && i3.idbtrans.abort(), w(e4);
          });
        })), this.Version = (n2 = this, Et(bn.prototype, function(e3) {
          this.db = n2, this._cfg = { version: e3, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (o2 = this, Et(Ut.prototype, function(e3, t3, n3) {
          if (this.db = o2, this._ctx = { table: e3, index: ":id" === t3 ? null : t3, or: n3 }, this._cmp = this._ascending = j, this._descending = function(e4, t4) {
            return j(t4, e4);
          }, this._max = function(e4, t4) {
            return 0 < j(e4, t4) ? e4 : t4;
          }, this._min = function(e4, t4) {
            return j(e4, t4) < 0 ? e4 : t4;
          }, this._IDBKeyRange = o2._deps.IDBKeyRange, !this._IDBKeyRange) throw new k.MissingAPI();
        })), this.on("versionchange", function(e3) {
          0 < e3.newVersion ? console.warn("Another connection wants to upgrade database '".concat(u2.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(u2.name, "'. Closing db now to resume the delete request.")), u2.close({ disableAutoOpen: false });
        }), this.on("blocked", function(e3) {
          !e3.newVersion || e3.newVersion < e3.oldVersion ? console.warn("Dexie.delete('".concat(u2.name, "') was blocked")) : console.warn("Upgrade '".concat(u2.name, "' blocked by other connection holding version ").concat(e3.oldVersion / 10));
        }), this._maxKey = Ht(t2.IDBKeyRange), this._createTransaction = function(e3, t3, n3, r3) {
          return new u2.Transaction(e3, t3, n3, u2._options.chromeTransactionDurability, r3);
        }, this._fireOnBlocked = function(t3) {
          u2.on("blocked").fire(t3), ft.filter(function(e3) {
            return e3.name === u2.name && e3 !== u2 && !e3._state.vcFired;
          }).map(function(e3) {
            return e3.on("versionchange").fire(t3);
          });
        }, this.use(Yn), this.use(nr), this.use(Gn), this.use(Ln), this.use(zn), new Proxy(this, { get: function(e3, t3, n3) {
          var r3;
          return "_vip" === t3 || ("table" === t3 ? function(e4) {
            return rr(u2.table(e4), l2);
          } : (r3 = Reflect.get(e3, t3, n3)) instanceof Pt ? rr(r3, l2) : "tables" === t3 ? r3.map(function(e4) {
            return rr(e4, l2);
          }) : "_createTransaction" === t3 ? function() {
            return rr(r3.apply(this, arguments), l2);
          } : r3);
        } }));
        this.vip = l2, s2.forEach(function(e3) {
          return e3(u2);
        });
      }
      var or, Se = "undefined" != typeof Symbol && "observable" in Symbol ? Symbol.observable : "@@observable", ir = (ar.prototype.subscribe = function(e2, t2, n2) {
        return this._subscribe(e2 && "function" != typeof e2 ? e2 : { next: e2, error: t2, complete: n2 });
      }, ar.prototype[Se] = function() {
        return this;
      }, ar);
      function ar(e2) {
        this._subscribe = e2;
      }
      try {
        or = { indexedDB: f.indexedDB || f.mozIndexedDB || f.webkitIndexedDB || f.msIndexedDB, IDBKeyRange: f.IDBKeyRange || f.webkitIDBKeyRange };
      } catch (e2) {
        or = { indexedDB: null, IDBKeyRange: null };
      }
      function ur(h2) {
        var d2, p2 = false, e2 = new ir(function(r2) {
          var o2 = ue(h2);
          var i2, a2 = false, u2 = {}, s2 = {}, e3 = { get closed() {
            return a2;
          }, unsubscribe: function() {
            a2 || (a2 = true, i2 && i2.abort(), c2 && Yt.storagemutated.unsubscribe(f2));
          } }, c2 = (r2.start && r2.start(e3), false), l2 = function() {
            return st(t2);
          };
          var f2 = function(e4) {
            An(u2, e4), Cn(s2, u2) && l2();
          }, t2 = function() {
            var t3, n2, e4;
            !a2 && or.indexedDB && (u2 = {}, t3 = {}, i2 && i2.abort(), i2 = new AbortController(), e4 = ((e5) => {
              var t4 = $e();
              try {
                o2 && nt();
                var n3 = y(h2, e5);
                return n3 = o2 ? n3.finally(v) : n3;
              } finally {
                t4 && Qe();
              }
            })(n2 = { subscr: t3, signal: i2.signal, requery: l2, querier: h2, trans: null }), Promise.resolve(e4).then(function(e5) {
              p2 = true, d2 = e5, a2 || n2.signal.aborted || (u2 = {}, ((e6) => {
                for (var t4 in e6) if (m(e6, t4)) return;
                return 1;
              })(s2 = t3) || c2 || (Yt(zt, f2), c2 = true), st(function() {
                return !a2 && r2.next && r2.next(e5);
              }));
            }, function(e5) {
              p2 = false, ["DatabaseClosedError", "AbortError"].includes(null == e5 ? void 0 : e5.name) || a2 || st(function() {
                a2 || r2.error && r2.error(e5);
              });
            }));
          };
          return setTimeout(l2, 0), e3;
        });
        return e2.hasValue = function() {
          return p2;
        }, e2.getValue = function() {
          return d2;
        }, e2;
      }
      var sr = q;
      function cr(e2) {
        var t2 = fr;
        try {
          fr = true, Yt.storagemutated.fire(e2), Bn(e2, true);
        } finally {
          fr = t2;
        }
      }
      N(sr, _(_({}, e), { delete: function(e2) {
        return new sr(e2, { addons: [] }).delete();
      }, exists: function(e2) {
        return new sr(e2, { addons: [] }).open().then(function(e3) {
          return e3.close(), true;
        }).catch("NoSuchDatabaseError", function() {
          return false;
        });
      }, getDatabaseNames: function(e2) {
        try {
          return t2 = sr.dependencies, n2 = t2.indexedDB, t2 = t2.IDBKeyRange, (_n(n2) ? Promise.resolve(n2.databases()).then(function(e3) {
            return e3.map(function(e4) {
              return e4.name;
            }).filter(function(e4) {
              return e4 !== ht;
            });
          }) : wn(n2, t2).toCollection().primaryKeys()).then(e2);
        } catch (e3) {
          return w(new k.MissingAPI());
        }
        var t2, n2;
      }, defineClass: function() {
        return function(e2) {
          a(this, e2);
        };
      }, ignoreTransaction: function(e2) {
        return P.trans ? at(P.transless, e2) : e2();
      }, vip: xn, async: function(t2) {
        return function() {
          try {
            var e2 = Mn(t2.apply(this, arguments));
            return e2 && "function" == typeof e2.then ? e2 : K.resolve(e2);
          } catch (e3) {
            return w(e3);
          }
        };
      }, spawn: function(e2, t2, n2) {
        try {
          var r2 = Mn(e2.apply(n2, t2 || []));
          return r2 && "function" == typeof r2.then ? r2 : K.resolve(r2);
        } catch (e3) {
          return w(e3);
        }
      }, currentTransaction: { get: function() {
        return P.trans || null;
      } }, waitFor: function(e2, t2) {
        e2 = K.resolve("function" == typeof e2 ? sr.ignoreTransaction(e2) : e2).timeout(t2 || 6e4);
        return P.trans ? P.trans.waitFor(e2) : e2;
      }, Promise: K, debug: { get: function() {
        return l;
      }, set: function(e2) {
        Oe(e2);
      } }, derive: U, extend: a, props: N, override: Y, Events: Kt, on: Yt, liveQuery: ur, extendObservabilitySet: An, getByKeyPath: c, setByKeyPath: b, delByKeyPath: function(t2, e2) {
        "string" == typeof e2 ? b(t2, e2, void 0) : "length" in e2 && [].map.call(e2, function(e3) {
          b(t2, e3, void 0);
        });
      }, shallowClone: G, deepClone: ee, getObjectDiff: Un, cmp: j, asap: Q, minKey: -1 / 0, addons: [], connections: ft, errnames: de, dependencies: or, cache: Tn, semVer: "4.3.0", version: "4.3.0".split(".").map(function(e2) {
        return parseInt(e2);
      }).reduce(function(e2, t2, n2) {
        return e2 + t2 / Math.pow(10, 2 * n2);
      }) })), sr.maxKey = Ht(sr.dependencies.IDBKeyRange), "undefined" != typeof dispatchEvent && "undefined" != typeof addEventListener && (Yt(zt, function(e2) {
        fr || (e2 = new CustomEvent(Wt, { detail: e2 }), fr = true, dispatchEvent(e2), fr = false);
      }), addEventListener(Wt, function(e2) {
        e2 = e2.detail;
        fr || cr(e2);
      }));
      var lr, fr = false, hr = function() {
      };
      return "undefined" != typeof BroadcastChannel && ((hr = function() {
        (lr = new BroadcastChannel(Wt)).onmessage = function(e2) {
          return e2.data && cr(e2.data);
        };
      })(), "function" == typeof lr.unref && lr.unref(), Yt(zt, function(e2) {
        fr || lr.postMessage(e2);
      })), "undefined" != typeof addEventListener && (addEventListener("pagehide", function(e2) {
        if (!q.disableBfCache && e2.persisted) {
          l && console.debug("Dexie: handling persisted pagehide"), null != lr && lr.close();
          for (var t2 = 0, n2 = ft; t2 < n2.length; t2++) n2[t2].close({ disableAutoOpen: false });
        }
      }), addEventListener("pageshow", function(e2) {
        !q.disableBfCache && e2.persisted && (l && console.debug("Dexie: handling persisted pageshow"), hr(), cr({ all: new I(-1 / 0, [[]]) }));
      })), K.rejectionMapper = function(e2, t2) {
        return !e2 || e2 instanceof ce || e2 instanceof TypeError || e2 instanceof SyntaxError || !e2.name || !ye[e2.name] ? e2 : (t2 = new ye[e2.name](t2 || e2.message, e2), "stack" in e2 && u(t2, "stack", { get: function() {
          return this.inner.stack;
        } }), t2);
      }, Oe(l), _(q, Object.freeze({ __proto__: null, Dexie: q, Entity: bt, PropModification: xt, RangeSet: I, add: function(e2) {
        return new xt({ add: e2 });
      }, cmp: j, default: q, liveQuery: ur, mergeRanges: Pn, rangesOverlap: Kn, remove: function(e2) {
        return new xt({ remove: e2 });
      }, replacePrefix: function(e2, t2) {
        return new xt({ replacePrefix: [e2, t2] });
      } }), { default: q }), q;
    });
  })(dexie_min);
  var dexie_minExports = dexie_min.exports;
  const _Dexie = /* @__PURE__ */ getDefaultExportFromCjs(dexie_minExports);
  const DexieSymbol = Symbol.for("Dexie");
  const Dexie = globalThis[DexieSymbol] || (globalThis[DexieSymbol] = _Dexie);
  if (_Dexie.semVer !== Dexie.semVer) {
    throw new Error(`Two different versions of Dexie loaded in the same app: ${_Dexie.semVer} and ${Dexie.semVer}`);
  }
  const {
    liveQuery,
    mergeRanges,
    rangesOverlap,
    RangeSet,
    cmp,
    Entity,
    PropModification,
    replacePrefix,
    add,
    remove,
    DexieYProvider
  } = Dexie;
  const SHIP_DATA = [
    { id: 202, category: "ships", name: "Small Cargo", icon: "icons/ships/small-cargo-large.jpg", metadata: { cost: { metal: 2e3, crystal: 2e3, deuterium: 0 } } },
    { id: 203, category: "ships", name: "Large Cargo", icon: "icons/ships/large-cargo-large.jpg", metadata: { cost: { metal: 6e3, crystal: 6e3, deuterium: 0 } } },
    { id: 204, category: "ships", name: "Light Fighter", icon: "icons/ships/light-fighter-large.jpg", metadata: { cost: { metal: 3e3, crystal: 1e3, deuterium: 0 } } },
    { id: 205, category: "ships", name: "Heavy Fighter", icon: "icons/ships/heavy-fighter-large.jpg", metadata: { cost: { metal: 6e3, crystal: 4e3, deuterium: 0 } } },
    { id: 206, category: "ships", name: "Cruiser", icon: "icons/ships/cruiser-large.jpg", metadata: { cost: { metal: 2e4, crystal: 7e3, deuterium: 2e3 } } },
    { id: 207, category: "ships", name: "Battleship", icon: "icons/ships/battleship-large.jpg", metadata: { cost: { metal: 45e3, crystal: 15e3, deuterium: 0 } } },
    { id: 208, category: "ships", name: "Colony Ship", icon: "icons/ships/colony-ship-large.jpg", metadata: { cost: { metal: 1e4, crystal: 2e4, deuterium: 1e4 } } },
    { id: 209, category: "ships", name: "Recycler", icon: "icons/ships/recycler-large.jpg", metadata: { cost: { metal: 1e4, crystal: 6e3, deuterium: 2e3 } } },
    { id: 210, category: "ships", name: "Espionage Probe", icon: "icons/ships/espionage-probe-large.jpg", metadata: { cost: { metal: 0, crystal: 1e3, deuterium: 0 } } },
    { id: 211, category: "ships", name: "Bomber", icon: "icons/ships/bomber-large.jpg", metadata: { cost: { metal: 5e4, crystal: 25e3, deuterium: 15e3 } } },
    { id: 212, category: "ships", name: "Solar Satellite", icon: "icons/ships/solar-satellite-large.jpg", metadata: { cost: { metal: 0, crystal: 2e3, deuterium: 500 } } },
    { id: 213, category: "ships", name: "Destroyer", icon: "icons/ships/destroyer-large.jpg", metadata: { cost: { metal: 6e4, crystal: 5e4, deuterium: 15e3 } } },
    { id: 214, category: "ships", name: "Deathstar", icon: "icons/ships/deathstar-large.jpg", metadata: { cost: { metal: 5e6, crystal: 4e6, deuterium: 1e6 } } },
    { id: 215, category: "ships", name: "Battlecruiser", icon: "icons/ships/battlecruiser-large.jpg", metadata: { cost: { metal: 3e4, crystal: 4e4, deuterium: 15e3 } } },
    { id: 217, category: "ships", name: "Crawler", icon: "icons/ships/crawler-large.jpg", metadata: { cost: { metal: 2e3, crystal: 2e3, deuterium: 1e3 } } },
    { id: 218, category: "ships", name: "Reaper", icon: "icons/ships/reaper-large.jpg", metadata: { cost: { metal: 85e3, crystal: 55e3, deuterium: 2e4 } } },
    { id: 219, category: "ships", name: "Pathfinder", icon: "icons/ships/pathfinder-large.jpg", metadata: { cost: { metal: 8e3, crystal: 15e3, deuterium: 8e3 } } }
  ];
  const LIFEFORM_SPECIES_DATA = [
    { lifeformId: 1, lifeformName: "Humans", lifeformLevel: 0, lifeformXP: 0, iconPath: "icons/lifeforms/humans-icon-large.jpg" },
    { lifeformId: 2, lifeformName: "Rock’tal", lifeformLevel: 0, lifeformXP: 0, iconPath: "icons/lifeforms/rocktal-icon-large.jpg" },
    { lifeformId: 3, lifeformName: "Mechas", lifeformLevel: 0, lifeformXP: 0, iconPath: "icons/lifeforms/mechas-icon-large.jpg" },
    { lifeformId: 4, lifeformName: "Kaelesh", lifeformLevel: 0, lifeformXP: 0, iconPath: "icons/lifeforms/kaelesh-icon-large.jpg" }
  ];
  const RESEARCH_DATA = [
    { id: 113, category: "research", name: "Energy Technology", icon: "" },
    { id: 120, category: "research", name: "Laser Technology", icon: "" },
    { id: 121, category: "research", name: "Ion Technology", icon: "" },
    { id: 114, category: "research", name: "Hyperspace Technology", icon: "" },
    { id: 122, category: "research", name: "Plasma Technology", icon: "" },
    { id: 115, category: "research", name: "Combustion Drive", icon: "" },
    { id: 117, category: "research", name: "Impulse Drive", icon: "" },
    { id: 118, category: "research", name: "Hyperspace Drive", icon: "" },
    { id: 106, category: "research", name: "Espionage Technology", icon: "" },
    { id: 108, category: "research", name: "Computer Technology", icon: "" },
    { id: 124, category: "research", name: "Astrophysics", icon: "" },
    { id: 123, category: "research", name: "Intergalactic Research Network", icon: "" },
    { id: 199, category: "research", name: "Graviton Technology", icon: "" },
    { id: 109, category: "research", name: "Weapons Technology", icon: "" },
    { id: 110, category: "research", name: "Shielding Technology", icon: "" },
    { id: 111, category: "research", name: "Armour Technology", icon: "" }
  ];
  const DEFENCE_DATA = [
    { id: 401, category: "defence", name: "Rocket Launcher", icon: "" },
    { id: 402, category: "defence", name: "Light Laser", icon: "" },
    { id: 403, category: "defence", name: "Heavy Laser", icon: "" },
    { id: 404, category: "defence", name: "Gauss Cannon", icon: "" },
    { id: 405, category: "defence", name: "Ion Cannon", icon: "" },
    { id: 406, category: "defence", name: "Plasma Turret", icon: "" },
    { id: 407, category: "defence", name: "Small Shield Dome", icon: "" },
    { id: 408, category: "defence", name: "Large Shield Dome", icon: "" },
    { id: 502, category: "defence", name: "Anti-Ballistic Missiles", icon: "" },
    { id: 503, category: "defence", name: "Interplanetary Missiles", icon: "" }
  ];
  const BUILDING_DATA = [
    { id: 1, category: "buildings", name: "Metal Mine", icon: "" },
    { id: 2, category: "buildings", name: "Crystal Mine", icon: "" },
    { id: 3, category: "buildings", name: "Deuterium Synthesizer", icon: "" },
    { id: 4, category: "buildings", name: "Solar Plant", icon: "" },
    { id: 12, category: "buildings", name: "Fusion Reactor", icon: "" },
    { id: 14, category: "buildings", name: "Robotics Factory", icon: "" },
    { id: 15, category: "buildings", name: "Nanite Factory", icon: "" },
    { id: 21, category: "buildings", name: "Shipyard", icon: "" },
    { id: 22, category: "buildings", name: "Metal Storage", icon: "" },
    { id: 23, category: "buildings", name: "Crystal Storage", icon: "" },
    { id: 24, category: "buildings", name: "Deuterium Tank", icon: "" },
    { id: 31, category: "buildings", name: "Research Lab", icon: "" },
    { id: 33, category: "buildings", name: "Terraformer", icon: "" },
    { id: 34, category: "buildings", name: "Alliance Depot", icon: "" },
    { id: 36, category: "buildings", name: "Space Dock", icon: "" },
    { id: 41, category: "buildings", name: "Lunar Base", icon: "" },
    { id: 42, category: "buildings", name: "Sensor Phalanx", icon: "" },
    { id: 43, category: "buildings", name: "Jump Gate", icon: "" },
    { id: 44, category: "buildings", name: "Missile Silo", icon: "" }
  ];
  const LIFEFORM_RESEARCH_DATA = [
    // Humans Research
    { id: 11201, category: "lifeformResearch", name: "Intergalactic Envoys", icon: "" },
    { id: 11202, category: "lifeformResearch", name: "High-Performance Extractors", icon: "" },
    { id: 11203, category: "lifeformResearch", name: "Fusion Drives", icon: "" },
    { id: 11204, category: "lifeformResearch", name: "Stealth Field Generator", icon: "" },
    { id: 11205, category: "lifeformResearch", name: "Orbital Den", icon: "" },
    { id: 11206, category: "lifeformResearch", name: "Research AI", icon: "" },
    { id: 11207, category: "lifeformResearch", name: "High-Performance Terraformer", icon: "" },
    { id: 11208, category: "lifeformResearch", name: "Enhanced Production Technologies", icon: "" },
    { id: 11209, category: "lifeformResearch", name: "Light Fighter Mk II", icon: "" },
    { id: 11210, category: "lifeformResearch", name: "Cruiser Mk II", icon: "" },
    { id: 11211, category: "lifeformResearch", name: "Improved Lab Technology", icon: "" },
    { id: 11212, category: "lifeformResearch", name: "Plasma Terraformer", icon: "" },
    { id: 11213, category: "lifeformResearch", name: "Low-Temperature Drives", icon: "" },
    { id: 11214, category: "lifeformResearch", name: "Bomber Mk II", icon: "" },
    { id: 11215, category: "lifeformResearch", name: "Destroyer Mk II", icon: "" },
    { id: 11216, category: "lifeformResearch", name: "Battlecruiser Mk II", icon: "" },
    { id: 11217, category: "lifeformResearch", name: "Robot Assistants", icon: "" },
    { id: 11218, category: "lifeformResearch", name: "Supercomputer", icon: "" },
    // Rock’tal Research
    { id: 12201, category: "lifeformResearch", name: "Volcanic Batteries", icon: "" },
    { id: 12202, category: "lifeformResearch", name: "Acoustic Scanning", icon: "" },
    { id: 12203, category: "lifeformResearch", name: "High Energy Pump Systems", icon: "" },
    { id: 12204, category: "lifeformResearch", name: "Cargo Hold Expansion (Civilian Ships)", icon: "" },
    { id: 12205, category: "lifeformResearch", name: "Magma-Powered Production", icon: "" },
    { id: 12206, category: "lifeformResearch", name: "Geothermal Power Plants", icon: "" },
    { id: 12207, category: "lifeformResearch", name: "Depth Sounding", icon: "" },
    { id: 12208, category: "lifeformResearch", name: "Ion Crystal Enhancement (Heavy Fighter)", icon: "" },
    { id: 12209, category: "lifeformResearch", name: "Improved Stellarator", icon: "" },
    { id: 12210, category: "lifeformResearch", name: "Hardened Diamond Drill Heads", icon: "" },
    { id: 12211, category: "lifeformResearch", name: "Seismic Mining Technology", icon: "" },
    { id: 12212, category: "lifeformResearch", name: "Magma-Powered Pump Systems", icon: "" },
    { id: 12213, category: "lifeformResearch", name: "Ion Crystal Modules", icon: "" },
    { id: 12214, category: "lifeformResearch", name: "Optimised Silo Construction Method", icon: "" },
    { id: 12215, category: "lifeformResearch", name: "Diamond Energy Transmitter", icon: "" },
    { id: 12216, category: "lifeformResearch", name: "Obsidian Shield Reinforcement", icon: "" },
    { id: 12217, category: "lifeformResearch", name: "Rune Shields", icon: "" },
    { id: 12218, category: "lifeformResearch", name: "Rock’tal Collector Enhancement", icon: "" },
    // Mechas Research
    { id: 13201, category: "lifeformResearch", name: "Catalyser Technology", icon: "" },
    { id: 13202, category: "lifeformResearch", name: "Plasma Drive", icon: "" },
    { id: 13203, category: "lifeformResearch", name: "Efficiency Module", icon: "" },
    { id: 13204, category: "lifeformResearch", name: "Depot AI", icon: "" },
    { id: 13205, category: "lifeformResearch", name: "General Overhaul (Light Fighter)", icon: "" },
    { id: 13206, category: "lifeformResearch", name: "Automated Transport Lines", icon: "" },
    { id: 13207, category: "lifeformResearch", name: "Improved Drone AI", icon: "" },
    { id: 13208, category: "lifeformResearch", name: "Experimental Recycling Technology", icon: "" },
    { id: 13209, category: "lifeformResearch", name: "General Overhaul (Cruiser)", icon: "" },
    { id: 13210, category: "lifeformResearch", name: "Slingshot Autopilot", icon: "" },
    { id: 13211, category: "lifeformResearch", name: "High-Temperature Superconductors", icon: "" },
    { id: 13212, category: "lifeformResearch", name: "General Overhaul (Battleship)", icon: "" },
    { id: 13213, category: "lifeformResearch", name: "Artificial Swarm Intelligence", icon: "" },
    { id: 13214, category: "lifeformResearch", name: "General Overhaul (Battlecruiser)", icon: "" },
    { id: 13215, category: "lifeformResearch", name: "General Overhaul (Bomber)", icon: "" },
    { id: 13216, category: "lifeformResearch", name: "General Overhaul (Destroyer)", icon: "" },
    { id: 13217, category: "lifeformResearch", name: "Experimental Weapons Technology", icon: "" },
    { id: 13218, category: "lifeformResearch", name: "Mechan General Enhancement", icon: "" },
    // Kaelesh Research
    { id: 14201, category: "lifeformResearch", name: "Heat Recovery", icon: "" },
    { id: 14202, category: "lifeformResearch", name: "Sulphide Process", icon: "" },
    { id: 14203, category: "lifeformResearch", name: "Psionic Network", icon: "" },
    { id: 14204, category: "lifeformResearch", name: "Telekinetic Tractor Beam", icon: "" },
    { id: 14205, category: "lifeformResearch", name: "Enhanced Sensor Technology", icon: "" },
    { id: 14206, category: "lifeformResearch", name: "Neuromodal Compressor", icon: "" },
    { id: 14207, category: "lifeformResearch", name: "Neuro-Interface", icon: "" },
    { id: 14208, category: "lifeformResearch", name: "Interplanetary Analysis Network", icon: "" },
    { id: 14209, category: "lifeformResearch", name: "Overclocking (Heavy Fighter)", icon: "" },
    { id: 14210, category: "lifeformResearch", name: "Telekinetic Drive", icon: "" },
    { id: 14211, category: "lifeformResearch", name: "Sixth Sense", icon: "" },
    { id: 14212, category: "lifeformResearch", name: "Psychoharmoniser", icon: "" },
    { id: 14213, category: "lifeformResearch", name: "Efficient Swarm Intelligence", icon: "" },
    { id: 14214, category: "lifeformResearch", name: "Overclocking (Large Cargo)", icon: "" },
    { id: 14215, category: "lifeformResearch", name: "Gravitation Sensors", icon: "" },
    { id: 14216, category: "lifeformResearch", name: "Overclocking (Battleship)", icon: "" },
    { id: 14217, category: "lifeformResearch", name: "Psionic Shield Matrix", icon: "" },
    { id: 14218, category: "lifeformResearch", name: "Kaelesh Discoverer Enhancement", icon: "" }
  ];
  const LIFEFORM_BUILDING_DATA = [
    // Humans Buildings
    { id: 11101, category: "lifeformBuildings", name: "Residential Sector", icon: "" },
    { id: 11102, category: "lifeformBuildings", name: "Biosphere Farm", icon: "" },
    { id: 11103, category: "lifeformBuildings", name: "Research Centre", icon: "" },
    { id: 11104, category: "lifeformBuildings", name: "Academy of Sciences", icon: "" },
    { id: 11105, category: "lifeformBuildings", name: "Neuro-Calibration Centre", icon: "" },
    { id: 11106, category: "lifeformBuildings", name: "High Energy Smelting", icon: "" },
    { id: 11107, category: "lifeformBuildings", name: "Food Silo", icon: "" },
    { id: 11108, category: "lifeformBuildings", name: "Fusion-Powered Production", icon: "" },
    { id: 11109, category: "lifeformBuildings", name: "Skyscraper", icon: "" },
    { id: 11110, category: "lifeformBuildings", name: "Biotech Lab", icon: "" },
    { id: 11111, category: "lifeformBuildings", name: "Metropolis", icon: "" },
    { id: 11112, category: "lifeformBuildings", name: "Planetary Shield", icon: "" },
    // Rock’tal Buildings
    { id: 12101, category: "lifeformBuildings", name: "Meditation Enclave", icon: "" },
    { id: 12102, category: "lifeformBuildings", name: "Crystal Farm", icon: "" },
    { id: 12103, category: "lifeformBuildings", name: "Rune Technologium", icon: "" },
    { id: 12104, category: "lifeformBuildings", name: "Rune Forge", icon: "" },
    { id: 12105, category: "lifeformBuildings", name: "Oriktorium", icon: "" },
    { id: 12106, category: "lifeformBuildings", name: "Magma Forge", icon: "" },
    { id: 12107, category: "lifeformBuildings", name: "Disruption Chamber", icon: "" },
    { id: 12108, category: "lifeformBuildings", name: "Megalith", icon: "" },
    { id: 12109, category: "lifeformBuildings", name: "Crystal Refinery", icon: "" },
    { id: 12110, category: "lifeformBuildings", name: "Deuterium Synthesiser", icon: "" },
    { id: 12111, category: "lifeformBuildings", name: "Mineral Research Centre", icon: "" },
    { id: 12112, category: "lifeformBuildings", name: "Advanced Recycling Plant", icon: "" },
    // Mechas Buildings
    { id: 13101, category: "lifeformBuildings", name: "Assembly Line", icon: "" },
    { id: 13102, category: "lifeformBuildings", name: "Fusion Cell Factory", icon: "" },
    { id: 13103, category: "lifeformBuildings", name: "Robotics Research Centre", icon: "" },
    { id: 13104, category: "lifeformBuildings", name: "Update Network", icon: "" },
    { id: 13105, category: "lifeformBuildings", name: "Quantum Computer Centre", icon: "" },
    { id: 13106, category: "lifeformBuildings", name: "Automatised Assembly Centre", icon: "" },
    { id: 13107, category: "lifeformBuildings", name: "High-Performance Transformer", icon: "" },
    { id: 13108, category: "lifeformBuildings", name: "Microchip Assembly Line", icon: "" },
    { id: 13109, category: "lifeformBuildings", name: "Production Assembly Hall", icon: "" },
    { id: 13110, category: "lifeformBuildings", name: "High-Performance Synthesiser", icon: "" },
    { id: 13111, category: "lifeformBuildings", name: "Chip Mass Production", icon: "" },
    { id: 13112, category: "lifeformBuildings", name: "Nano Repair Bots", icon: "" },
    // Kaelesh Buildings
    { id: 14101, category: "lifeformBuildings", name: "Sanctuary", icon: "" },
    { id: 14102, category: "lifeformBuildings", name: "Antimatter Condenser", icon: "" },
    { id: 14103, category: "lifeformBuildings", name: "Vortex Chamber", icon: "" },
    { id: 14104, category: "lifeformBuildings", name: "Halls of Realisation", icon: "" },
    { id: 14105, category: "lifeformBuildings", name: "Forum of Transcendence", icon: "" },
    { id: 14106, category: "lifeformBuildings", name: "Antimatter Convector", icon: "" },
    { id: 14107, category: "lifeformBuildings", name: "Cloning Laboratory", icon: "" },
    { id: 14108, category: "lifeformBuildings", name: "Chrysalis Accelerator", icon: "" },
    { id: 14109, category: "lifeformBuildings", name: "Bio Modifier", icon: "" },
    { id: 14110, category: "lifeformBuildings", name: "Psionic Modulator", icon: "" },
    { id: 14111, category: "lifeformBuildings", name: "Ship Manufacturing Hall", icon: "" },
    { id: 14112, category: "lifeformBuildings", name: "Supra Refractor", icon: "" }
  ];
  const LIFEFORM_TECH_DATA = [
    {
      "id": 1,
      "lifeformId": 1,
      "gkId": 11201,
      "name": "Intergalactic Envoys",
      "description": "Intergalactic Envoys are capable of detecting extra-terrestrial civilisations. They also reduced the duration of exploration flights to detect other lifeforms in the Galaxy view with each level. However, exploration is not without danger, and ships are occasionally lost in the endeavour.",
      "shortDesc": "Lifeform Scanning / Speed",
      "metalBaseCost": 5e3,
      "crystalBaseCost": 2500,
      "deutBaseCost": 500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 4
        }
      ]
    },
    {
      "id": 2,
      "lifeformId": 2,
      "gkId": 12201,
      "name": "Volcanic Batteries",
      "description": "Volcanic Batteries increase the production of energy on all planets with each level.",
      "shortDesc": "Energy Prod",
      "metalBaseCost": 1e4,
      "crystalBaseCost": 6e3,
      "deutBaseCost": 1e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.25,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 5
        }
      ]
    },
    {
      "id": 3,
      "lifeformId": 3,
      "gkId": 13201,
      "name": "Catalyser Technology",
      "description": "Researching Catalyser Technology increases the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 1e4,
      "crystalBaseCost": 6e3,
      "deutBaseCost": 1e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 4,
      "lifeformId": 4,
      "gkId": 14201,
      "name": "Heat Recovery",
      "description": "Researching Heat Recovery decreases the fuel consumption of all ships with each level.",
      "shortDesc": "Fuel Cost Reduction (30% Cap)",
      "metalBaseCost": 1e4,
      "crystalBaseCost": 6e3,
      "deutBaseCost": 1e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.03,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "30%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e3,
      "target": [
        {
          "bonusBreakdownId": 6
        }
      ]
    },
    {
      "id": 5,
      "lifeformId": 1,
      "gkId": 11202,
      "name": "High-Performance Extractors",
      "description": "High-Performance Extractors increase the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 7e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 6,
      "lifeformId": 2,
      "gkId": 12202,
      "name": "Acoustic Scanning",
      "description": "Researching Acoustic Scanning increases the crystal production on all planets with each level.",
      "shortDesc": "Crystal Prod",
      "metalBaseCost": 7500,
      "crystalBaseCost": 12500,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 2
        }
      ]
    },
    {
      "id": 7,
      "lifeformId": 3,
      "gkId": 13202,
      "name": "Plasma Drive",
      "description": "Researching the Plasma Drive increases the speed of all ships (excluding Deathstars) with each level.",
      "shortDesc": "All Ship Speed",
      "metalBaseCost": 7500,
      "crystalBaseCost": 12500,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 210
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 214
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 218
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 219
        }
      ]
    },
    {
      "id": 8,
      "lifeformId": 4,
      "gkId": 14202,
      "name": "Sulphide Process",
      "description": "Researching the Sulphide Process increases the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 7500,
      "crystalBaseCost": 12500,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2e3,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 9,
      "lifeformId": 1,
      "gkId": 11203,
      "name": "Fusion Drives",
      "description": "This advancement in drive technology makes civilian ships faster.  Each level increases the speed.",
      "shortDesc": "Civ Ship Speed",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.5,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 210
        }
      ]
    },
    {
      "id": 10,
      "lifeformId": 2,
      "gkId": 12203,
      "name": "High Energy Pump Systems",
      "description": "High Energy Pump Systems increase the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 11,
      "lifeformId": 3,
      "gkId": 13203,
      "name": "Efficiency Module",
      "description": "The Efficiency Module decreases the fuel consumption of all ships with each level.",
      "shortDesc": "Fuel Cost Reduction (30% Cap)",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.03,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "30%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 6
        }
      ]
    },
    {
      "id": 12,
      "lifeformId": 4,
      "gkId": 14203,
      "name": "Psionic Network",
      "description": "Strengthening the Psionic Network reduces the chance of losing ships on expeditions with every level.",
      "shortDesc": "Expo Ship Loss Reduction",
      "metalBaseCost": 15e3,
      "crystalBaseCost": 1e4,
      "deutBaseCost": 5e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.05,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 2500,
      "target": [
        {
          "bonusBreakdownId": 8
        }
      ]
    },
    {
      "id": 13,
      "lifeformId": 1,
      "gkId": 11204,
      "name": "Stealth Field Generator",
      "description": "Stealth Field Generators reduce the costs and duration of researching spy tech.",
      "shortDesc": "Esp Tech Cost Reduction",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        }
      ]
    },
    {
      "id": 14,
      "lifeformId": 2,
      "gkId": 12204,
      "name": "Cargo Hold Expansion (Civilian Ships)",
      "description": "The Cargo Hold Expansion increases the cargo capacity of civilian ships on all planets with each level.",
      "shortDesc": "Civ Ship Capacity",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.4,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 210
        }
      ]
    },
    {
      "id": 15,
      "lifeformId": 3,
      "gkId": 13204,
      "name": "Depot AI",
      "description": "The Depot AI reduces the costs and construction time for the Alliance Depot with each level.",
      "shortDesc": "Alliance Depot Cost Reduction",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 11
        },
        {
          "bonusBreakdownId": 14
        }
      ]
    },
    {
      "id": 16,
      "lifeformId": 4,
      "gkId": 14204,
      "name": "Telekinetic Tractor Beam",
      "description": "Increases the number of ships which are found on expeditions.",
      "shortDesc": "Expo Find more Ships",
      "metalBaseCost": 2e4,
      "crystalBaseCost": 15e3,
      "deutBaseCost": 7500,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 3500,
      "target": [
        {
          "bonusBreakdownId": 12
        }
      ]
    },
    {
      "id": 17,
      "lifeformId": 1,
      "gkId": 11205,
      "name": "Orbital Den",
      "description": "A portion of the resource supplies will be stored here safe from plundering. The den increases the storage capacity.",
      "shortDesc": "Res Protection",
      "metalBaseCost": 25e3,
      "crystalBaseCost": 2e4,
      "deutBaseCost": 1e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.4,
      "crystalIncreaseFactor": 1.4,
      "deutIncreaseFactor": 1.4,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 4,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 15
        }
      ]
    },
    {
      "id": 18,
      "lifeformId": 2,
      "gkId": 12205,
      "name": "Magma-Powered Production",
      "description": "Magma-Powered Production increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 25e3,
      "crystalBaseCost": 2e4,
      "deutBaseCost": 1e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 19,
      "lifeformId": 3,
      "gkId": 13205,
      "name": "General Overhaul (Light Fighter)",
      "description": "The general overhaul of the Light Fighter increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Light Fighters with each level.",
      "shortDesc": "LF Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 204
        }
      ]
    },
    {
      "id": 20,
      "lifeformId": 4,
      "gkId": 14205,
      "name": "Enhanced Sensor Technology",
      "description": "Researching Enhanced Sensor Technology increases the amount of resources that can be earned on expeditions with each level.",
      "shortDesc": "Expo Res Boost",
      "metalBaseCost": 25e3,
      "crystalBaseCost": 2e4,
      "deutBaseCost": 1e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 4500,
      "target": [
        {
          "bonusBreakdownId": 19
        }
      ]
    },
    {
      "id": 21,
      "lifeformId": 1,
      "gkId": 11206,
      "name": "Research AI",
      "description": "The Research AI allows research projects to be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 35e3,
      "crystalBaseCost": 25e3,
      "deutBaseCost": 15e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 22,
      "lifeformId": 2,
      "gkId": 12206,
      "name": "Geothermal Power Plants",
      "description": "Geothermal Power Plants increase the production of energy on all planets with each level.",
      "shortDesc": "Energy Prod",
      "metalBaseCost": 5e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.25,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 5
        }
      ]
    },
    {
      "id": 23,
      "lifeformId": 3,
      "gkId": 13206,
      "name": "Automated Transport Lines",
      "description": "Researching Automated Transport Lines increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 5e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 24,
      "lifeformId": 4,
      "gkId": 14206,
      "name": "Neuromodal Compressor",
      "description": "Researching the Neuromodal Compressor increases the cargo capacity of civilian ships on all planets with each level.",
      "shortDesc": "Civ Ship Capacity",
      "metalBaseCost": 5e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.4,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 5e3,
      "target": [
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 202
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 208
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 210
        }
      ]
    },
    {
      "id": 25,
      "lifeformId": 1,
      "gkId": 11207,
      "name": "High-Performance Terraformer",
      "description": "The High-Performance Terraformer reduces the costs, energy required and duration of building the terraformer with each level.",
      "shortDesc": "Terraformer Cost Reduction",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 20
        },
        {
          "bonusBreakdownId": 21
        }
      ]
    },
    {
      "id": 26,
      "lifeformId": 2,
      "gkId": 12207,
      "name": "Depth Sounding",
      "description": "Researching Depth Sounding increases the metal production on all planets with each level.",
      "shortDesc": "Metal Prod",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5500,
      "target": [
        {
          "bonusBreakdownId": 1
        }
      ]
    },
    {
      "id": 27,
      "lifeformId": 3,
      "gkId": 13207,
      "name": "Improved Drone AI",
      "description": "Improved Drone AI reduces the costs and research time of spy technology with each level.",
      "shortDesc": "Esp Tech Cost Reduction",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        }
      ]
    },
    {
      "id": 28,
      "lifeformId": 4,
      "gkId": 14207,
      "name": "Neuro-Interface",
      "description": "With the Neuro-Interface, research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 7e4,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 5500,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 29,
      "lifeformId": 1,
      "gkId": 11208,
      "name": "Enhanced Production Technologies",
      "description": "Enhanced Production Technologies increase the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 8e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 30,
      "lifeformId": 2,
      "gkId": 12208,
      "name": "Ion Crystal Enhancement (Heavy Fighter)",
      "description": "Researching the Ion Crystal Enhancement increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Heavy Fighters with each level.",
      "shortDesc": "HF Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 205
        }
      ]
    },
    {
      "id": 31,
      "lifeformId": 3,
      "gkId": 13208,
      "name": "Experimental Recycling Technology",
      "description": "Researching the Experimental Recycling Technology increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Recyclers with each level.",
      "shortDesc": "Recycler Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 209
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 209
        }
      ]
    },
    {
      "id": 32,
      "lifeformId": 4,
      "gkId": 14208,
      "name": "Interplanetary Analysis Network",
      "description": "Enhancing the Interplanetary Analysis Network increases the range of all phalanx scans.",
      "shortDesc": "Phalanx Range Boost",
      "metalBaseCost": 8e4,
      "crystalBaseCost": 5e4,
      "deutBaseCost": 2e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.6,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 6e3,
      "target": [
        {
          "bonusBreakdownId": 22
        }
      ]
    },
    {
      "id": 33,
      "lifeformId": 1,
      "gkId": 11209,
      "name": "Light Fighter Mk II",
      "description": "Researching the Light Fighter Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Light Fighters with each level.",
      "shortDesc": "LF Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 204
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 204
        }
      ]
    },
    {
      "id": 34,
      "lifeformId": 2,
      "gkId": 12209,
      "name": "Improved Stellarator",
      "description": "Researching the Improved Stellarator reduces the costs and research time of plasma technology with each level.",
      "shortDesc": "Plasma Tech Cost Reduction",
      "metalBaseCost": 75e3,
      "crystalBaseCost": 55e3,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.15,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.3,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        }
      ]
    },
    {
      "id": 35,
      "lifeformId": 3,
      "gkId": 13209,
      "name": "General Overhaul (Cruiser)",
      "description": "The general overhaul of the Cruiser increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Cruisers with each level.",
      "shortDesc": "Cruiser Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 206
        }
      ]
    },
    {
      "id": 36,
      "lifeformId": 4,
      "gkId": 14209,
      "name": "Overclocking (Heavy Fighter)",
      "description": "Overclocking the Heavy Fighter systems increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Heavy Fighters with each level.",
      "shortDesc": "HF Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 6500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 205
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 205
        }
      ]
    },
    {
      "id": 37,
      "lifeformId": 1,
      "gkId": 11210,
      "name": "Cruiser Mk II",
      "description": "Researching the Cruiser Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Cruisers with each level.",
      "shortDesc": "Cruiser Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 206
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 206
        }
      ]
    },
    {
      "id": 38,
      "lifeformId": 2,
      "gkId": 12210,
      "name": "Hardened Diamond Drill Heads",
      "description": "Hardened Diamond Drill Heads increase the metal production on all planets with each level.",
      "shortDesc": "Metal Prod",
      "metalBaseCost": 85e3,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 35e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 1
        }
      ]
    },
    {
      "id": 39,
      "lifeformId": 3,
      "gkId": 13210,
      "name": "Slingshot Autopilot",
      "description": "Researching the Slingshot Autopilot makes it possible to reclaim fuel when recalling the fleet. Each level increases the amount of fuel reclaimed.",
      "shortDesc": "Fuel Refund for Recalls",
      "metalBaseCost": 85e3,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 35e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.15,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "90%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 23
        }
      ]
    },
    {
      "id": 40,
      "lifeformId": 4,
      "gkId": 14210,
      "name": "Telekinetic Drive",
      "description": "Developing the Telekinetic Drive increases fleet speed on expeditions with every level.",
      "shortDesc": "Expo Fleet Speed Boost",
      "metalBaseCost": 85e3,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 35e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.2,
      "durationBase": 7e3,
      "target": [
        {
          "bonusBreakdownId": 24
        }
      ]
    },
    {
      "id": 41,
      "lifeformId": 1,
      "gkId": 11211,
      "name": "Improved Lab Technology",
      "description": "With Improved Lab Technology, research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 42,
      "lifeformId": 2,
      "gkId": 12211,
      "name": "Seismic Mining Technology",
      "description": "Researching Seismic Mining Technology increases the crystal production on all planets with each level.",
      "shortDesc": "Crystal Prod",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 2
        }
      ]
    },
    {
      "id": 43,
      "lifeformId": 3,
      "gkId": 13211,
      "name": "High-Temperature Superconductors",
      "description": "Researching High-Temperature Superconductors reduces the costs and research time of energy technology with each level.",
      "shortDesc": "Energy Tech Cost Reduction",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        }
      ]
    },
    {
      "id": 44,
      "lifeformId": 4,
      "gkId": 14211,
      "name": "Sixth Sense",
      "description": "Sharpening the Sixth Sense increases the amount of resources that can be earned on expeditions with each level.",
      "shortDesc": "Expo Res Boost",
      "metalBaseCost": 12e4,
      "crystalBaseCost": 3e4,
      "deutBaseCost": 25e3,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 7500,
      "target": [
        {
          "bonusBreakdownId": 19
        }
      ]
    },
    {
      "id": 45,
      "lifeformId": 1,
      "gkId": 11212,
      "name": "Plasma Terraformer",
      "description": "Researching the Plasma Terraformer reduces the costs, energy required and duration of building the terraformer with each level.",
      "shortDesc": "Terraformer Cost Reduction",
      "metalBaseCost": 1e5,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 3e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 20
        },
        {
          "bonusBreakdownId": 21
        }
      ]
    },
    {
      "id": 46,
      "lifeformId": 2,
      "gkId": 12212,
      "name": "Magma-Powered Pump Systems",
      "description": "Magma-Powered Pump Systems increase the production of deuterium on all planets with each level.",
      "shortDesc": "Deut Prod",
      "metalBaseCost": 1e5,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 3e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.08,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 47,
      "lifeformId": 3,
      "gkId": 13212,
      "name": "General Overhaul (Battleship)",
      "description": "The general overhaul of the Battleship increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battleships with each level.",
      "shortDesc": "Battleship Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 207
        }
      ]
    },
    {
      "id": 48,
      "lifeformId": 4,
      "gkId": 14212,
      "name": "Psychoharmoniser",
      "description": "Researching the Psychoharmoniser increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 1e5,
      "crystalBaseCost": 4e4,
      "deutBaseCost": 3e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8e3,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 49,
      "lifeformId": 1,
      "gkId": 11213,
      "name": "Low-Temperature Drives",
      "description": "Low-Temperature Drives reduce the costs and duration of researching spy tech.",
      "shortDesc": "Esp Tech Cost Reduction",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        }
      ]
    },
    {
      "id": 50,
      "lifeformId": 2,
      "gkId": 12213,
      "name": "Ion Crystal Modules",
      "description": "With each level, Ion Crystal Modules reduce the Crawler’s energy consumption and increase its efficiency.",
      "shortDesc": "Crawler Boost",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.2,
      "crystalIncreaseFactor": 1.2,
      "deutIncreaseFactor": 1.2,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.1,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 25
        },
        {
          "bonusBreakdownId": 26
        }
      ]
    },
    {
      "id": 51,
      "lifeformId": 3,
      "gkId": 13213,
      "name": "Artificial Swarm Intelligence",
      "description": "Researching Artificial Swarm Intelligence increases the production of metal, crystals and deuterium on all planets with each level.",
      "shortDesc": "All Prod",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.06,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 1
        },
        {
          "bonusBreakdownId": 2
        },
        {
          "bonusBreakdownId": 3
        }
      ]
    },
    {
      "id": 52,
      "lifeformId": 4,
      "gkId": 14213,
      "name": "Efficient Swarm Intelligence",
      "description": "Efficient Swarm Intelligence allows regular and lifeform research projects to be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 2e5,
      "crystalBaseCost": 1e5,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 8500,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 53,
      "lifeformId": 1,
      "gkId": 11214,
      "name": "Bomber Mk II",
      "description": "Researching the Bomber Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Bombers with each level.",
      "shortDesc": "Bomber Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 211
        }
      ]
    },
    {
      "id": 54,
      "lifeformId": 2,
      "gkId": 12214,
      "name": "Optimised Silo Construction Method",
      "description": "Researching the Optimised Silo Construction Method reduces the costs and research time of missile silos with each level.",
      "shortDesc": "Missile Silo Cost Reduction",
      "metalBaseCost": 22e4,
      "crystalBaseCost": 11e4,
      "deutBaseCost": 11e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 27
        },
        {
          "bonusBreakdownId": 28
        }
      ]
    },
    {
      "id": 55,
      "lifeformId": 3,
      "gkId": 13214,
      "name": "General Overhaul (Battlecruiser)",
      "description": "The general overhaul of the Battlecruiser increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battlecruisers with each level.",
      "shortDesc": "BC Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 215
        }
      ]
    },
    {
      "id": 56,
      "lifeformId": 4,
      "gkId": 14214,
      "name": "Overclocking (Large Cargo)",
      "description": "Overclocking Large Cargo ships increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Largo Cargo ships with each level.",
      "shortDesc": "LC Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9e3,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 203
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 203
        }
      ]
    },
    {
      "id": 57,
      "lifeformId": 1,
      "gkId": 11215,
      "name": "Destroyer Mk II",
      "description": "Researching the Destroyer Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Destroyers with each level.",
      "shortDesc": "Destroyer Boost",
      "metalBaseCost": 16e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 5e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 213
        }
      ]
    },
    {
      "id": 58,
      "lifeformId": 2,
      "gkId": 12215,
      "name": "Diamond Energy Transmitter",
      "description": "Diamond Energy Transmitters reduce the costs and research time of energy technology with each level.",
      "shortDesc": "Energy Tech Cost Reduction",
      "metalBaseCost": 24e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        }
      ]
    },
    {
      "id": 59,
      "lifeformId": 3,
      "gkId": 13215,
      "name": "General Overhaul (Bomber)",
      "description": "The general overhaul of the Bomber increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Bombers with each level.",
      "shortDesc": "Bomber Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 211
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 211
        }
      ]
    },
    {
      "id": 60,
      "lifeformId": 4,
      "gkId": 14215,
      "name": "Gravitation Sensors",
      "description": "Gravitation Sensors increase the amount of Dark Matter that can be earned on expeditions with each level.",
      "shortDesc": "Expo DM Find Boost",
      "metalBaseCost": 24e4,
      "crystalBaseCost": 12e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 9500,
      "target": [
        {
          "bonusBreakdownId": 29
        }
      ]
    },
    {
      "id": 61,
      "lifeformId": 1,
      "gkId": 11216,
      "name": "Battlecruiser Mk II",
      "description": "Researching the Battlecruiser Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battlecruisers with each level.",
      "shortDesc": "BC Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 215
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 215
        }
      ]
    },
    {
      "id": 62,
      "lifeformId": 2,
      "gkId": 12216,
      "name": "Obsidian Shield Reinforcement",
      "description": "Researching the Obsidian Shield Reinforcement increases the structural integrity, shield strength as well as attack strength of defensive structures.",
      "shortDesc": "Defense Boost",
      "metalBaseCost": 25e4,
      "crystalBaseCost": 25e4,
      "deutBaseCost": 25e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.4,
      "crystalIncreaseFactor": 1.4,
      "deutIncreaseFactor": 1.4,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.5,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 401
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 402
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 403
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 404
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 405
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 406
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 407
        },
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 408
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 401
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 402
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 403
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 404
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 405
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 406
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 407
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 408
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 401
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 402
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 403
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 404
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 405
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 406
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 407
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 408
        }
      ]
    },
    {
      "id": 63,
      "lifeformId": 3,
      "gkId": 13216,
      "name": "General Overhaul (Destroyer)",
      "description": "The general overhaul of the Destroyer increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Destroyers with each level.",
      "shortDesc": "Destroyer Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 213
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 213
        }
      ]
    },
    {
      "id": 64,
      "lifeformId": 4,
      "gkId": 14216,
      "name": "Overclocking (Battleship)",
      "description": "Overclocking the Battleship increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battleships with each level.",
      "shortDesc": "Battleship Boost",
      "metalBaseCost": 32e4,
      "crystalBaseCost": 24e4,
      "deutBaseCost": 1e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.3,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 1e4,
      "target": [
        {
          "bonusBreakdownId": 16,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 17,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 18,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 10,
          "gameKnowledgeId": 207
        },
        {
          "bonusBreakdownId": 7,
          "gameKnowledgeId": 207
        }
      ]
    },
    {
      "id": 65,
      "lifeformId": 1,
      "gkId": 11217,
      "name": "Robot Assistants",
      "description": "With Robot Assistants, research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 106
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 108
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 113
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 114
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 115
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 117
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 118
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 120
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 121
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 122
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 123
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 199
        }
      ]
    },
    {
      "id": 66,
      "lifeformId": 2,
      "gkId": 12217,
      "name": "Rune Shields",
      "description": "Researching Rune Shields reduces the costs and duration of researching Armour Technology with each level.",
      "shortDesc": "Armor Tech Cost Reduction",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 111
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 111
        }
      ]
    },
    {
      "id": 67,
      "lifeformId": 3,
      "gkId": 13217,
      "name": "Experimental Weapons Technology",
      "description": "Researching Experimental Weapons Technology reduces the costs and research time of weapons technology with each level.",
      "shortDesc": "Weapons Tech Cost Reduction",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 109
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 109
        }
      ]
    },
    {
      "id": 68,
      "lifeformId": 4,
      "gkId": 14217,
      "name": "Psionic Shield Matrix",
      "description": "Enhancing the Psionic Shield Matrix reduces the costs and research time of shield technology with each level.",
      "shortDesc": "Shield Tech Cost Reduction",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.5,
      "crystalIncreaseFactor": 1.5,
      "deutIncreaseFactor": 1.5,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "50%",
      "bonus2BaseValue": 0.2,
      "bonus2IncreaseFactor": 1,
      "bonus2Max": "99%",
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 13,
          "gameKnowledgeId": 110
        },
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 110
        }
      ]
    },
    {
      "id": 69,
      "lifeformId": 1,
      "gkId": 11218,
      "name": "Supercomputer",
      "description": "With the Supercomputer, astrophysics research projects can be completed much faster. Each level increases the speed of research.",
      "shortDesc": "Research Speed Boost",
      "metalBaseCost": 5e5,
      "crystalBaseCost": 3e5,
      "deutBaseCost": 2e5,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.3,
      "crystalIncreaseFactor": 1.3,
      "deutIncreaseFactor": 1.3,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.1,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": "99%",
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.3,
      "durationBase": 13e3,
      "target": [
        {
          "bonusBreakdownId": 9,
          "gameKnowledgeId": 124
        }
      ]
    },
    {
      "id": 70,
      "lifeformId": 2,
      "gkId": 12218,
      "name": "Rock’tal Collector Enhancement",
      "description": "The class bonuses as Collector increase with each level. All bonuses increase except:\n•	Overloading Crawlers\n•	Discount on acceleration (buildings)",
      "shortDesc": "Collector Class Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.7,
      "crystalIncreaseFactor": 1.7,
      "deutIncreaseFactor": 1.7,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 30
        }
      ]
    },
    {
      "id": 71,
      "lifeformId": 3,
      "gkId": 13218,
      "name": "Mechan General Enhancement",
      "description": "The class bonuses as General increase with each level. All bonuses increase except:\n•	Small chance to immediately destroy a Deathstar once in a battle using a light fighter\n•	Wreckage at attack (transport to starting planet)\n•	Detailed fleet speed settings\n•	Discount on acceleration (shipyard)",
      "shortDesc": "General Class Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.7,
      "crystalIncreaseFactor": 1.7,
      "deutIncreaseFactor": 1.7,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 31
        }
      ]
    },
    {
      "id": 72,
      "lifeformId": 4,
      "gkId": 14218,
      "name": "Kaelesh Discoverer Enhancement",
      "description": "The class bonuses as Discoverer increase with each level. All bonuses increase except:\n•	Debris fields created on expeditions are visible in the Galaxy view\n•	Loot from inactive players\n•	Discount on acceleration (research)",
      "shortDesc": "Discoverer Class Boost",
      "metalBaseCost": 3e5,
      "crystalBaseCost": 18e4,
      "deutBaseCost": 12e4,
      "energyBaseCost": 0,
      "metalIncreaseFactor": 1.7,
      "crystalIncreaseFactor": 1.7,
      "deutIncreaseFactor": 1.7,
      "energyIncreaseFactor": 0,
      "bonus1BaseValue": 0.2,
      "bonus1IncreaseFactor": 1,
      "bonus1Max": null,
      "bonus2BaseValue": null,
      "bonus2IncreaseFactor": null,
      "bonus2Max": null,
      "bonus3BaseValue": null,
      "bonus3IncreaseFactor": null,
      "bonus3Max": null,
      "durationFactor": 1.4,
      "durationBase": 11e3,
      "target": [
        {
          "bonusBreakdownId": 32
        }
      ]
    }
  ];
  const LIFEFORM_BONUS_BREAKDOWN_DATA = [
    { "id": 1, "bonusName": "Resource Bonus Metal", "maxBoostPercentage": null },
    { "id": 2, "bonusName": "Resource Bonus Crystal", "maxBoostPercentage": null },
    { "id": 3, "bonusName": "Resource Bonus Deuterium", "maxBoostPercentage": null },
    { "id": 4, "bonusName": "Exploration Flight Fleet Speed Bonus", "maxBoostPercentage": null },
    { "id": 5, "bonusName": "Energy Bonus", "maxBoostPercentage": null },
    { "id": 6, "bonusName": "Ship Fuel Cost Reduction", "maxBoostPercentage": 30 },
    { "id": 7, "bonusName": "Ship Speed Increase", "maxBoostPercentage": null },
    { "id": 8, "bonusName": "Expedition Ship Loss Reduction", "maxBoostPercentage": 50 },
    { "id": 9, "bonusName": "Research Speed Boost", "maxBoostPercentage": 99 },
    { "id": 10, "bonusName": "Ship Cargo Capacity Increase", "maxBoostPercentage": null },
    { "id": 11, "bonusName": "Alliance Depot Cost Reduction", "maxBoostPercentage": 50 },
    { "id": 12, "bonusName": "Expedition Ship Find Bonus", "maxBoostPercentage": null },
    { "id": 13, "bonusName": "Research Costs Decrease", "maxBoostPercentage": 50 },
    { "id": 14, "bonusName": "Alliance Depot Time Reduction", "maxBoostPercentage": 99 },
    { "id": 15, "bonusName": "Orbital Den Storage Bonus", "maxBoostPercentage": null },
    { "id": 16, "bonusName": "Ship Armor Increase", "maxBoostPercentage": null },
    { "id": 17, "bonusName": "Ship Shields Increase", "maxBoostPercentage": null },
    { "id": 18, "bonusName": "Ship Weapons Increase", "maxBoostPercentage": null },
    { "id": 19, "bonusName": "Expedition Resource Find Bonus", "maxBoostPercentage": null },
    { "id": 20, "bonusName": "Terraformer Cost Reduction", "maxBoostPercentage": 50 },
    { "id": 21, "bonusName": "Terraformer Time Reduction", "maxBoostPercentage": 99 },
    { "id": 22, "bonusName": "Phalanx Range Boost", "maxBoostPercentage": null },
    { "id": 23, "bonusName": "Fuel Refund for Recalls", "maxBoostPercentage": 90 },
    { "id": 24, "bonusName": "Expedition Fleet Speed Boost", "maxBoostPercentage": null },
    { "id": 25, "bonusName": "Crawler Boost", "maxBoostPercentage": 50 },
    { "id": 26, "bonusName": "Crawler Energy Consumption", "maxBoostPercentage": null },
    { "id": 27, "bonusName": "Missile Silo Cost Reduction", "maxBoostPercentage": 50 },
    { "id": 28, "bonusName": "Missile Silo Time Reduction", "maxBoostPercentage": 99 },
    { "id": 29, "bonusName": "Expedition Dark Matter Find Boost", "maxBoostPercentage": null },
    {
      "id": 30,
      "bonusName": "Collector Class Boost",
      "maxBoostPercentage": null,
      "boostDetails": [
        { "name": "Mine Production", "defaultValue": "25%", "icon": "collector_resource_production.png" },
        { "name": "Energy Production", "defaultValue": "10%", "icon": "collector_energy_production.png" },
        { "name": "Speed for Transporters", "defaultValue": "100%", "icon": "collector_ship_speed.png" },
        { "name": "Cargo Bay for Transporters", "defaultValue": "25%", "icon": "collector_cargo_bay.png" }
      ]
    },
    {
      "id": 31,
      "bonusName": "General Class Boost",
      "maxBoostPercentage": null,
      "boostDetails": [
        { "name": "Speed for Combat Ships", "defaultValue": "100%", "icon": "collector_ship_speed.png" },
        { "name": "Speed for Recyclers", "defaultValue": "100%", "icon": "collector_ship_speed.png" },
        { "name": "Deuterium Consumption for all Ships", "defaultValue": "-25%", "icon": "warrior_fuel_consumption.png" },
        { "name": "Cargo bay for Recyclers and Pathfinders", "defaultValue": "20%", "icon": "collector_cargo_bay.png" },
        { "name": "Combat Research Levels", "defaultValue": "2", "icon": "warrior_armor_shield_weapon.png" },
        { "name": "Fleet Slots", "defaultValue": "2", "icon": "discoverer_more_expedition_slots.png" },
        { "name": "Additional Moon Fields", "defaultValue": "5", "icon": "discoverer_bigger_planets.png" }
      ]
    },
    {
      "id": 32,
      "bonusName": "Discoverer Class Boost",
      "maxBoostPercentage": null,
      "boostDetails": [
        { "name": "Research Time", "defaultValue": "-25%", "icon": "discoverer_research_time.png" },
        { "name": "Expedition Resource Bonus", "defaultValue": "1200%", "icon": "discoverer_resource_bonus.png" },
        { "name": "Planet Size", "defaultValue": "10%", "icon": "discoverer_bigger_planets.png" },
        { "name": "More Expeditions", "defaultValue": "2", "icon": "discoverer_more_expedition_slots.png" },
        { "name": "Fewer Expedition Enemies", "defaultValue": "-50%", "icon": "discoverer_fewer_enemies.png" },
        { "name": "Increased Phalanx Range", "defaultValue": "20%", "icon": "discoverer_phalanx_range.png" }
      ]
    }
  ];
  class OGNexusDB extends Dexie {
    constructor() {
      super("OGNexusDB");
      __publicField(this, "accounts");
      __publicField(this, "planets");
      __publicField(this, "expeditions");
      __publicField(this, "lifeformDiscoveries");
      __publicField(this, "lifeformSpecies");
      __publicField(this, "gameKnowledge");
      __publicField(this, "settings");
      __publicField(this, "lifeformTechnologies");
      __publicField(this, "lifeformBonusBreakdown");
      __publicField(this, "lifeformSavedSetups");
      __publicField(this, "todoProjects");
      __publicField(this, "debrisHarvests");
      __publicField(this, "combatReports");
      this.version(32).stores({
        accounts: "playerId, playerName, universe, lastSeen",
        planets: "id, playerId, coords, lifeformId",
        expeditions: "messageId, playerId, timestamp, coords, result",
        lifeformDiscoveries: "messageId, playerId, timestamp, coords, discoveryType",
        lifeformSpecies: "lifeformId, lifeformName",
        gameKnowledge: "id, category, name",
        settings: "id",
        lifeformTechnologies: "id, lifeformId, name",
        lifeformBonusBreakdown: "id, bonusName",
        lifeformSavedSetups: "++id, name",
        todoProjects: "++id, projectKey, planetId, type",
        debrisHarvests: "messageId, playerId, timestamp, coords",
        combatReports: "messageId, playerId, timestamp, coords, winner"
      });
      this.on("populate", () => {
        this.seedKnowledge();
        this.seedSettings();
      });
      this.on("ready", () => {
        this.seedKnowledge();
        this.seedSettings();
      });
    }
    async seedSettings() {
      try {
        const rates = await this.settings.get("conversion_rates");
        if (!rates) {
          await this.settings.add({
            id: "conversion_rates",
            metal: 3,
            crystal: 2,
            deuterium: 1
          });
          console.log("OGame Nexus: Successfully seeded default conversion rates.");
        }
      } catch (error) {
        console.error("OGame Nexus: Failed to seed settings", error);
      }
    }
    async seedKnowledge() {
      console.log("OGame Nexus: Seeding game knowledge database...");
      try {
        await this.gameKnowledge.bulkPut(SHIP_DATA);
        await this.gameKnowledge.bulkPut(RESEARCH_DATA);
        await this.gameKnowledge.bulkPut(DEFENCE_DATA);
        await this.gameKnowledge.bulkPut(BUILDING_DATA);
        await this.gameKnowledge.bulkPut(LIFEFORM_RESEARCH_DATA);
        await this.gameKnowledge.bulkPut(LIFEFORM_BUILDING_DATA);
        const speciesCount = await this.lifeformSpecies.count();
        if (speciesCount === 0) {
          await this.lifeformSpecies.bulkAdd(LIFEFORM_SPECIES_DATA);
          console.log("OGame Nexus: Successfully seeded initial lifeform species.");
        }
        await this.lifeformTechnologies.bulkPut(LIFEFORM_TECH_DATA);
        console.log("OGame Nexus: Successfully seeded lifeform technology data.");
        await this.lifeformBonusBreakdown.bulkPut(LIFEFORM_BONUS_BREAKDOWN_DATA);
        console.log("OGame Nexus: Successfully seeded lifeform bonus breakdown data.");
        console.log("OGame Nexus: Successfully seeded ship data.");
      } catch (error) {
        console.error("OGame Nexus: Failed to seed knowledge data", error);
      }
    }
  }
  const db = new OGNexusDB();
  function parseProduction(html) {
    const summaryMatch = html.match(/<tr[^>]*class="[^"]*summaryHourly[^"]*"[^>]*>([\s\S]*?)<\/tr>/);
    if (!summaryMatch) return null;
    const rowContent = summaryMatch[1];
    const getVal = (idx) => {
      const tdRegex = new RegExp(`<td[^>]*data-resourceidx=["']${idx}["'][^>]*>([\\s\\S]*?)<\\/td>`, "i");
      const tdMatch = rowContent.match(tdRegex);
      if (!tdMatch) return 0;
      const tdContent = tdMatch[1];
      const valueMatch = tdContent.match(/(?:data-tooltip-title|title)=["']([^"']+)["']/i);
      if (valueMatch) {
        const titleContent = valueMatch[1];
        const numberMatches = titleContent.match(/[\d,.]+/g);
        if (numberMatches) {
          const rawValue = numberMatches[numberMatches.length - 1];
          const cleaned = rawValue.replace(/,/g, "");
          const val = parseFloat(cleaned);
          if (!isNaN(val)) return val;
        }
      }
      return 0;
    };
    const data = {
      metal: getVal(0),
      crystal: getVal(1),
      deuterium: getVal(2),
      lastUpdated: Date.now()
    };
    let storageRow = null;
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const summaryIdx = rows.findIndex((r) => r.includes("summaryHourly"));
    if (summaryIdx !== -1 && rows.length > summaryIdx + 1) {
      for (let i = summaryIdx + 1; i < summaryIdx + 4 && i < rows.length; i++) {
        if (rows[i].includes('class="alt"') || rows[i].toLowerCase().includes("storage")) {
          storageRow = rows[i];
          break;
        }
      }
    }
    if (storageRow) {
      console.log("Background: Found potential storage row");
      const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const tdMatches = [...storageRow.matchAll(tdPattern)];
      if (tdMatches.length >= 4) {
        for (let i = 1; i <= 3; i++) {
          const tdContent = tdMatches[i][1];
          const valMatch = tdContent.match(/(?:data-tooltip-title|title)=["']([\d,.]+)["']/i);
          if (valMatch) {
            const val = parseInt(valMatch[1].replace(/[,.]/g, ""));
            if (i === 1) data.metalCapacity = val;
            else if (i === 2) data.crystalCapacity = val;
            else if (i === 3) data.deuteriumCapacity = val;
            console.log(`Background: Extracted capacity ${i}: ${val}`);
          } else {
            const text = tdContent.replace(/<[^>]*>/g, "").trim();
            const numMatch = text.match(/[\d,.]+/);
            if (numMatch) {
              let val = parseFloat(numMatch[0].replace(/,/g, ""));
              if (text.toUpperCase().includes("M")) val *= 1e6;
              else if (text.toUpperCase().includes("K")) val *= 1e3;
              else if (text.toUpperCase().includes("G") || text.toUpperCase().includes("B")) val *= 1e9;
              if (i === 1 && !data.metalCapacity) data.metalCapacity = Math.floor(val);
              else if (i === 2 && !data.crystalCapacity) data.crystalCapacity = Math.floor(val);
              else if (i === 3 && !data.deuteriumCapacity) data.deuteriumCapacity = Math.floor(val);
            }
          }
        }
      } else {
        console.warn("Background: Storage row found but not enough cells");
      }
    } else {
      console.warn("Background: Storage capacity row not found in HTML");
    }
    return data;
  }
  function parseServerDataXml(xml) {
    const getVal = (tag) => {
      const regex = new RegExp(`<${tag}>([^<]+)<\\/${tag}>`, "i");
      const match = xml.match(regex);
      return match ? parseFloat(match[1]) : 0;
    };
    return {
      universeSpeed: getVal("speed"),
      topScore: getVal("topScore"),
      speedFleetPeaceful: getVal("speedFleetPeaceful"),
      speedFleetWar: getVal("speedFleetWar"),
      speedFleetHolding: getVal("speedFleetHolding"),
      donutGalaxy: getVal("donutGalaxy"),
      donutSystem: getVal("donutSystem"),
      galaxies: getVal("galaxies"),
      systems: getVal("systems"),
      bonusFields: getVal("bonusFields"),
      cargoHyperspaceTechMultiplier: getVal("cargoHyperspaceTechMultiplier")
    };
  }
  const AMORTIZATION_TABLE = [
    // Mines
    {
      name: "Metal Mine",
      id: null,
      type: 1,
      baseCost: { metal: 60, crystal: 15, deuterium: 0 },
      costFormula: (level) => ({
        metal: Math.floor(60 * Math.pow(1.5, level - 1)),
        crystal: Math.floor(15 * Math.pow(1.5, level - 1)),
        deuterium: 0
      }),
      reduction: "mineralResearchCenter",
      effect: { type: "metal", value: "mine_formula" }
    },
    {
      name: "Crystal Mine",
      id: null,
      type: 1,
      baseCost: { metal: 48, crystal: 24, deuterium: 0 },
      costFormula: (level) => ({
        metal: Math.floor(48 * Math.pow(1.6, level - 1)),
        crystal: Math.floor(24 * Math.pow(1.6, level - 1)),
        deuterium: 0
      }),
      reduction: "mineralResearchCenter",
      effect: { type: "crystal", value: "mine_formula" }
    },
    {
      name: "Deuterium Mine",
      id: null,
      type: 1,
      baseCost: { metal: 225, crystal: 75, deuterium: 0 },
      costFormula: (level) => ({
        metal: Math.floor(225 * Math.pow(1.5, level - 1)),
        crystal: Math.floor(75 * Math.pow(1.5, level - 1)),
        deuterium: 0
      }),
      reduction: "mineralResearchCenter",
      effect: { type: "deuterium", value: "mine_formula" }
    },
    // LF Buildings
    { name: "High-Performance Transformer", id: 13107, type: 3, baseCost: { metal: 35e3, crystal: 15e3, deuterium: 1e4 }, multiplier: 1.5, lifeformId: 3, effect: { type: "tech_bonus", value: 3e-3 } },
    { name: "Chip Mass Production", id: 13111, type: 3, baseCost: { metal: 55e3, crystal: 5e4, deuterium: 3e4 }, multiplier: 1.5, lifeformId: 3, effect: { type: "tech_bonus", value: 4e-3 } },
    { name: "High-Performance Synthesiser", id: 13110, type: 2, baseCost: { metal: 1e5, crystal: 4e4, deuterium: 2e4 }, multiplier: 1.5, lifeformId: 3, effect: { type: "deuterium", value: 0.02, target: "mine" } },
    { name: "High Energy Smelting", id: 11106, type: 2, baseCost: { metal: 9e3, crystal: 6e3, deuterium: 3e3 }, multiplier: 1.5, lifeformId: 1, effect: { type: "metal", value: 0.015, target: "mine" } },
    { name: "Fusion-Powered Production", id: 11108, type: 2, baseCost: { metal: 5e4, crystal: 25e3, deuterium: 15e3 }, multiplier: 1.5, lifeformId: 1, effect: { type: "multiple", values: { metal: 0, crystal: 0.015, deuterium: 0.01 }, target: "mine" } },
    { name: "Metropolis", id: 11111, type: 3, baseCost: { metal: 8e4, crystal: 35e3, deuterium: 6e4 }, multiplier: 1.5, lifeformId: 1, effect: { type: "tech_bonus", value: 5e-3 } },
    { name: "Magma Forge", id: 12106, type: 2, baseCost: { metal: 1e4, crystal: 8e3, deuterium: 1e3 }, multiplier: 1.4, lifeformId: 2, reduction: "megalith", effect: { type: "metal", value: 0.02, target: "mine" } },
    { name: "Crystal Refinery", id: 12109, type: 2, baseCost: { metal: 85e3, crystal: 44e3, deuterium: 25e3 }, multiplier: 1.4, lifeformId: 2, reduction: "megalith", effect: { type: "crystal", value: 0.02, target: "mine" } },
    { name: "Deuterium Synthesiser", id: 12110, type: 2, baseCost: { metal: 12e4, crystal: 5e4, deuterium: 2e4 }, multiplier: 1.4, lifeformId: 2, reduction: "megalith", effect: { type: "deuterium", value: 0.02, target: "mine" } },
    // LF Techs
    { name: "Catalyser Technology", id: 3, type: 4, baseCost: { metal: 1e4, crystal: 6e3, deuterium: 1e3 }, multiplier: 1.5, lifeformId: 3, reduction: "research_centers", effect: { type: "deuterium", value: 8e-4, target: "global" } },
    { name: "High-Performance Extractors", id: 5, type: 4, baseCost: { metal: 7e3, crystal: 1e4, deuterium: 5e3 }, multiplier: 1.5, lifeformId: 1, reduction: "research_centers", effect: { type: "all", value: 6e-4, target: "global" } },
    { name: "Acoustic Scanning", id: 6, type: 4, baseCost: { metal: 7500, crystal: 12500, deuterium: 5e3 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "crystal", value: 8e-4, target: "global" } },
    { name: "Sulphide Process", id: 8, type: 4, baseCost: { metal: 7500, crystal: 12500, deuterium: 5e3 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "deuterium", value: 8e-4, target: "global" } },
    { name: "High Energy Pump Systems", id: 10, type: 4, baseCost: { metal: 15e3, crystal: 1e4, deuterium: 5e3 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "deuterium", value: 8e-4, target: "global" } },
    { name: "Telekinetic Tractor Beam", id: 16, type: 5, baseCost: { metal: 2e4, crystal: 15e3, deuterium: 7500 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "expo_si", value: 2e-3 } },
    { name: "Magma-Powered Production", id: 18, type: 4, baseCost: { metal: 25e3, crystal: 2e4, deuterium: 1e4 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "all", value: 6e-4, target: "global" } },
    { name: "Enhanced Sensor Technology", id: 20, type: 5, baseCost: { metal: 25e3, crystal: 2e4, deuterium: 1e4 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "expo_res", value: 2e-3 } },
    { name: "Automated Transport Lines", id: 23, type: 4, baseCost: { metal: 5e4, crystal: 5e4, deuterium: 2e4 }, multiplier: 1.5, lifeformId: 3, reduction: "research_centers", effect: { type: "all", value: 6e-4, target: "global" } },
    { name: "Depth Sounding", id: 26, type: 4, baseCost: { metal: 7e4, crystal: 4e4, deuterium: 2e4 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "metal", value: 8e-4, target: "global" } },
    { name: "Enhanced Production Technologies", id: 29, type: 4, baseCost: { metal: 8e4, crystal: 5e4, deuterium: 2e4 }, multiplier: 1.5, lifeformId: 1, reduction: "research_centers", effect: { type: "all", value: 6e-4, target: "global" } },
    { name: "Hardened Diamond Drill Heads", id: 38, type: 4, baseCost: { metal: 85e3, crystal: 4e4, deuterium: 35e3 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "metal", value: 8e-4, target: "global" } },
    { name: "Seismic Mining Technology", id: 42, type: 4, baseCost: { metal: 12e4, crystal: 3e4, deuterium: 25e3 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "crystal", value: 8e-4, target: "global" } },
    { name: "Sixth Sense", id: 44, type: 5, baseCost: { metal: 12e4, crystal: 3e4, deuterium: 25e3 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "expo_res", value: 2e-3 } },
    { name: "Magma-Powered Pump Systems", id: 46, type: 4, baseCost: { metal: 1e5, crystal: 4e4, deuterium: 3e4 }, multiplier: 1.5, lifeformId: 2, reduction: "research_centers", effect: { type: "deuterium", value: 8e-4, target: "global" } },
    { name: "Psychoharmoniser", id: 48, type: 4, baseCost: { metal: 1e5, crystal: 4e4, deuterium: 3e4 }, multiplier: 1.5, lifeformId: 4, reduction: "research_centers", effect: { type: "all", value: 6e-4, target: "global" } },
    { name: "Artificial Swarm Intelligence", id: 51, type: 4, baseCost: { metal: 2e5, crystal: 1e5, deuterium: 1e5 }, multiplier: 1.5, lifeformId: 3, reduction: "research_centers", effect: { type: "all", value: 6e-4, target: "global" } },
    // Level * 1.7 scale
    { name: "Rock’tal Collector Enhancement", id: 70, type: 4, baseCost: { metal: 3e5, crystal: 18e4, deuterium: 12e4 }, multiplier: 1.7, lifeformId: 2, reduction: "research_centers", effect: { type: "all", value: 2e-3, target: "global" } },
    { name: "Kaelesh Discoverer Enhancement", id: 72, type: 5, baseCost: { metal: 3e5, crystal: 18e4, deuterium: 12e4 }, multiplier: 1.7, lifeformId: 4, reduction: "research_centers", effect: { type: "kaelesh_discovery_adv", value: 2e-3 } },
    // Plasma
    {
      name: "Plasma Technology",
      id: 122,
      type: 6,
      baseCost: { metal: 2e3, crystal: 4e3, deuterium: 1e3 },
      costFormula: (level) => ({
        metal: Math.floor(2e3 * Math.pow(2, level - 1)),
        crystal: Math.floor(4e3 * Math.pow(2, level - 1)),
        deuterium: Math.floor(1e3 * Math.pow(2, level - 1))
      }),
      reduction: "improvedStellarator",
      effect: { type: "plasma", value: 1 }
    }
  ];
  function getPlanetTechMultiplier(planet, account) {
    var _a, _b, _c;
    const lfLevel = ((_b = (_a = account == null ? void 0 : account.lifeformExperience) == null ? void 0 : _a.find((e) => e.id === planet.lifeformId || e.lifeformId === planet.lifeformId)) == null ? void 0 : _b.level) || 0;
    const lfLevelBonus = lfLevel * 1e-3;
    let buildingBonus = 0;
    (_c = planet.lifeformBuildings) == null ? void 0 : _c.forEach((b) => {
      const entry = AMORTIZATION_TABLE.find((e) => e.id === b.id);
      if (entry && entry.effect && entry.effect.type === "tech_bonus") {
        buildingBonus += b.level * entry.effect.value;
      }
    });
    return 1 + lfLevelBonus + buildingBonus;
  }
  function calculateEmpireProduction(state) {
    const { account, planets } = state || {};
    const universeSpeed = (account == null ? void 0 : account.universeSpeed) || 1;
    const playerClass = (account == null ? void 0 : account.playerClass) || 0;
    let globalEuroMetal = 0;
    let globalEuroCrystal = 0;
    let globalEuroDeut = 0;
    planets.forEach((p) => {
      var _a;
      const techMult = getPlanetTechMultiplier(p, account);
      (_a = p.lifeformSetup) == null ? void 0 : _a.forEach((t) => {
        const level = t.level || 0;
        const entry = AMORTIZATION_TABLE.find((e) => e.id === t.selectedTechId);
        if (entry && entry.effect && entry.effect.target === "global") {
          const val = entry.effect.value * level * techMult;
          if (entry.effect.type === "metal") globalEuroMetal += val;
          if (entry.effect.type === "crystal") globalEuroCrystal += val;
          if (entry.effect.type === "deuterium") globalEuroDeut += val;
          if (entry.effect.type === "all") {
            globalEuroMetal += val;
            globalEuroCrystal += val;
            globalEuroDeut += val;
          }
        }
      });
    });
    const results = {
      empireBase: { metal: 0, crystal: 0, deuterium: 0 },
      planets: {},
      globalBonuses: { metal: globalEuroMetal, crystal: globalEuroCrystal, deuterium: globalEuroDeut }
    };
    planets.forEach((p) => {
      var _a, _b, _c, _d, _e, _f;
      const m = p.metalMine || 0;
      const c = p.crystalMine || 0;
      const d = p.deuteriumMine || 0;
      const temp = p.tempMax || 20;
      let slot = 0;
      try {
        slot = parseInt(p.coords.split(":")[2]);
      } catch (e) {
      }
      let metalPosFactor = 1;
      if (slot === 6 || slot === 10) metalPosFactor = 1.17;
      else if (slot === 7 || slot === 9) metalPosFactor = 1.23;
      else if (slot === 8) metalPosFactor = 1.35;
      let crystalPosFactor = 1;
      if (slot === 1) crystalPosFactor = 1.4;
      else if (slot === 2) crystalPosFactor = 1.3;
      else if (slot === 3) crystalPosFactor = 1.2;
      const baseMetal = 30 * m * Math.pow(1.1, m) * universeSpeed * metalPosFactor;
      const baseCrystal = 20 * c * Math.pow(1.1, c) * universeSpeed * crystalPosFactor;
      const baseDeut = 10 * d * Math.pow(1.1, d) * (1.44 - 4e-3 * temp) * universeSpeed;
      results.empireBase.metal += baseMetal;
      results.empireBase.crystal += baseCrystal;
      results.empireBase.deuterium += baseDeut;
      const plasmaLevel = ((_b = (_a = account == null ? void 0 : account.researches) == null ? void 0 : _a.find((r) => r.id === 122)) == null ? void 0 : _b.level) || 0;
      const plasmaMetal = plasmaLevel * 0.01;
      const plasmaCrystal = plasmaLevel * (0.66 / 100);
      const plasmaDeut = plasmaLevel * (0.33 / 100);
      let lfbMetal = 0, lfbCrystal = 0, lfbDeut = 0;
      (_c = p.lifeformBuildings) == null ? void 0 : _c.forEach((b) => {
        if (b.id === 12106) lfbMetal += b.level * 0.02;
        if (b.id === 12109) lfbCrystal += b.level * 0.02;
        if (b.id === 12110) lfbDeut += b.level * 0.02;
        if (b.id === 13110) lfbDeut += b.level * 0.02;
        if (b.id === 11106) lfbMetal += b.level * 0.015;
        if (b.id === 11108) {
          lfbCrystal += b.level * 0.015;
          lfbDeut += b.level * 0.01;
        }
      });
      let classMetal = 0, classCrystal = 0, classDeut = 0;
      if (playerClass === 1) {
        classMetal = 0.25;
        classCrystal = 0.25;
        classDeut = 0.25;
      }
      const geologistBonus = (account == null ? void 0 : account.hasGeologist) ? 0.1 : 0;
      const staffBonus = (account == null ? void 0 : account.hasCommander) && (account == null ? void 0 : account.hasAdmiral) && (account == null ? void 0 : account.hasEngineer) && (account == null ? void 0 : account.hasGeologist) && (account == null ? void 0 : account.hasTechnocrat) ? 0.02 : 0;
      const allyTraderBonus = (account == null ? void 0 : account.allianceClass) === 1 ? 0.05 : 0;
      const boosterMetal = ((_d = p.boosters) == null ? void 0 : _d.metal) || 0;
      const boosterCrystal = ((_e = p.boosters) == null ? void 0 : _e.crystal) || 0;
      const boosterDeut = ((_f = p.boosters) == null ? void 0 : _f.deuterium) || 0;
      const multMetal = 1 + plasmaMetal + lfbMetal + globalEuroMetal + classMetal + boosterMetal + geologistBonus + staffBonus + allyTraderBonus;
      const multCrystal = 1 + plasmaCrystal + lfbCrystal + globalEuroCrystal + classCrystal + boosterCrystal + geologistBonus + staffBonus + allyTraderBonus;
      const multDeut = 1 + plasmaDeut + lfbDeut + globalEuroDeut + classDeut + boosterDeut + geologistBonus + staffBonus + allyTraderBonus;
      results.planets[p.id] = {
        base: { metal: baseMetal, crystal: baseCrystal, deuterium: baseDeut },
        mult: { metal: multMetal, crystal: multCrystal, deuterium: multDeut },
        total: {
          metal: baseMetal * multMetal + 30 * universeSpeed,
          crystal: baseCrystal * multCrystal + 15 * universeSpeed,
          deuterium: baseDeut * multDeut
        }
      };
    });
    return results;
  }
  function cleanObject(obj) {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach((key) => cleaned[key] === void 0 && delete cleaned[key]);
    return cleaned;
  }
  function mergeLifeformBuildings(existing, incoming) {
    const result = [...existing];
    incoming.forEach((nb) => {
      if (!nb.name) {
        const staticData = LIFEFORM_BUILDING_DATA.find((sb) => sb.id === nb.id);
        if (staticData) nb.name = staticData.name;
      }
      const idx = result.findIndex((eb) => eb.id === nb.id);
      if (idx !== -1) {
        result[idx] = {
          ...result[idx],
          name: nb.name || result[idx].name,
          level: nb.level
        };
      } else {
        result.push(nb);
      }
    });
    return result;
  }
  function mergeLifeformSetup(existing, incoming, fromEmpire = false) {
    const result = [...existing];
    incoming.forEach((ns) => {
      if (fromEmpire) {
        const idx = result.findIndex((es) => es.slotNumber === ns.slotNumber && es.selectedTechId === ns.selectedTechId);
        if (idx !== -1) {
          result[idx].level = ns.level;
        }
      } else {
        const idx = result.findIndex(
          (es) => ns.slotNumber > 0 && es.slotNumber === ns.slotNumber || ns.slotNumber === 0 && es.selectedTechId === ns.selectedTechId
        );
        if (idx !== -1) {
          const slotNumber = ns.slotNumber > 0 ? ns.slotNumber : result[idx].slotNumber;
          result[idx] = {
            ...result[idx],
            slotNumber,
            selectedTechId: ns.selectedTechId,
            level: ns.level
          };
        } else {
          result.push(ns);
        }
      }
    });
    return result;
  }
  async function fetchPlanetProduction(serverUrl, planetId) {
    const url = `${serverUrl}/game/index.php?page=ingame&component=resourcesettings&cp=${planetId}`;
    try {
      const response = await fetch(url);
      const html = await response.text();
      return parseProduction(html);
    } catch (err) {
      console.error(`Background: Error fetching production for planet ${planetId}`, err);
      return null;
    }
  }
  async function fetchServerData(universe) {
    const domain = universe.includes(".") ? universe : `${universe}.ogame.gameforge.com`;
    const url = `https://${domain}/api/serverData.xml`;
    console.log(`Background: Fetching Server Data from ${url}`);
    try {
      const response = await fetch(url);
      const xml = await response.text();
      return parseServerDataXml(xml);
    } catch (err) {
      console.error(`Background: Error fetching server data for ${universe}`, err);
      return null;
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var _a, _b;
    if (message.type === "OPEN_DASHBOARD") {
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    }
    if (message.type === "FETCH_LATEST_CAPACITIES") {
      const { planetId } = message;
      (async () => {
        try {
          const planet = await db.planets.get(planetId);
          const account = await db.accounts.get((planet == null ? void 0 : planet.playerId) || "");
          if (planet && (account == null ? void 0 : account.serverUrl)) {
            const scraped = await fetchPlanetProduction(account.serverUrl, planetId);
            if (scraped) {
              await db.planets.update(planetId, {
                metalCapacity: scraped.metalCapacity,
                crystalCapacity: scraped.crystalCapacity,
                deuteriumCapacity: scraped.deuteriumCapacity,
                production: {
                  metal: scraped.metal,
                  crystal: scraped.crystal,
                  deuterium: scraped.deuterium,
                  lastUpdated: scraped.lastUpdated
                }
              });
              sendResponse({ success: true });
              return;
            }
          }
          sendResponse({ success: false });
        } catch (err) {
          console.error("OGame Nexus: Error in FETCH_LATEST_CAPACITIES", err);
          sendResponse({ success: false });
        }
      })();
      return true;
    }
    if (message.type === "SYNC_SESSION") {
      const { account, planets, overview, supplies, facilities, production, activePlanetId, lifeformId, researches, lifeformSetup, lifeformExperience, lifeformBuildings, empire } = message.data;
      const syncData = async () => {
        try {
          if (account) {
            const existing = await db.accounts.get(account.playerId);
            let mergedResearches = (existing == null ? void 0 : existing.researches) || [];
            const incomingResearches = researches || ((empire == null ? void 0 : empire.research) ? Object.entries(empire.research).map(([id, level]) => ({ id: parseInt(id), level })) : null);
            if (incomingResearches) {
              const newResearches = [...mergedResearches];
              incomingResearches.forEach((nr) => {
                const idx = newResearches.findIndex((er) => er.id === nr.id);
                if (idx !== -1) {
                  const finalLevel = nr.level > 0 ? nr.level : newResearches[idx].level;
                  newResearches[idx] = { ...newResearches[idx], level: finalLevel };
                } else if (nr.level > 0) {
                  newResearches.push(nr);
                }
              });
              mergedResearches = newResearches;
            }
            let serverData = {};
            if (account.universe) {
              const scraped = await fetchServerData(account.universe);
              if (scraped) serverData = scraped;
            }
            await db.accounts.put(cleanObject({
              ...existing,
              ...account,
              ...serverData,
              ...(overview == null ? void 0 : overview.accountData) || {},
              researches: mergedResearches,
              ...lifeformExperience ? { lifeformExperience } : {},
              lastSeen: Date.now()
            }));
          }
          if (planets && planets.length > 0 && (account == null ? void 0 : account.playerId)) {
            await db.transaction("rw", [db.planets, db.accounts], async () => {
              var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
              const existingPlanets = await db.planets.where("playerId").equals(account.playerId).toArray();
              for (const p of planets) {
                const existing = existingPlanets.find((ep) => ep.id === p.id);
                const isMainPlanet = activePlanetId === p.id;
                const empirePlanet = (_a2 = empire == null ? void 0 : empire.planets) == null ? void 0 : _a2.find((ep) => ep.id === p.id);
                const updateData = cleanObject({
                  ...p,
                  ...empirePlanet,
                  playerId: account.playerId,
                  ...isMainPlanet ? {
                    ...(overview == null ? void 0 : overview.planetData) || {},
                    ...supplies,
                    ...facilities ? {
                      facilities,
                      // Also map array back to individual fields for compatibility
                      roboticsFactory: (_b2 = facilities.find((f) => f.id === 14)) == null ? void 0 : _b2.level,
                      shipyard: (_c = facilities.find((f) => f.id === 21)) == null ? void 0 : _c.level,
                      researchLab: (_d = facilities.find((f) => f.id === 31)) == null ? void 0 : _d.level,
                      allianceDepot: (_e = facilities.find((f) => f.id === 34)) == null ? void 0 : _e.level,
                      missileSilo: (_f = facilities.find((f) => f.id === 44)) == null ? void 0 : _f.level,
                      naniteFactory: (_g = facilities.find((f) => f.id === 15)) == null ? void 0 : _g.level,
                      terraformer: (_h = facilities.find((f) => f.id === 33)) == null ? void 0 : _h.level,
                      spaceDock: (_i = facilities.find((f) => f.id === 36)) == null ? void 0 : _i.level,
                      lunarBase: (_j = facilities.find((f) => f.id === 41)) == null ? void 0 : _j.level,
                      sensorPhalanx: (_k = facilities.find((f) => f.id === 42)) == null ? void 0 : _k.level,
                      jumpGate: (_l = facilities.find((f) => f.id === 43)) == null ? void 0 : _l.level
                    } : {},
                    lifeformId: lifeformId || ((_m = overview == null ? void 0 : overview.planetData) == null ? void 0 : _m.lifeformId) || (empirePlanet == null ? void 0 : empirePlanet.lifeformId) || (existing == null ? void 0 : existing.lifeformId),
                    // Security: LF Tech levels can only go up. Merge incoming with existing.
                    lifeformSetup: mergeLifeformSetup((existing == null ? void 0 : existing.lifeformSetup) || [], lifeformSetup || (empirePlanet == null ? void 0 : empirePlanet.lifeformSetup) || [], !lifeformSetup && !!(empirePlanet == null ? void 0 : empirePlanet.lifeformSetup)),
                    // Merge Buildings: Keep all, update levels for those found on the page
                    lifeformBuildings: mergeLifeformBuildings((existing == null ? void 0 : existing.lifeformBuildings) || [], lifeformBuildings || (empirePlanet == null ? void 0 : empirePlanet.lifeformBuildings) || []),
                    ...production && (production.metal > 0 || production.crystal > 0 || production.deuterium > 0) ? {
                      production: {
                        metal: production.metal,
                        crystal: production.crystal,
                        deuterium: production.deuterium,
                        lastUpdated: production.lastUpdated
                      },
                      metalCapacity: production.metalCapacity,
                      crystalCapacity: production.crystalCapacity,
                      deuteriumCapacity: production.deuteriumCapacity
                    } : {}
                  } : {
                    // Even if not the active planet, if we have empire data for it, merge it
                    ships: (empirePlanet == null ? void 0 : empirePlanet.ships) || (existing == null ? void 0 : existing.ships),
                    defenses: (empirePlanet == null ? void 0 : empirePlanet.defenses) || (existing == null ? void 0 : existing.defenses),
                    lifeformBuildings: mergeLifeformBuildings((existing == null ? void 0 : existing.lifeformBuildings) || [], (empirePlanet == null ? void 0 : empirePlanet.lifeformBuildings) || []),
                    lifeformSetup: mergeLifeformSetup((existing == null ? void 0 : existing.lifeformSetup) || [], (empirePlanet == null ? void 0 : empirePlanet.lifeformSetup) || [], true)
                  }
                });
                if (existing) {
                  await db.planets.update(p.id, updateData);
                } else {
                  await db.planets.put({
                    ...updateData,
                    sandboxSetup: [],
                    // Initialize new planets with empty sandbox
                    lifeformSetup: []
                  });
                }
              }
              const updatedPlanets = await db.planets.where("playerId").equals(account.playerId).toArray();
              const updatedAccount = await db.accounts.get(account.playerId);
              if (updatedAccount) {
                const now = Date.now();
                for (const pl of updatedPlanets) {
                  if (pl.activeItems && pl.activeItems.length > 0) {
                    const activeCount = pl.activeItems.length;
                    const remainingItems = pl.activeItems.filter((item) => !item.expiryTimestamp || item.expiryTimestamp > now);
                    if (remainingItems.length < activeCount) {
                      const boosters = { metal: 0, crystal: 0, deuterium: 0 };
                      remainingItems.forEach((item) => {
                        if (item.bonus && item.bonus > 0) {
                          if (item.type === "metal") boosters.metal += item.bonus;
                          else if (item.type === "crystal") boosters.crystal += item.bonus;
                          else if (item.type === "deuterium") boosters.deuterium += item.bonus;
                          else if (item.type === "resource") {
                            boosters.metal += item.bonus;
                            boosters.crystal += item.bonus;
                            boosters.deuterium += item.bonus;
                          }
                        }
                      });
                      pl.activeItems = remainingItems;
                      pl.boosters = boosters;
                      await db.planets.update(pl.id, { activeItems: pl.activeItems, boosters: pl.boosters });
                    }
                  }
                }
                const productionResults = calculateEmpireProduction({
                  account: updatedAccount,
                  planets: updatedPlanets
                });
                for (const pl of updatedPlanets) {
                  const prod = (_n = productionResults.planets[pl.id]) == null ? void 0 : _n.total;
                  if (prod) {
                    await db.planets.update(pl.id, {
                      production: {
                        metal: Math.floor(prod.metal),
                        crystal: Math.floor(prod.crystal),
                        deuterium: Math.floor(prod.deuterium),
                        lastUpdated: Date.now()
                      }
                    });
                  }
                }
              }
              if (message.data.isFullPlanetList) {
                const visibleIds = planets.map((p) => p.id);
                const destroyedIds = existingPlanets.filter((p) => !visibleIds.includes(p.id)).map((p) => p.id);
                if (destroyedIds.length > 0) await db.planets.bulkDelete(destroyedIds);
              }
            });
          }
        } catch (err) {
          console.error("OGame Nexus: Background sync error", err);
        }
      };
      syncData();
    }
    if (message.type === "TRACK_EXPEDITIONS") {
      const { expeditions, playerId } = message.data;
      (async () => {
        try {
          const messageIds = expeditions.map((e) => e.messageId);
          const existingExpeditions = await db.expeditions.bulkGet(messageIds);
          const newExpeditions = [];
          const finalResults = [];
          const toUpdate = [];
          expeditions.forEach((exp, index) => {
            const existing = existingExpeditions[index];
            if (!existing) {
              const newEntry = { ...exp, tracked: true, playerId };
              newExpeditions.push(newEntry);
              finalResults.push({ ...newEntry, isNew: true });
            } else {
              if (!existing.resultDetails && exp.resultDetails) {
                existing.resultDetails = exp.resultDetails;
                toUpdate.push(existing);
              }
              finalResults.push(existing);
            }
          });
          if (newExpeditions.length > 0) {
            await db.expeditions.bulkPut(newExpeditions);
          }
          if (toUpdate.length > 0) {
            await db.expeditions.bulkPut(toUpdate);
          }
          sendResponse({ success: true, data: finalResults, newCount: newExpeditions.length });
        } catch (err) {
          console.error("OGame Nexus: Expedition tracking error", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "GET_TODAY_EXPEDITION_STATS") {
      const playerId = String(message.data.playerId).trim();
      (async () => {
        try {
          const now = /* @__PURE__ */ new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1e3;
          const [todayExpeditions, todayLifeforms] = await Promise.all([
            db.expeditions.where("timestamp").aboveOrEqual(startOfDay).filter((exp) => String(exp.playerId).trim() === playerId).toArray(),
            db.lifeformDiscoveries.where("timestamp").aboveOrEqual(startOfDay).filter((disc) => String(disc.playerId).trim() === playerId).toArray()
          ]);
          const totals = { metal: 0, crystal: 0, deuterium: 0, darkMatter: 0, artifacts: 0, items: 0 };
          todayExpeditions.forEach((exp) => {
            var _a2, _b2, _c, _d, _e;
            const type = (exp.result || "").toLowerCase();
            if (type === "resources" || type === "ressources") {
              totals.metal += ((_a2 = exp.resultDetails) == null ? void 0 : _a2.metal) || 0;
              totals.crystal += ((_b2 = exp.resultDetails) == null ? void 0 : _b2.crystal) || 0;
              totals.deuterium += ((_c = exp.resultDetails) == null ? void 0 : _c.deuterium) || 0;
            } else if (type === "dark-matter" || type === "darkmatter") {
              totals.darkMatter += ((_d = exp.resultDetails) == null ? void 0 : _d.darkMatter) || ((_e = exp.resultDetails) == null ? void 0 : _e.darkmatter) || 0;
            } else if (type === "item" || type === "items") {
              if (Array.isArray(exp.resultDetails)) {
                totals.items += exp.resultDetails.reduce((acc, i) => acc + (i.amount || 0), 0);
              } else {
                totals.items += 1;
              }
            }
          });
          todayLifeforms.forEach((disc) => {
            if (disc.discoveryType === "artifacts") {
              totals.artifacts += disc.artifactsFound || 0;
            }
          });
          sendResponse({ success: true, totals });
        } catch (err) {
          console.error("OGame Nexus: Error getting today stats", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "GET_RECENT_EXPEDITIONS") {
      const playerId = String(message.data.playerId).trim();
      const limit = message.data.limit || 20;
      (async () => {
        try {
          const [recentExp, recentLf] = await Promise.all([
            db.expeditions.where("playerId").equals(playerId).toArray(),
            db.lifeformDiscoveries.where("playerId").equals(playerId).toArray()
          ]);
          const merged = [
            ...recentExp.map((e) => ({ ...e, type: "expedition" })),
            ...recentLf.map((l) => ({ ...l, type: "lifeform" }))
          ];
          merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          const sliced = merged.slice(0, limit);
          sendResponse({ success: true, expeditions: sliced });
        } catch (err) {
          console.error("OGame Nexus: Error getting recent expeditions", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "TRACK_LIFEFORMS") {
      const { discoveries, playerId } = message.data;
      (async () => {
        try {
          const messageIds = discoveries.map((d) => d.messageId);
          const existingDiscoveries = await db.lifeformDiscoveries.bulkGet(messageIds);
          const newDiscoveries = [];
          const finalResults = [];
          discoveries.forEach((disc, index) => {
            const existing = existingDiscoveries[index];
            if (!existing) {
              const newEntry = { ...disc, tracked: true, playerId };
              newDiscoveries.push(newEntry);
              finalResults.push({ ...newEntry, isNew: true });
            } else {
              finalResults.push(existing);
            }
          });
          if (newDiscoveries.length > 0) {
            await db.lifeformDiscoveries.bulkPut(newDiscoveries);
          }
          sendResponse({ success: true, data: finalResults, newCount: newDiscoveries.length });
        } catch (err) {
          console.error("OGame Nexus: Lifeform tracking error", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "GET_ALL_ANALYTICS") {
      const playerId = String(message.playerId || ((_a = message.data) == null ? void 0 : _a.playerId) || "").trim();
      (async () => {
        try {
          const results = await db.expeditions.filter((exp) => String(exp.playerId).trim() === playerId).toArray();
          const lifeforms = await db.lifeformDiscoveries.filter((lf) => String(lf.playerId).trim() === playerId).toArray();
          const allCombats = await db.combatReports.toArray();
          const combats = allCombats.filter((c) => {
            if (!c.playerId) {
              c.playerId = playerId;
              db.combatReports.put(c);
              return true;
            }
            return String(c.playerId).trim() === playerId;
          });
          const debrisHarvests = await db.debrisHarvests.filter((d) => String(d.playerId).trim() === playerId).toArray();
          sendResponse({ success: true, expeditions: results, lifeforms, combats, debrisHarvests });
        } catch (err) {
          console.error("OGame Nexus: Error fetching analytics", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "GET_ALL_EXPEDITIONS") {
      const playerId = String(message.playerId || ((_b = message.data) == null ? void 0 : _b.playerId) || "").trim();
      (async () => {
        try {
          const results = await db.expeditions.filter((exp) => String(exp.playerId).trim() === playerId).toArray();
          const lifeforms = await db.lifeformDiscoveries.filter((lf) => String(lf.playerId).trim() === playerId).toArray();
          sendResponse({ success: true, expeditions: results, lifeforms });
        } catch (err) {
          console.error("OGame Nexus: Error fetching expeditions", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "TRACK_DEBRIS") {
      const { harvests, playerId } = message.data;
      (async () => {
        try {
          const messageIds = harvests.map((d) => d.messageId);
          const existingHarvests = await db.debrisHarvests.bulkGet(messageIds);
          const newHarvests = [];
          const finalResults = [];
          harvests.forEach((harvest, index) => {
            const existing = existingHarvests[index];
            if (!existing) {
              const newEntry = { ...harvest, tracked: true, playerId };
              newHarvests.push(newEntry);
              finalResults.push({ ...newEntry, isNew: true });
            } else {
              finalResults.push(existing);
            }
          });
          if (newHarvests.length > 0) {
            await db.debrisHarvests.bulkPut(newHarvests);
          }
          sendResponse({ success: true, data: finalResults, newCount: newHarvests.length });
        } catch (err) {
          console.error("OGame Nexus: Debris tracking error", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "FETCH_COMBAT_REPORT") {
      const { apiKey } = message;
      fetch(`https://ogapi.faw-kes.de/v1/report/${apiKey}/1`).then((response) => response.json()).then((data) => sendResponse({ success: true, data })).catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    }
    if (message.type === "GET_AMORTIZATION_TODOS") {
      (async () => {
        var _a2, _b2, _c;
        try {
          const todos = await db.todoProjects.toArray();
          const account = await db.accounts.toCollection().last();
          const planets = await db.planets.toArray();
          const toDelete = [];
          for (const todo of todos) {
            let currentLevel = 0;
            let typeNum = parseInt(todo.type);
            if (isNaN(typeNum)) {
              if (todo.type === "Mines") typeNum = 1;
              else if (todo.type === "LifeformProductionBuildings") typeNum = 2;
              else if (todo.type === "LifeformResearchBuildings") typeNum = 3;
              else if (todo.type === "LifeformProductionResearches") typeNum = 4;
              else if (todo.type === "LifeformExpeditionResearches") typeNum = 5;
              else if (todo.type === "PlasmaTechnology") typeNum = 6;
            }
            if (typeNum === 1) {
              const planet = planets.find((p) => String(p.id) === String(todo.planetId));
              if (planet) {
                if (todo.name.includes("Metal Mine")) currentLevel = planet.metalMine || 0;
                else if (todo.name.includes("Crystal Mine")) currentLevel = planet.crystalMine || 0;
                else if (todo.name.includes("Deuterium")) currentLevel = planet.deuteriumMine || 0;
              }
            } else if (typeNum === 2 || typeNum === 3) {
              const planet = planets.find((p) => String(p.id) === String(todo.planetId));
              const entry = AMORTIZATION_TABLE.find((e) => e.name === todo.name);
              if (planet && (entry == null ? void 0 : entry.id)) {
                const b = (_a2 = planet.lifeformBuildings) == null ? void 0 : _a2.find((lb) => Number(lb.id) === Number(entry.id));
                currentLevel = (b == null ? void 0 : b.level) || 0;
              }
            } else if (typeNum === 4 || typeNum === 5) {
              const planet = planets.find((p) => String(p.id) === String(todo.planetId));
              const entry = AMORTIZATION_TABLE.find((e) => e.name === todo.name);
              if (planet && (entry == null ? void 0 : entry.id)) {
                const t = (_b2 = planet.lifeformSetup) == null ? void 0 : _b2.find((lt) => Number(lt.selectedTechId) === Number(entry.id));
                currentLevel = (t == null ? void 0 : t.level) || 0;
              }
            } else if (typeNum === 6) {
              const res = (_c = account == null ? void 0 : account.researches) == null ? void 0 : _c.find((r) => r.id === 122);
              currentLevel = (res == null ? void 0 : res.level) || 0;
            }
            if (currentLevel >= todo.targetLevel) {
              toDelete.push(todo.id);
            }
          }
          if (toDelete.length > 0) {
            await db.todoProjects.bulkDelete(toDelete);
          }
          const finalTodos = await db.todoProjects.toArray();
          finalTodos.sort((a, b) => (a.roiHours || 0) - (b.roiHours || 0));
          const formatted = finalTodos.map((t) => {
            const planet = planets.find((p) => p.id === t.planetId);
            return {
              ...t,
              roiDays: Math.ceil((t.roiHours || 0) / 24),
              planetImg: planet == null ? void 0 : planet.imgUrl,
              planetName: (planet == null ? void 0 : planet.name) || t.planetName
            };
          });
          sendResponse({ success: true, todos: formatted });
        } catch (err) {
          console.error("OGame Nexus: Error getting todos", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "REMOVE_AMORTIZATION_TODO") {
      (async () => {
        try {
          await db.todoProjects.delete(message.id);
          sendResponse({ success: true });
        } catch (err) {
          console.error("OGame Nexus: Error deleting todo", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "TRACK_COMBATS") {
      const { combats, playerId } = message.data;
      (async () => {
        try {
          const messageIds = combats.map((c) => c.messageId);
          const existingCombats = await db.combatReports.bulkGet(messageIds);
          const newCombats = [];
          const finalResults = [];
          combats.forEach((combat, index) => {
            const existing = existingCombats[index];
            if (!existing) {
              const newEntry = { ...combat, playerId, isNew: true };
              newCombats.push(newEntry);
              finalResults.push(newEntry);
            } else {
              finalResults.push({ ...existing, isNew: false });
            }
          });
          if (newCombats.length > 0) {
            await db.combatReports.bulkAdd(newCombats);
          }
          sendResponse({ success: true, data: finalResults, newCount: newCombats.length });
        } catch (err) {
          console.error("OGame Nexus: Error tracking combats", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
    if (message.type === "DEBUG_DELETE_LAST_40_EXPEDITIONS") {
      const pId = String(message.playerId || "").trim();
      (async () => {
        try {
          const getLatestIds = async (table, limit) => {
            const items = await table.where("playerId").equals(pId).toArray();
            items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            return items.slice(0, limit).map((i) => i.messageId);
          };
          const expIds = await getLatestIds(db.expeditions, 40);
          const lfIds = await getLatestIds(db.lifeformDiscoveries, 40);
          const dIds = await getLatestIds(db.debrisHarvests, 40);
          if (expIds.length > 0) await db.expeditions.bulkDelete(expIds);
          if (lfIds.length > 0) await db.lifeformDiscoveries.bulkDelete(lfIds);
          if (dIds.length > 0) await db.debrisHarvests.bulkDelete(dIds);
          const total = expIds.length + lfIds.length + dIds.length;
          sendResponse({ success: true, count: total });
        } catch (err) {
          console.error("OGame Nexus: Debug delete error", err);
          sendResponse({ success: false, error: String(err) });
        }
      })();
      return true;
    }
  });
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  });
})();
