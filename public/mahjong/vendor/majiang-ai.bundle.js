var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@kobalab/majiang-core/lib/rule.js
var require_rule = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/rule.js"(exports, module) {
    "use strict";
    module.exports = function(param = {}) {
      let rule = {
        /* 点数関連 */
        "\u914D\u7D66\u539F\u70B9": 25e3,
        "\u9806\u4F4D\u70B9": ["20.0", "10.0", "-10.0", "-20.0"],
        "\u9023\u98A8\u724C\u306F2\u7B26": false,
        /* 赤牌有無/クイタンなど */
        "\u8D64\u724C": { m: 1, p: 1, s: 1 },
        "\u30AF\u30A4\u30BF\u30F3\u3042\u308A": true,
        "\u55B0\u3044\u66FF\u3048\u8A31\u53EF\u30EC\u30D9\u30EB": 0,
        // 0: 喰い替えなし, 1: スジ喰い替えあり,  2: 現物喰い替えもあり
        /* 局数関連 */
        "\u5834\u6570": 2,
        // 0: 一局戦, 1: 東風戦, 2： 東南戦, 4: 一荘戦
        "\u9014\u4E2D\u6D41\u5C40\u3042\u308A": true,
        "\u6D41\u3057\u6E80\u8CAB\u3042\u308A": true,
        "\u30CE\u30FC\u30C6\u30F3\u5BA3\u8A00\u3042\u308A": false,
        "\u30CE\u30FC\u30C6\u30F3\u7F70\u3042\u308A": true,
        "\u6700\u5927\u540C\u6642\u548C\u4E86\u6570": 2,
        // 1: 頭ハネ, 2: ダブロンあり, 3: トリロンあり
        "\u9023\u8358\u65B9\u5F0F": 2,
        // 0: 連荘なし, 1: 和了連荘, 2: テンパイ連荘, 3: ノーテン連荘
        "\u30C8\u30D3\u7D42\u4E86\u3042\u308A": true,
        "\u30AA\u30FC\u30E9\u30B9\u6B62\u3081\u3042\u308A": true,
        "\u5EF6\u9577\u6226\u65B9\u5F0F": 1,
        // 0: 延長戦なし, 1: サドンデス, 2: 連荘優先サドンデス, 3: 4局固定
        /* リーチ/ドラ関連 */
        "\u4E00\u767A\u3042\u308A": true,
        "\u88CF\u30C9\u30E9\u3042\u308A": true,
        "\u30AB\u30F3\u30C9\u30E9\u3042\u308A": true,
        "\u30AB\u30F3\u88CF\u3042\u308A": true,
        "\u30AB\u30F3\u30C9\u30E9\u5F8C\u4E57\u305B": true,
        "\u30C4\u30E2\u756A\u306A\u3057\u30EA\u30FC\u30C1\u3042\u308A": false,
        "\u30EA\u30FC\u30C1\u5F8C\u6697\u69D3\u8A31\u53EF\u30EC\u30D9\u30EB": 2,
        // 0: 暗槓不可, 1: 牌姿の変わる暗槓不可, 2： 待ちの変わる暗槓不可
        /* 役満関連 */
        "\u5F79\u6E80\u306E\u8907\u5408\u3042\u308A": true,
        "\u30C0\u30D6\u30EB\u5F79\u6E80\u3042\u308A": true,
        "\u6570\u3048\u5F79\u6E80\u3042\u308A": true,
        "\u5F79\u6E80\u30D1\u30AA\u3042\u308A": true,
        "\u5207\u308A\u4E0A\u3052\u6E80\u8CAB\u3042\u308A": false
      };
      for (let key of Object.keys(param)) {
        rule[key] = param[key];
      }
      return rule;
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/shoupai.js
var require_shoupai = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/shoupai.js"(exports, module) {
    "use strict";
    module.exports = class Shoupai {
      static valid_pai(p) {
        if (p.match(/^(?:[mps]\d|z[1-7])_?\*?[\+\=\-]?$/)) return p;
      }
      static valid_mianzi(m) {
        if (m.match(/^z.*[089]/)) return;
        let h = m.replace(/0/g, "5");
        if (h.match(/^[mpsz](\d)\1\1[\+\=\-]\1?$/)) {
          return m.replace(/([mps])05/, "$150");
        } else if (h.match(/^[mpsz](\d)\1\1\1[\+\=\-]?$/)) {
          return m[0] + m.match(/\d(?![\+\=\-])/g).sort().reverse().join("") + (m.match(/\d[\+\=\-]$/) || [""])[0];
        } else if (h.match(/^[mps]\d+\-\d*$/)) {
          let hongpai = m.match(/0/);
          let nn = h.match(/\d/g).sort();
          if (nn.length != 3) return;
          if (+nn[0] + 1 != +nn[1] || +nn[1] + 1 != +nn[2]) return;
          h = h[0] + h.match(/\d[\+\=\-]?/g).sort().join("");
          return hongpai ? h.replace(/5/, "0") : h;
        }
      }
      constructor(qipai = []) {
        this._bingpai = {
          _: 0,
          m: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          p: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          z: [0, 0, 0, 0, 0, 0, 0, 0]
        };
        this._fulou = [];
        this._zimo = null;
        this._lizhi = false;
        for (let p of qipai) {
          if (p == "_") {
            this._bingpai._++;
            continue;
          }
          if (!(p = Shoupai.valid_pai(p))) throw new Error(p);
          let s = p[0], n = +p[1];
          if (this._bingpai[s][n] == 4) throw new Error([this, p]);
          this._bingpai[s][n]++;
          if (s != "z" && n == 0) this._bingpai[s][5]++;
        }
      }
      static fromString(paistr = "") {
        let fulou = paistr.split(",");
        let bingpai = fulou.shift();
        let qipai = bingpai.match(/^_*/)[0].match(/_/g) || [];
        for (let suitstr of bingpai.match(/[mpsz]\d+_*/g) || []) {
          let s = suitstr[0];
          for (let n of suitstr.match(/\d/g)) {
            if (s == "z" && (n < 1 || 7 < n)) continue;
            qipai.push(s + n);
          }
          qipai = qipai.concat(suitstr.match(/_/g) || []);
        }
        qipai = qipai.slice(0, 14 - fulou.filter((x) => x).length * 3);
        let zimo = qipai.length + fulou.length * 3 == 14 && qipai.slice(-1)[0];
        const shoupai = new Shoupai(qipai);
        let last;
        for (let m of fulou) {
          if (!m) {
            shoupai._zimo = last;
            break;
          }
          m = Shoupai.valid_mianzi(m);
          if (m) {
            shoupai._fulou.push(m);
            last = m;
          }
        }
        shoupai._zimo = shoupai._zimo || zimo || null;
        shoupai._lizhi = bingpai.slice(-1) == "*";
        return shoupai;
      }
      toString() {
        let paistr = "";
        for (let s of ["m", "p", "s", "z"]) {
          let suitstr = s;
          let bingpai = this._bingpai[s];
          let n_hongpai = s == "z" ? 0 : bingpai[0];
          for (let n = 1; n < bingpai.length; n++) {
            let n_pai = bingpai[n];
            if (this._zimo) {
              if (s + n == this._zimo) {
                n_pai--;
              }
              if (n == 5 && s + 0 == this._zimo) {
                n_pai--;
                n_hongpai--;
              }
            }
            for (let i = 0; i < n_pai; i++) {
              if (n == 5 && n_hongpai > 0) {
                suitstr += 0;
                n_hongpai--;
              } else {
                suitstr += n;
              }
            }
          }
          if (suitstr.length > 1) paistr += suitstr;
        }
        paistr += "_".repeat(this._bingpai._ + (this._zimo == "_" ? -1 : 0));
        if (this._zimo && this._zimo.length <= 2) paistr += this._zimo;
        if (this._lizhi) paistr += "*";
        for (let m of this._fulou) {
          paistr += "," + m;
        }
        if (this._zimo && this._zimo.length > 2) paistr += ",";
        return paistr;
      }
      clone() {
        const shoupai = new Shoupai();
        shoupai._bingpai = {
          _: this._bingpai._,
          m: this._bingpai.m.concat(),
          p: this._bingpai.p.concat(),
          s: this._bingpai.s.concat(),
          z: this._bingpai.z.concat()
        };
        shoupai._fulou = this._fulou.concat();
        shoupai._zimo = this._zimo;
        shoupai._lizhi = this._lizhi;
        return shoupai;
      }
      fromString(paistr) {
        const shoupai = Shoupai.fromString(paistr);
        this._bingpai = {
          _: shoupai._bingpai._,
          m: shoupai._bingpai.m.concat(),
          p: shoupai._bingpai.p.concat(),
          s: shoupai._bingpai.s.concat(),
          z: shoupai._bingpai.z.concat()
        };
        this._fulou = shoupai._fulou.concat();
        this._zimo = shoupai._zimo;
        this._lizhi = shoupai._lizhi;
        return this;
      }
      decrease(s, n) {
        let bingpai = this._bingpai[s];
        n = +n;
        if (bingpai[n] == 0 || n == 5 && bingpai[0] == bingpai[5]) {
          if (this._bingpai._ == 0) throw new Error([this, s + n]);
          this._bingpai._--;
        } else {
          bingpai[n]--;
          if (n == 0) bingpai[5]--;
        }
      }
      zimo(p, check = true) {
        if (check && this._zimo) throw new Error([this, p]);
        if (p == "_") {
          this._bingpai._++;
          this._zimo = p;
        } else {
          if (!Shoupai.valid_pai(p)) throw new Error(p);
          let s = p[0], n = +p[1];
          let bingpai = this._bingpai[s];
          if (bingpai[n] == 4) throw new Error([this, p]);
          bingpai[n]++;
          if (n == 0) {
            if (bingpai[5] == 4) throw new Error([this, p]);
            bingpai[5]++;
          }
          this._zimo = s + n;
        }
        return this;
      }
      dapai(p, check = true) {
        if (check && !this._zimo) throw new Error([this, p]);
        if (!Shoupai.valid_pai(p)) throw new Error(p);
        let s = p[0], n = +p[1];
        this.decrease(s, n);
        this._zimo = null;
        if (p.slice(-1) == "*") this._lizhi = true;
        return this;
      }
      fulou(m, check = true) {
        if (check && this._zimo) throw new Error([this, m]);
        if (m != Shoupai.valid_mianzi(m)) throw new Error(m);
        if (m.match(/\d{4}$/)) throw new Error([this, m]);
        if (m.match(/\d{3}[\+\=\-]\d$/)) throw new Error([this, m]);
        let s = m[0];
        for (let n of m.match(/\d(?![\+\=\-])/g)) {
          this.decrease(s, n);
        }
        this._fulou.push(m);
        if (!m.match(/\d{4}/)) this._zimo = m;
        return this;
      }
      gang(m, check = true) {
        if (check && !this._zimo) throw new Error([this, m]);
        if (check && this._zimo.length > 2) throw new Error([this, m]);
        if (m != Shoupai.valid_mianzi(m)) throw new Error(m);
        let s = m[0];
        if (m.match(/\d{4}$/)) {
          for (let n of m.match(/\d/g)) {
            this.decrease(s, n);
          }
          this._fulou.push(m);
        } else if (m.match(/\d{3}[\+\=\-]\d$/)) {
          let m1 = m.slice(0, 5);
          let i = this._fulou.findIndex((m2) => m1 == m2);
          if (i < 0) throw new Error([this, m]);
          this._fulou[i] = m;
          this.decrease(s, m.slice(-1));
        } else throw new Error([this, m]);
        this._zimo = null;
        return this;
      }
      get menqian() {
        return this._fulou.filter((m) => m.match(/[\+\=\-]/)).length == 0;
      }
      get lizhi() {
        return this._lizhi;
      }
      get_dapai(check = true) {
        if (!this._zimo) return null;
        let deny = {};
        if (check && this._zimo.length > 2) {
          let m = this._zimo;
          let s = m[0];
          let n = +m.match(/\d(?=[\+\=\-])/) || 5;
          deny[s + n] = true;
          if (!m.replace(/0/, "5").match(/^[mpsz](\d)\1\1/)) {
            if (n < 7 && m.match(/^[mps]\d\-\d\d$/)) deny[s + (n + 3)] = true;
            if (3 < n && m.match(/^[mps]\d\d\d\-$/)) deny[s + (n - 3)] = true;
          }
        }
        let dapai = [];
        if (!this._lizhi) {
          for (let s of ["m", "p", "s", "z"]) {
            let bingpai = this._bingpai[s];
            for (let n = 1; n < bingpai.length; n++) {
              if (bingpai[n] == 0) continue;
              if (deny[s + n]) continue;
              if (s + n == this._zimo && bingpai[n] == 1) continue;
              if (s == "z" || n != 5) dapai.push(s + n);
              else {
                if (bingpai[0] > 0 && s + 0 != this._zimo || bingpai[0] > 1)
                  dapai.push(s + 0);
                if (bingpai[0] < bingpai[5]) dapai.push(s + n);
              }
            }
          }
        }
        if (this._zimo.length == 2) dapai.push(this._zimo + "_");
        return dapai;
      }
      get_chi_mianzi(p, check = true) {
        if (this._zimo) return null;
        if (!Shoupai.valid_pai(p)) throw new Error(p);
        let mianzi = [];
        let s = p[0], n = +p[1] || 5, d = p.match(/[\+\=\-]$/);
        if (!d) throw new Error(p);
        if (s == "z" || d != "-") return mianzi;
        if (this._lizhi) return mianzi;
        let bingpai = this._bingpai[s];
        if (3 <= n && bingpai[n - 2] > 0 && bingpai[n - 1] > 0) {
          if (!check || (3 < n ? bingpai[n - 3] : 0) + bingpai[n] < 14 - (this._fulou.length + 1) * 3) {
            if (n - 2 == 5 && bingpai[0] > 0) mianzi.push(s + "067-");
            if (n - 1 == 5 && bingpai[0] > 0) mianzi.push(s + "406-");
            if (n - 2 != 5 && n - 1 != 5 || bingpai[0] < bingpai[5])
              mianzi.push(s + (n - 2) + (n - 1) + (p[1] + d));
          }
        }
        if (2 <= n && n <= 8 && bingpai[n - 1] > 0 && bingpai[n + 1] > 0) {
          if (!check || bingpai[n] < 14 - (this._fulou.length + 1) * 3) {
            if (n - 1 == 5 && bingpai[0] > 0) mianzi.push(s + "06-7");
            if (n + 1 == 5 && bingpai[0] > 0) mianzi.push(s + "34-0");
            if (n - 1 != 5 && n + 1 != 5 || bingpai[0] < bingpai[5])
              mianzi.push(s + (n - 1) + (p[1] + d) + (n + 1));
          }
        }
        if (n <= 7 && bingpai[n + 1] > 0 && bingpai[n + 2] > 0) {
          if (!check || bingpai[n] + (n < 7 ? bingpai[n + 3] : 0) < 14 - (this._fulou.length + 1) * 3) {
            if (n + 1 == 5 && bingpai[0] > 0) mianzi.push(s + "4-06");
            if (n + 2 == 5 && bingpai[0] > 0) mianzi.push(s + "3-40");
            if (n + 1 != 5 && n + 2 != 5 || bingpai[0] < bingpai[5])
              mianzi.push(s + (p[1] + d) + (n + 1) + (n + 2));
          }
        }
        return mianzi;
      }
      get_peng_mianzi(p) {
        if (this._zimo) return null;
        if (!Shoupai.valid_pai(p)) throw new Error(p);
        let mianzi = [];
        let s = p[0], n = +p[1] || 5, d = p.match(/[\+\=\-]$/);
        if (!d) throw new Error(p);
        if (this._lizhi) return mianzi;
        let bingpai = this._bingpai[s];
        if (bingpai[n] >= 2) {
          if (n == 5 && bingpai[0] >= 2) mianzi.push(s + "00" + p[1] + d);
          if (n == 5 && bingpai[0] >= 1 && bingpai[5] - bingpai[0] >= 1)
            mianzi.push(s + "50" + p[1] + d);
          if (n != 5 || bingpai[5] - bingpai[0] >= 2)
            mianzi.push(s + n + n + p[1] + d);
        }
        return mianzi;
      }
      get_gang_mianzi(p) {
        let mianzi = [];
        if (p) {
          if (this._zimo) return null;
          if (!Shoupai.valid_pai(p)) throw new Error(p);
          let s = p[0], n = +p[1] || 5, d = p.match(/[\+\=\-]$/);
          if (!d) throw new Error(p);
          if (this._lizhi) return mianzi;
          let bingpai = this._bingpai[s];
          if (bingpai[n] == 3) {
            if (n == 5) mianzi = [s + "5".repeat(3 - bingpai[0]) + "0".repeat(bingpai[0]) + p[1] + d];
            else mianzi = [s + n + n + n + n + d];
          }
        } else {
          if (!this._zimo) return null;
          if (this._zimo.length > 2) return null;
          let p2 = this._zimo.replace(/0/, "5");
          for (let s of ["m", "p", "s", "z"]) {
            let bingpai = this._bingpai[s];
            for (let n = 1; n < bingpai.length; n++) {
              if (bingpai[n] == 0) continue;
              if (bingpai[n] == 4) {
                if (this._lizhi && s + n != p2) continue;
                if (n == 5) mianzi.push(s + "5".repeat(4 - bingpai[0]) + "0".repeat(bingpai[0]));
                else mianzi.push(s + n + n + n + n);
              } else {
                if (this._lizhi) continue;
                for (let m of this._fulou) {
                  if (m.replace(/0/g, "5").slice(0, 4) == s + n + n + n) {
                    if (n == 5 && bingpai[0] > 0) mianzi.push(m + 0);
                    else mianzi.push(m + n);
                  }
                }
              }
            }
          }
        }
        return mianzi;
      }
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/shan.js
var require_shan = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/shan.js"(exports, module) {
    "use strict";
    var Majiang2 = { Shoupai: require_shoupai() };
    module.exports = class Shan {
      static zhenbaopai(p) {
        if (!Majiang2.Shoupai.valid_pai(p)) throw new Error(p);
        let s = p[0], n = +p[1] || 5;
        return s == "z" ? n < 5 ? s + (n % 4 + 1) : s + ((n - 4) % 3 + 5) : s + (n % 9 + 1);
      }
      constructor(rule) {
        this._rule = rule;
        let hongpai = rule["\u8D64\u724C"];
        let pai = [];
        for (let s of ["m", "p", "s", "z"]) {
          for (let n = 1; n <= (s == "z" ? 7 : 9); n++) {
            for (let i = 0; i < 4; i++) {
              if (n == 5 && i < hongpai[s]) pai.push(s + 0);
              else pai.push(s + n);
            }
          }
        }
        this._pai = [];
        while (pai.length) {
          this._pai.push(pai.splice(Math.random() * pai.length, 1)[0]);
        }
        this._baopai = [this._pai[4]];
        this._fubaopai = rule["\u88CF\u30C9\u30E9\u3042\u308A"] ? [this._pai[9]] : null;
        this._weikaigang = false;
        this._closed = false;
      }
      zimo() {
        if (this._closed) throw new Error(this);
        if (this.paishu == 0) throw new Error(this);
        if (this._weikaigang) throw new Error(this);
        return this._pai.pop();
      }
      gangzimo() {
        if (this._closed) throw new Error(this);
        if (this.paishu == 0) throw new Error(this);
        if (this._weikaigang) throw new Error(this);
        if (this._baopai.length == 5) throw new Error(this);
        this._weikaigang = this._rule["\u30AB\u30F3\u30C9\u30E9\u3042\u308A"];
        if (!this._weikaigang) this._baopai.push("");
        return this._pai.shift();
      }
      kaigang() {
        if (this._closed) throw new Error(this);
        if (!this._weikaigang) throw new Error(this);
        this._baopai.push(this._pai[4]);
        if (this._fubaopai && this._rule["\u30AB\u30F3\u88CF\u3042\u308A"])
          this._fubaopai.push(this._pai[9]);
        this._weikaigang = false;
        return this;
      }
      close() {
        this._closed = true;
        return this;
      }
      get paishu() {
        return this._pai.length - 14;
      }
      get baopai() {
        return this._baopai.filter((x) => x);
      }
      get fubaopai() {
        return !this._closed ? null : this._fubaopai ? this._fubaopai.concat() : null;
      }
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/he.js
var require_he = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/he.js"(exports, module) {
    "use strict";
    var Majiang2 = { Shoupai: require_shoupai() };
    module.exports = class He {
      constructor() {
        this._pai = [];
        this._find = {};
      }
      dapai(p) {
        if (!Majiang2.Shoupai.valid_pai(p)) throw new Error(p);
        this._pai.push(p.replace(/[\+\=\-]$/, ""));
        this._find[p[0] + (+p[1] || 5)] = true;
        return this;
      }
      fulou(m) {
        if (!Majiang2.Shoupai.valid_mianzi(m)) throw new Error(m);
        let p = m[0] + m.match(/\d(?=[\+\=\-])/), d = m.match(/[\+\=\-]/);
        if (!d) throw new Error(m);
        if (this._pai[this._pai.length - 1].slice(0, 2) != p)
          throw new Error(m);
        this._pai[this._pai.length - 1] += d;
        return this;
      }
      find(p) {
        return this._find[p[0] + (+p[1] || 5)];
      }
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/board.js
var require_board = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/board.js"(exports, module) {
    "use strict";
    var Majiang2 = {
      Shoupai: require_shoupai(),
      He: require_he()
    };
    var Shan = class {
      constructor(baopai) {
        this.paishu = 136 - 13 * 4 - 14;
        this.baopai = [].concat(baopai || []);
        this.fubaopai;
      }
      zimo(p) {
        this.paishu--;
        return p || "_";
      }
      kaigang(baopai) {
        this.baopai.push(baopai);
      }
    };
    module.exports = class Board {
      constructor(kaiju) {
        if (kaiju) this.kaiju(kaiju);
      }
      kaiju(kaiju) {
        this.title = kaiju.title;
        this.player = kaiju.player;
        this.qijia = kaiju.qijia;
        this.zhuangfeng = 0;
        this.jushu = 0;
        this.changbang = 0;
        this.lizhibang = 0;
        this.defen = [];
        this.shan = null;
        this.shoupai = [];
        this.he = [];
        this.player_id = [0, 1, 2, 3];
        this.lunban = -1;
        this._lizhi;
        this._fenpei;
        this._lianzhuang;
        this._changbang;
        this._lizhibang;
      }
      menfeng(id) {
        return (id + 4 - this.qijia + 4 - this.jushu) % 4;
      }
      qipai(qipai) {
        this.zhuangfeng = qipai.zhuangfeng;
        this.jushu = qipai.jushu;
        this.changbang = qipai.changbang;
        this.lizhibang = qipai.lizhibang;
        this.shan = new Shan(qipai.baopai);
        for (let l = 0; l < 4; l++) {
          let paistr = qipai.shoupai[l] || "_".repeat(13);
          this.shoupai[l] = Majiang2.Shoupai.fromString(paistr);
          this.he[l] = new Majiang2.He();
          this.player_id[l] = (this.qijia + this.jushu + l) % 4;
          this.defen[this.player_id[l]] = qipai.defen[l];
        }
        this.lunban = -1;
        this._lizhi = false;
        this._fenpei = null;
        this._changbang = qipai.changbang;
        this._lizhibang = qipai.lizhibang;
      }
      lizhi() {
        if (this._lizhi) {
          this.defen[this.player_id[this.lunban]] -= 1e3;
          this.lizhibang++;
          this._lizhi = false;
        }
      }
      zimo(zimo) {
        this.lizhi();
        this.lunban = zimo.l;
        this.shoupai[zimo.l].zimo(this.shan.zimo(zimo.p), false);
      }
      dapai(dapai) {
        this.lunban = dapai.l;
        this.shoupai[dapai.l].dapai(dapai.p, false);
        this.he[dapai.l].dapai(dapai.p);
        this._lizhi = dapai.p.slice(-1) == "*";
      }
      fulou(fulou) {
        this.lizhi();
        this.he[this.lunban].fulou(fulou.m);
        this.lunban = fulou.l;
        this.shoupai[fulou.l].fulou(fulou.m, false);
      }
      gang(gang) {
        this.lunban = gang.l;
        this.shoupai[gang.l].gang(gang.m, false);
      }
      kaigang(kaigang) {
        this.shan.kaigang(kaigang.baopai);
      }
      hule(hule) {
        let shoupai = this.shoupai[hule.l];
        shoupai.fromString(hule.shoupai);
        if (hule.baojia != null) shoupai.dapai(shoupai.get_dapai().pop());
        if (this._fenpei) {
          this.changbang = 0;
          this.lizhibang = 0;
          for (let l = 0; l < 4; l++) {
            this.defen[this.player_id[l]] += this._fenpei[l];
          }
        }
        this.shan.fubaopai = hule.fubaopai;
        this._fenpei = hule.fenpei;
        this._lizhibang = 0;
        if (hule.l == 0) this._lianzhuang = true;
      }
      pingju(pingju) {
        if (!pingju.name.match(/^三家和/)) this.lizhi();
        for (let l = 0; l < 4; l++) {
          if (pingju.shoupai[l])
            this.shoupai[l].fromString(pingju.shoupai[l]);
        }
        this._fenpei = pingju.fenpei;
        this._lizhibang = this.lizhibang;
        this._lianzhuang = true;
      }
      last() {
        if (!this._fenpei) return;
        this.changbang = this._lianzhuang ? this._changbang + 1 : 0;
        this.lizhibang = this._lizhibang;
        for (let l = 0; l < 4; l++) {
          this.defen[this.player_id[l]] += this._fenpei[l];
        }
      }
      jieju(paipu) {
        for (let id = 0; id < 4; id++) {
          this.defen[id] = paipu.defen[id];
        }
        this.lunban = -1;
      }
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/xiangting.js
var require_xiangting = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/xiangting.js"(exports, module) {
    "use strict";
    function _xiangting(m, d, g, j) {
      let n = j ? 4 : 5;
      if (m > 4) {
        d += m - 4;
        m = 4;
      }
      if (m + d > 4) {
        g += m + d - 4;
        d = 4 - m;
      }
      if (m + d + g > n) {
        g = n - m - d;
      }
      if (j) d++;
      return 13 - m * 3 - d * 2 - g;
    }
    function dazi(bingpai) {
      let n_pai = 0, n_dazi = 0, n_guli = 0;
      for (let n = 1; n <= 9; n++) {
        n_pai += bingpai[n];
        if (n <= 7 && bingpai[n + 1] == 0 && bingpai[n + 2] == 0) {
          n_dazi += n_pai >> 1;
          n_guli += n_pai % 2;
          n_pai = 0;
        }
      }
      n_dazi += n_pai >> 1;
      n_guli += n_pai % 2;
      return {
        a: [0, n_dazi, n_guli],
        b: [0, n_dazi, n_guli]
      };
    }
    function mianzi(bingpai, n = 1) {
      if (n > 9) return dazi(bingpai);
      let max = mianzi(bingpai, n + 1);
      if (n <= 7 && bingpai[n] > 0 && bingpai[n + 1] > 0 && bingpai[n + 2] > 0) {
        bingpai[n]--;
        bingpai[n + 1]--;
        bingpai[n + 2]--;
        let r = mianzi(bingpai, n);
        bingpai[n]++;
        bingpai[n + 1]++;
        bingpai[n + 2]++;
        r.a[0]++;
        r.b[0]++;
        if (r.a[2] < max.a[2] || r.a[2] == max.a[2] && r.a[1] < max.a[1]) max.a = r.a;
        if (r.b[0] > max.b[0] || r.b[0] == max.b[0] && r.b[1] > max.b[1]) max.b = r.b;
      }
      if (bingpai[n] >= 3) {
        bingpai[n] -= 3;
        let r = mianzi(bingpai, n + 1);
        bingpai[n] += 3;
        r.a[0]++;
        r.b[0]++;
        if (r.a[2] < max.a[2] || r.a[2] == max.a[2] && r.a[1] < max.a[1]) max.a = r.a;
        if (r.b[0] > max.b[0] || r.b[0] == max.b[0] && r.b[1] > max.b[1]) max.b = r.b;
      }
      return max;
    }
    function mianzi_all(shoupai, jiangpai) {
      let r = {
        m: mianzi(shoupai._bingpai.m),
        p: mianzi(shoupai._bingpai.p),
        s: mianzi(shoupai._bingpai.s)
      };
      let z = [0, 0, 0];
      for (let n = 1; n <= 7; n++) {
        if (shoupai._bingpai.z[n] >= 3) z[0]++;
        else if (shoupai._bingpai.z[n] == 2) z[1]++;
        else if (shoupai._bingpai.z[n] == 1) z[2]++;
      }
      let n_fulou = shoupai._fulou.length;
      let min = 13;
      for (let m of [r.m.a, r.m.b]) {
        for (let p of [r.p.a, r.p.b]) {
          for (let s of [r.s.a, r.s.b]) {
            let x = [n_fulou, 0, 0];
            for (let i = 0; i < 3; i++) {
              x[i] += m[i] + p[i] + s[i] + z[i];
            }
            let n_xiangting = _xiangting(x[0], x[1], x[2], jiangpai);
            if (n_xiangting < min) min = n_xiangting;
          }
        }
      }
      return min;
    }
    function xiangting_yiban(shoupai) {
      let min = mianzi_all(shoupai);
      for (let s of ["m", "p", "s", "z"]) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n < bingpai.length; n++) {
          if (bingpai[n] >= 2) {
            bingpai[n] -= 2;
            let n_xiangting = mianzi_all(shoupai, true);
            bingpai[n] += 2;
            if (n_xiangting < min) min = n_xiangting;
          }
        }
      }
      if (min == -1 && shoupai._zimo && shoupai._zimo.length > 2) return 0;
      return min;
    }
    function xiangting_guoshi(shoupai) {
      if (shoupai._fulou.length) return Infinity;
      let n_yaojiu = 0;
      let n_duizi = 0;
      for (let s of ["m", "p", "s", "z"]) {
        let bingpai = shoupai._bingpai[s];
        let nn = s == "z" ? [1, 2, 3, 4, 5, 6, 7] : [1, 9];
        for (let n of nn) {
          if (bingpai[n] >= 1) n_yaojiu++;
          if (bingpai[n] >= 2) n_duizi++;
        }
      }
      return n_duizi ? 12 - n_yaojiu : 13 - n_yaojiu;
    }
    function xiangting_qidui(shoupai) {
      if (shoupai._fulou.length) return Infinity;
      let n_duizi = 0;
      let n_guli = 0;
      for (let s of ["m", "p", "s", "z"]) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n < bingpai.length; n++) {
          if (bingpai[n] >= 2) n_duizi++;
          else if (bingpai[n] == 1) n_guli++;
        }
      }
      if (n_duizi > 7) n_duizi = 7;
      if (n_duizi + n_guli > 7) n_guli = 7 - n_duizi;
      return 13 - n_duizi * 2 - n_guli;
    }
    function xiangting(shoupai) {
      return Math.min(
        xiangting_yiban(shoupai),
        xiangting_guoshi(shoupai),
        xiangting_qidui(shoupai)
      );
    }
    function tingpai(shoupai, f_xiangting = xiangting) {
      if (shoupai._zimo) return null;
      let pai = [];
      let n_xiangting = f_xiangting(shoupai);
      for (let s of ["m", "p", "s", "z"]) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n < bingpai.length; n++) {
          if (bingpai[n] >= 4) continue;
          bingpai[n]++;
          if (f_xiangting(shoupai) < n_xiangting) pai.push(s + n);
          bingpai[n]--;
        }
      }
      return pai;
    }
    module.exports = {
      xiangting_guoshi,
      xiangting_qidui,
      xiangting_yiban,
      xiangting,
      tingpai
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/hule.js
var require_hule = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/hule.js"(exports, module) {
    "use strict";
    var Majiang2 = {
      Shan: require_shan(),
      rule: require_rule()
    };
    function mianzi(s, bingpai, n = 1) {
      if (n > 9) return [[]];
      if (bingpai[n] == 0) return mianzi(s, bingpai, n + 1);
      let shunzi = [];
      if (n <= 7 && bingpai[n] > 0 && bingpai[n + 1] > 0 && bingpai[n + 2] > 0) {
        bingpai[n]--;
        bingpai[n + 1]--;
        bingpai[n + 2]--;
        shunzi = mianzi(s, bingpai, n);
        bingpai[n]++;
        bingpai[n + 1]++;
        bingpai[n + 2]++;
        for (let s_mianzi of shunzi) {
          s_mianzi.unshift(s + n + (n + 1) + (n + 2));
        }
      }
      let kezi = [];
      if (bingpai[n] == 3) {
        bingpai[n] -= 3;
        kezi = mianzi(s, bingpai, n + 1);
        bingpai[n] += 3;
        for (let k_mianzi of kezi) {
          k_mianzi.unshift(s + n + n + n);
        }
      }
      return shunzi.concat(kezi);
    }
    function mianzi_all(shoupai) {
      let shupai_all = [[]];
      for (let s of ["m", "p", "s"]) {
        let new_mianzi = [];
        for (let mm of shupai_all) {
          for (let nn of mianzi(s, shoupai._bingpai[s])) {
            new_mianzi.push(mm.concat(nn));
          }
        }
        shupai_all = new_mianzi;
      }
      let zipai = [];
      for (let n = 1; n <= 7; n++) {
        if (shoupai._bingpai.z[n] == 0) continue;
        if (shoupai._bingpai.z[n] != 3) return [];
        zipai.push("z" + n + n + n);
      }
      let fulou = shoupai._fulou.map((m) => m.replace(/0/g, "5"));
      return shupai_all.map((shupai) => shupai.concat(zipai).concat(fulou));
    }
    function add_hulepai(mianzi2, p) {
      let [s, n, d] = p;
      let regexp = new RegExp(`^(${s}.*${n})`);
      let replacer = `$1${d}!`;
      let new_mianzi = [];
      for (let i = 0; i < mianzi2.length; i++) {
        if (mianzi2[i].match(/[\+\=\-]|\d{4}/)) continue;
        if (i > 0 && mianzi2[i] == mianzi2[i - 1]) continue;
        let m = mianzi2[i].replace(regexp, replacer);
        if (m == mianzi2[i]) continue;
        let tmp_mianzi = mianzi2.concat();
        tmp_mianzi[i] = m;
        new_mianzi.push(tmp_mianzi);
      }
      return new_mianzi;
    }
    function hule_mianzi_yiban(shoupai, hulepai) {
      let mianzi2 = [];
      for (let s of ["m", "p", "s", "z"]) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n < bingpai.length; n++) {
          if (bingpai[n] < 2) continue;
          bingpai[n] -= 2;
          let jiangpai = s + n + n;
          for (let mm of mianzi_all(shoupai)) {
            mm.unshift(jiangpai);
            if (mm.length != 5) continue;
            mianzi2 = mianzi2.concat(add_hulepai(mm, hulepai));
          }
          bingpai[n] += 2;
        }
      }
      return mianzi2;
    }
    function hule_mianzi_qidui(shoupai, hulepai) {
      if (shoupai._fulou.length > 0) return [];
      let mianzi2 = [];
      for (let s of ["m", "p", "s", "z"]) {
        let bingpai = shoupai._bingpai[s];
        for (let n = 1; n < bingpai.length; n++) {
          if (bingpai[n] == 0) continue;
          if (bingpai[n] == 2) {
            let m = s + n == hulepai.slice(0, 2) ? s + n + n + hulepai[2] + "!" : s + n + n;
            mianzi2.push(m);
          } else return [];
        }
      }
      return mianzi2.length == 7 ? [mianzi2] : [];
    }
    function hule_mianzi_guoshi(shoupai, hulepai) {
      if (shoupai._fulou.length > 0) return [];
      let mianzi2 = [];
      let n_duizi = 0;
      for (let s of ["m", "p", "s", "z"]) {
        let bingpai = shoupai._bingpai[s];
        let nn = s == "z" ? [1, 2, 3, 4, 5, 6, 7] : [1, 9];
        for (let n of nn) {
          if (bingpai[n] == 2) {
            let m = s + n == hulepai.slice(0, 2) ? s + n + n + hulepai[2] + "!" : s + n + n;
            mianzi2.unshift(m);
            n_duizi++;
          } else if (bingpai[n] == 1) {
            let m = s + n == hulepai.slice(0, 2) ? s + n + hulepai[2] + "!" : s + n;
            mianzi2.push(m);
          } else return [];
        }
      }
      return n_duizi == 1 ? [mianzi2] : [];
    }
    function hule_mianzi_jiulian(shoupai, hulepai) {
      if (shoupai._fulou.length > 0) return [];
      let s = hulepai[0];
      if (s == "z") return [];
      let mianzi2 = s;
      let bingpai = shoupai._bingpai[s];
      for (let n = 1; n <= 9; n++) {
        if (bingpai[n] == 0) return [];
        if ((n == 1 || n == 9) && bingpai[n] < 3) return [];
        let n_pai = n == hulepai[1] ? bingpai[n] - 1 : bingpai[n];
        for (let i = 0; i < n_pai; i++) {
          mianzi2 += n;
        }
      }
      if (mianzi2.length != 14) return [];
      mianzi2 += hulepai.slice(1) + "!";
      return [[mianzi2]];
    }
    function hule_mianzi(shoupai, rongpai) {
      let new_shoupai = shoupai.clone();
      if (rongpai) new_shoupai.zimo(rongpai);
      if (!new_shoupai._zimo || new_shoupai._zimo.length > 2) return [];
      let hulepai = (rongpai || new_shoupai._zimo + "_").replace(/0/, "5");
      return [].concat(hule_mianzi_yiban(new_shoupai, hulepai)).concat(hule_mianzi_qidui(new_shoupai, hulepai)).concat(hule_mianzi_guoshi(new_shoupai, hulepai)).concat(hule_mianzi_jiulian(new_shoupai, hulepai));
    }
    function get_hudi(mianzi2, zhuangfeng, menfeng, rule) {
      const zhuangfengpai = new RegExp(`^z${zhuangfeng + 1}.*$`);
      const menfengpai = new RegExp(`^z${menfeng + 1}.*$`);
      const sanyuanpai = /^z[567].*$/;
      const yaojiu = /^.*[z19].*$/;
      const zipai = /^z.*$/;
      const kezi = /^[mpsz](\d)\1\1.*$/;
      const ankezi = /^[mpsz](\d)\1\1(?:\1|_\!)?$/;
      const gangzi = /^[mpsz](\d)\1\1.*\1.*$/;
      const danqi = /^[mpsz](\d)\1[\+\=\-\_]\!$/;
      const kanzhang = /^[mps]\d\d[\+\=\-\_]\!\d$/;
      const bianzhang = /^[mps](123[\+\=\-\_]\!|7[\+\=\-\_]\!89)$/;
      let hudi = {
        fu: 20,
        menqian: true,
        zimo: true,
        shunzi: {
          m: [0, 0, 0, 0, 0, 0, 0, 0],
          p: [0, 0, 0, 0, 0, 0, 0, 0],
          s: [0, 0, 0, 0, 0, 0, 0, 0]
        },
        kezi: {
          m: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          p: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          z: [0, 0, 0, 0, 0, 0, 0, 0]
        },
        n_shunzi: 0,
        n_kezi: 0,
        n_ankezi: 0,
        n_gangzi: 0,
        n_yaojiu: 0,
        n_zipai: 0,
        danqi: false,
        pinghu: false,
        zhuangfeng,
        menfeng
      };
      for (let m of mianzi2) {
        if (m.match(/[\+\=\-](?!\!)/)) hudi.menqian = false;
        if (m.match(/[\+\=\-]\!/)) hudi.zimo = false;
        if (mianzi2.length == 1) continue;
        if (m.match(danqi)) hudi.danqi = true;
        if (mianzi2.length == 13) continue;
        if (m.match(yaojiu)) hudi.n_yaojiu++;
        if (m.match(zipai)) hudi.n_zipai++;
        if (mianzi2.length != 5) continue;
        if (m == mianzi2[0]) {
          let fu = 0;
          if (m.match(zhuangfengpai)) fu += 2;
          if (m.match(menfengpai)) fu += 2;
          if (m.match(sanyuanpai)) fu += 2;
          fu = rule["\u9023\u98A8\u724C\u306F2\u7B26"] && fu > 2 ? 2 : fu;
          hudi.fu += fu;
          if (hudi.danqi) hudi.fu += 2;
        } else if (m.match(kezi)) {
          hudi.n_kezi++;
          let fu = 2;
          if (m.match(yaojiu)) {
            fu *= 2;
          }
          if (m.match(ankezi)) {
            fu *= 2;
            hudi.n_ankezi++;
          }
          if (m.match(gangzi)) {
            fu *= 4;
            hudi.n_gangzi++;
          }
          hudi.fu += fu;
          hudi.kezi[m[0]][m[1]]++;
        } else {
          hudi.n_shunzi++;
          if (m.match(kanzhang)) hudi.fu += 2;
          if (m.match(bianzhang)) hudi.fu += 2;
          hudi.shunzi[m[0]][m[1]]++;
        }
      }
      if (mianzi2.length == 7) {
        hudi.fu = 25;
      } else if (mianzi2.length == 5) {
        hudi.pinghu = hudi.menqian && hudi.fu == 20;
        if (hudi.zimo) {
          if (!hudi.pinghu) hudi.fu += 2;
        } else {
          if (hudi.menqian) hudi.fu += 10;
          else if (hudi.fu == 20) hudi.fu = 30;
        }
        hudi.fu = Math.ceil(hudi.fu / 10) * 10;
      }
      return hudi;
    }
    function get_pre_hupai(hupai) {
      let pre_hupai = [];
      if (hupai.lizhi == 1) pre_hupai.push({ name: "\u7ACB\u76F4", fanshu: 1 });
      if (hupai.lizhi == 2) pre_hupai.push({ name: "\u30C0\u30D6\u30EB\u7ACB\u76F4", fanshu: 2 });
      if (hupai.yifa) pre_hupai.push({ name: "\u4E00\u767A", fanshu: 1 });
      if (hupai.haidi == 1) pre_hupai.push({ name: "\u6D77\u5E95\u6478\u6708", fanshu: 1 });
      if (hupai.haidi == 2) pre_hupai.push({ name: "\u6CB3\u5E95\u6488\u9B5A", fanshu: 1 });
      if (hupai.lingshang) pre_hupai.push({ name: "\u5DBA\u4E0A\u958B\u82B1", fanshu: 1 });
      if (hupai.qianggang) pre_hupai.push({ name: "\u69CD\u69D3", fanshu: 1 });
      if (hupai.tianhu == 1) pre_hupai = [{ name: "\u5929\u548C", fanshu: "*" }];
      if (hupai.tianhu == 2) pre_hupai = [{ name: "\u5730\u548C", fanshu: "*" }];
      return pre_hupai;
    }
    function get_hupai(mianzi2, hudi, pre_hupai, post_hupai, rule) {
      function menqianqing() {
        if (hudi.menqian && hudi.zimo)
          return [{ name: "\u9580\u524D\u6E05\u81EA\u6478\u548C", fanshu: 1 }];
        return [];
      }
      function fanpai() {
        let feng_hanzi = ["\u6771", "\u5357", "\u897F", "\u5317"];
        let fanpai_all = [];
        if (hudi.kezi.z[hudi.zhuangfeng + 1])
          fanpai_all.push({
            name: "\u5834\u98A8 " + feng_hanzi[hudi.zhuangfeng],
            fanshu: 1
          });
        if (hudi.kezi.z[hudi.menfeng + 1])
          fanpai_all.push({
            name: "\u81EA\u98A8 " + feng_hanzi[hudi.menfeng],
            fanshu: 1
          });
        if (hudi.kezi.z[5]) fanpai_all.push({ name: "\u7FFB\u724C \u767D", fanshu: 1 });
        if (hudi.kezi.z[6]) fanpai_all.push({ name: "\u7FFB\u724C \u767C", fanshu: 1 });
        if (hudi.kezi.z[7]) fanpai_all.push({ name: "\u7FFB\u724C \u4E2D", fanshu: 1 });
        return fanpai_all;
      }
      function pinghu() {
        if (hudi.pinghu) return [{ name: "\u5E73\u548C", fanshu: 1 }];
        return [];
      }
      function duanyaojiu() {
        if (hudi.n_yaojiu > 0) return [];
        if (rule["\u30AF\u30A4\u30BF\u30F3\u3042\u308A"] || hudi.menqian)
          return [{ name: "\u65AD\u5E7A\u4E5D", fanshu: 1 }];
        return [];
      }
      function yibeikou() {
        if (!hudi.menqian) return [];
        const shunzi = hudi.shunzi;
        let beikou = shunzi.m.concat(shunzi.p).concat(shunzi.s).map((x) => x >> 1).reduce((a, b) => a + b);
        if (beikou == 1) return [{ name: "\u4E00\u76C3\u53E3", fanshu: 1 }];
        return [];
      }
      function sansetongshun() {
        const shunzi = hudi.shunzi;
        for (let n = 1; n <= 7; n++) {
          if (shunzi.m[n] && shunzi.p[n] && shunzi.s[n])
            return [{ name: "\u4E09\u8272\u540C\u9806", fanshu: hudi.menqian ? 2 : 1 }];
        }
        return [];
      }
      function yiqitongguan() {
        const shunzi = hudi.shunzi;
        for (let s of ["m", "p", "s"]) {
          if (shunzi[s][1] && shunzi[s][4] && shunzi[s][7])
            return [{ name: "\u4E00\u6C17\u901A\u8CAB", fanshu: hudi.menqian ? 2 : 1 }];
        }
        return [];
      }
      function hunquandaiyaojiu() {
        if (hudi.n_yaojiu == 5 && hudi.n_shunzi > 0 && hudi.n_zipai > 0)
          return [{ name: "\u6DF7\u5168\u5E2F\u5E7A\u4E5D", fanshu: hudi.menqian ? 2 : 1 }];
        return [];
      }
      function qiduizi() {
        if (mianzi2.length == 7) return [{ name: "\u4E03\u5BFE\u5B50", fanshu: 2 }];
        return [];
      }
      function duiduihu() {
        if (hudi.n_kezi == 4) return [{ name: "\u5BFE\u3005\u548C", fanshu: 2 }];
        return [];
      }
      function sananke() {
        if (hudi.n_ankezi == 3) return [{ name: "\u4E09\u6697\u523B", fanshu: 2 }];
        return [];
      }
      function sangangzi() {
        if (hudi.n_gangzi == 3) return [{ name: "\u4E09\u69D3\u5B50", fanshu: 2 }];
        return [];
      }
      function sansetongke() {
        const kezi = hudi.kezi;
        for (let n = 1; n <= 9; n++) {
          if (kezi.m[n] && kezi.p[n] && kezi.s[n])
            return [{ name: "\u4E09\u8272\u540C\u523B", fanshu: 2 }];
        }
        return [];
      }
      function hunlaotou() {
        if (hudi.n_yaojiu == mianzi2.length && hudi.n_shunzi == 0 && hudi.n_zipai > 0)
          return [{ name: "\u6DF7\u8001\u982D", fanshu: 2 }];
        return [];
      }
      function xiaosanyuan() {
        const kezi = hudi.kezi;
        if (kezi.z[5] + kezi.z[6] + kezi.z[7] == 2 && mianzi2[0].match(/^z[567]/))
          return [{ name: "\u5C0F\u4E09\u5143", fanshu: 2 }];
        return [];
      }
      function hunyise() {
        for (let s of ["m", "p", "s"]) {
          const yise = new RegExp(`^[z${s}]`);
          if (mianzi2.filter((m) => m.match(yise)).length == mianzi2.length && hudi.n_zipai > 0)
            return [{ name: "\u6DF7\u4E00\u8272", fanshu: hudi.menqian ? 3 : 2 }];
        }
        return [];
      }
      function chunquandaiyaojiu() {
        if (hudi.n_yaojiu == 5 && hudi.n_shunzi > 0 && hudi.n_zipai == 0)
          return [{ name: "\u7D14\u5168\u5E2F\u5E7A\u4E5D", fanshu: hudi.menqian ? 3 : 2 }];
        return [];
      }
      function erbeikou() {
        if (!hudi.menqian) return [];
        const shunzi = hudi.shunzi;
        let beikou = shunzi.m.concat(shunzi.p).concat(shunzi.s).map((x) => x >> 1).reduce((a, b) => a + b);
        if (beikou == 2) return [{ name: "\u4E8C\u76C3\u53E3", fanshu: 3 }];
        return [];
      }
      function qingyise() {
        for (let s of ["m", "p", "s"]) {
          const yise = new RegExp(`^[${s}]`);
          if (mianzi2.filter((m) => m.match(yise)).length == mianzi2.length)
            return [{ name: "\u6E05\u4E00\u8272", fanshu: hudi.menqian ? 6 : 5 }];
        }
        return [];
      }
      function guoshiwushuang() {
        if (mianzi2.length != 13) return [];
        if (hudi.danqi) return [{ name: "\u56FD\u58EB\u7121\u53CC\u5341\u4E09\u9762", fanshu: "**" }];
        else return [{ name: "\u56FD\u58EB\u7121\u53CC", fanshu: "*" }];
      }
      function sianke() {
        if (hudi.n_ankezi != 4) return [];
        if (hudi.danqi) return [{ name: "\u56DB\u6697\u523B\u5358\u9A0E", fanshu: "**" }];
        else return [{ name: "\u56DB\u6697\u523B", fanshu: "*" }];
      }
      function dasanyuan() {
        const kezi = hudi.kezi;
        if (kezi.z[5] + kezi.z[6] + kezi.z[7] == 3) {
          let bao_mianzi = mianzi2.filter((m) => m.match(/^z([567])\1\1(?:[\+\=\-]|\1)(?!\!)/));
          let baojia = bao_mianzi[2] && bao_mianzi[2].match(/[\+\=\-]/);
          if (baojia)
            return [{ name: "\u5927\u4E09\u5143", fanshu: "*", baojia: baojia[0] }];
          else return [{ name: "\u5927\u4E09\u5143", fanshu: "*" }];
        }
        return [];
      }
      function sixihu() {
        const kezi = hudi.kezi;
        if (kezi.z[1] + kezi.z[2] + kezi.z[3] + kezi.z[4] == 4) {
          let bao_mianzi = mianzi2.filter((m) => m.match(/^z([1234])\1\1(?:[\+\=\-]|\1)(?!\!)/));
          let baojia = bao_mianzi[3] && bao_mianzi[3].match(/[\+\=\-]/);
          if (baojia)
            return [{ name: "\u5927\u56DB\u559C", fanshu: "**", baojia: baojia[0] }];
          else return [{ name: "\u5927\u56DB\u559C", fanshu: "**" }];
        }
        if (kezi.z[1] + kezi.z[2] + kezi.z[3] + kezi.z[4] == 3 && mianzi2[0].match(/^z[1234]/))
          return [{ name: "\u5C0F\u56DB\u559C", fanshu: "*" }];
        return [];
      }
      function ziyise() {
        if (hudi.n_zipai == mianzi2.length)
          return [{ name: "\u5B57\u4E00\u8272", fanshu: "*" }];
        return [];
      }
      function lvyise() {
        if (mianzi2.filter((m) => m.match(/^[mp]/)).length > 0) return [];
        if (mianzi2.filter((m) => m.match(/^z[^6]/)).length > 0) return [];
        if (mianzi2.filter((m) => m.match(/^s.*[1579]/)).length > 0) return [];
        return [{ name: "\u7DD1\u4E00\u8272", fanshu: "*" }];
      }
      function qinglaotou() {
        if (hudi.n_yaojiu == 5 && hudi.n_kezi == 4 && hudi.n_zipai == 0)
          return [{ name: "\u6E05\u8001\u982D", fanshu: "*" }];
        return [];
      }
      function sigangzi() {
        if (hudi.n_gangzi == 4) return [{ name: "\u56DB\u69D3\u5B50", fanshu: "*" }];
        return [];
      }
      function jiulianbaodeng() {
        if (mianzi2.length != 1) return [];
        if (mianzi2[0].match(/^[mpsz]1112345678999/))
          return [{ name: "\u7D14\u6B63\u4E5D\u84EE\u5B9D\u71C8", fanshu: "**" }];
        else return [{ name: "\u4E5D\u84EE\u5B9D\u71C8", fanshu: "*" }];
      }
      let damanguan = pre_hupai.length > 0 && pre_hupai[0].fanshu[0] == "*" ? pre_hupai : [];
      damanguan = damanguan.concat(guoshiwushuang()).concat(sianke()).concat(dasanyuan()).concat(sixihu()).concat(ziyise()).concat(lvyise()).concat(qinglaotou()).concat(sigangzi()).concat(jiulianbaodeng());
      for (let hupai2 of damanguan) {
        if (!rule["\u30C0\u30D6\u30EB\u5F79\u6E80\u3042\u308A"]) hupai2.fanshu = "*";
        if (!rule["\u5F79\u6E80\u30D1\u30AA\u3042\u308A"]) delete hupai2.baojia;
      }
      if (damanguan.length > 0) return damanguan;
      let hupai = pre_hupai.concat(menqianqing()).concat(fanpai()).concat(pinghu()).concat(duanyaojiu()).concat(yibeikou()).concat(sansetongshun()).concat(yiqitongguan()).concat(hunquandaiyaojiu()).concat(qiduizi()).concat(duiduihu()).concat(sananke()).concat(sangangzi()).concat(sansetongke()).concat(hunlaotou()).concat(xiaosanyuan()).concat(hunyise()).concat(chunquandaiyaojiu()).concat(erbeikou()).concat(qingyise());
      if (hupai.length > 0) hupai = hupai.concat(post_hupai);
      return hupai;
    }
    function get_post_hupai(shoupai, rongpai, baopai, fubaopai) {
      let new_shoupai = shoupai.clone();
      if (rongpai) new_shoupai.zimo(rongpai);
      let paistr = new_shoupai.toString();
      let post_hupai = [];
      let suitstr = paistr.match(/[mpsz][^mpsz,]*/g);
      let n_baopai = 0;
      for (let p of baopai) {
        p = Majiang2.Shan.zhenbaopai(p);
        const regexp = new RegExp(p[1], "g");
        for (let m of suitstr) {
          if (m[0] != p[0]) continue;
          m = m.replace(/0/, "5");
          let nn2 = m.match(regexp);
          if (nn2) n_baopai += nn2.length;
        }
      }
      if (n_baopai) post_hupai.push({ name: "\u30C9\u30E9", fanshu: n_baopai });
      let n_hongpai = 0;
      let nn = paistr.match(/0/g);
      if (nn) n_hongpai = nn.length;
      if (n_hongpai) post_hupai.push({ name: "\u8D64\u30C9\u30E9", fanshu: n_hongpai });
      let n_fubaopai = 0;
      for (let p of fubaopai || []) {
        p = Majiang2.Shan.zhenbaopai(p);
        const regexp = new RegExp(p[1], "g");
        for (let m of suitstr) {
          if (m[0] != p[0]) continue;
          m = m.replace(/0/, "5");
          let nn2 = m.match(regexp);
          if (nn2) n_fubaopai += nn2.length;
        }
      }
      if (n_fubaopai) post_hupai.push({ name: "\u88CF\u30C9\u30E9", fanshu: n_fubaopai });
      return post_hupai;
    }
    function get_defen(fu, hupai, rongpai, param) {
      if (hupai.length == 0) return { defen: 0 };
      let menfeng = param.menfeng;
      let fanshu, damanguan, defen, base, baojia, defen2, base2, baojia2;
      if (hupai[0].fanshu[0] == "*") {
        fu = void 0;
        damanguan = !param.rule["\u5F79\u6E80\u306E\u8907\u5408\u3042\u308A"] ? 1 : hupai.map((h2) => h2.fanshu.length).reduce((x, y) => x + y);
        base = 8e3 * damanguan;
        let h = hupai.find((h2) => h2.baojia);
        if (h) {
          baojia2 = (menfeng + { "+": 1, "=": 2, "-": 3 }[h.baojia]) % 4;
          base2 = 8e3 * Math.min(h.fanshu.length, damanguan);
        }
      } else {
        fanshu = hupai.map((h) => h.fanshu).reduce((x, y) => x + y);
        base = fanshu >= 13 && param.rule["\u6570\u3048\u5F79\u6E80\u3042\u308A"] ? 8e3 : fanshu >= 11 ? 6e3 : fanshu >= 8 ? 4e3 : fanshu >= 6 ? 3e3 : param.rule["\u5207\u308A\u4E0A\u3052\u6E80\u8CAB\u3042\u308A"] && fu << 2 + fanshu == 1920 ? 2e3 : Math.min(fu << 2 + fanshu, 2e3);
      }
      let fenpei = [0, 0, 0, 0];
      let chang = param.jicun.changbang;
      let lizhi = param.jicun.lizhibang;
      if (baojia2 != null) {
        if (rongpai) base2 = base2 / 2;
        base = base - base2;
        defen2 = base2 * (menfeng == 0 ? 6 : 4);
        fenpei[menfeng] += defen2;
        fenpei[baojia2] -= defen2;
      } else defen2 = 0;
      if (rongpai || base == 0) {
        baojia = base == 0 ? baojia2 : (menfeng + { "+": 1, "=": 2, "-": 3 }[rongpai[2]]) % 4;
        defen = Math.ceil(base * (menfeng == 0 ? 6 : 4) / 100) * 100;
        fenpei[menfeng] += defen + chang * 300 + lizhi * 1e3;
        fenpei[baojia] -= defen + chang * 300;
      } else {
        let zhuangjia = Math.ceil(base * 2 / 100) * 100;
        let sanjia = Math.ceil(base / 100) * 100;
        if (menfeng == 0) {
          defen = zhuangjia * 3;
          for (let l = 0; l < 4; l++) {
            if (l == menfeng)
              fenpei[l] += defen + chang * 300 + lizhi * 1e3;
            else fenpei[l] -= zhuangjia + chang * 100;
          }
        } else {
          defen = zhuangjia + sanjia * 2;
          for (let l = 0; l < 4; l++) {
            if (l == menfeng)
              fenpei[l] += defen + chang * 300 + lizhi * 1e3;
            else if (l == 0)
              fenpei[l] -= zhuangjia + chang * 100;
            else fenpei[l] -= sanjia + chang * 100;
          }
        }
      }
      return {
        hupai,
        fu,
        fanshu,
        damanguan,
        defen: defen + defen2,
        fenpei
      };
    }
    function hule(shoupai, rongpai, param) {
      if (rongpai) {
        if (!rongpai.match(/[\+\=\-]$/)) throw new Error(rongpai);
        rongpai = rongpai.slice(0, 2) + rongpai.slice(-1);
      }
      let max;
      let pre_hupai = get_pre_hupai(param.hupai);
      let post_hupai = get_post_hupai(
        shoupai,
        rongpai,
        param.baopai,
        param.fubaopai
      );
      for (let mianzi2 of hule_mianzi(shoupai, rongpai)) {
        let hudi = get_hudi(
          mianzi2,
          param.zhuangfeng,
          param.menfeng,
          param.rule
        );
        let hupai = get_hupai(mianzi2, hudi, pre_hupai, post_hupai, param.rule);
        let rv = get_defen(hudi.fu, hupai, rongpai, param);
        if (!max || rv.defen > max.defen || rv.defen == max.defen && (!rv.fanshu || rv.fanshu > max.fanshu || rv.fanshu == max.fanshu && rv.fu > max.fu)) max = rv;
      }
      return max;
    }
    function hule_param(param = {}) {
      let rv = {
        rule: param.rule ?? Majiang2.rule(),
        zhuangfeng: param.zhuangfeng ?? 0,
        menfeng: param.menfeng ?? 1,
        hupai: {
          lizhi: param.lizhi ?? 0,
          yifa: param.yifa ?? false,
          qianggang: param.qianggang ?? false,
          lingshang: param.lingshang ?? false,
          haidi: param.haidi ?? 0,
          tianhu: param.tianhu ?? 0
        },
        baopai: param.baopai ? [].concat(param.baopai) : [],
        fubaopai: param.fubaopai ? [].concat(param.fubaopai) : null,
        jicun: {
          changbang: param.changbang ?? 0,
          lizhibang: param.lizhibang ?? 0
        }
      };
      return rv;
    }
    module.exports = {
      hule,
      hule_param,
      hule_mianzi
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/game.js
var require_game = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/game.js"(exports, module) {
    "use strict";
    var Majiang2 = {
      rule: require_rule(),
      Shoupai: require_shoupai(),
      Shan: require_shan(),
      He: require_he(),
      Util: Object.assign(
        require_xiangting(),
        require_hule()
      )
    };
    module.exports = class Game {
      constructor(players, callback, rule, title) {
        this._players = players;
        this._callback = callback || (() => {
        });
        this._rule = rule || Majiang2.rule();
        this._model = {
          title: title || "\u96FB\u8133\u9EBB\u5C06\n" + (/* @__PURE__ */ new Date()).toLocaleString(),
          player: ["\u79C1", "\u4E0B\u5BB6", "\u5BFE\u9762", "\u4E0A\u5BB6"],
          qijia: 0,
          zhuangfeng: 0,
          jushu: 0,
          changbang: 0,
          lizhibang: 0,
          defen: [0, 0, 0, 0].map((x) => this._rule["\u914D\u7D66\u539F\u70B9"]),
          shan: null,
          shoupai: [],
          he: [],
          player_id: [0, 1, 2, 3]
        };
        this._view;
        this._status;
        this._reply = [];
        this._sync = false;
        this._stop = null;
        this._speed = 3;
        this._wait = 0;
        this._timeout_id;
        this._handler;
      }
      get model() {
        return this._model;
      }
      set view(view) {
        this._view = view;
      }
      get speed() {
        return this._speed;
      }
      set speed(speed) {
        this._speed = speed;
      }
      set wait(wait) {
        this._wait = wait;
      }
      set handler(callback) {
        this._handler = callback;
      }
      add_paipu(paipu) {
        this._paipu.log[this._paipu.log.length - 1].push(paipu);
      }
      delay(callback, timeout) {
        if (this._sync) return callback();
        timeout = this._speed == 0 ? 0 : timeout == null ? Math.max(500, this._speed * 200) : timeout;
        setTimeout(callback, timeout);
      }
      say(name, l) {
        if (this._view) this._view.say(name, l);
      }
      stop(callback = () => {
      }) {
        this._stop = callback;
      }
      start() {
        if (this._timeout_id) return;
        this._stop = null;
        this._timeout_id = setTimeout(() => this.next(), 0);
      }
      notify_players(type, msg) {
        for (let l = 0; l < 4; l++) {
          let id = this._model.player_id[l];
          if (this._sync)
            this._players[id].action(msg[l]);
          else setTimeout(() => {
            this._players[id].action(msg[l]);
          }, 0);
        }
      }
      call_players(type, msg, timeout) {
        timeout = this._speed == 0 ? 0 : timeout == null ? this._speed * 200 : timeout;
        this._status = type;
        this._reply = [];
        for (let l = 0; l < 4; l++) {
          let id = this._model.player_id[l];
          if (this._sync)
            this._players[id].action(
              msg[l],
              (reply) => this.reply(id, reply)
            );
          else setTimeout(() => {
            this._players[id].action(
              msg[l],
              (reply) => this.reply(id, reply)
            );
          }, 0);
        }
        if (!this._sync)
          this._timeout_id = setTimeout(() => this.next(), timeout);
      }
      reply(id, reply) {
        this._reply[id] = reply || {};
        if (this._sync) return;
        if (this._reply.filter((x) => x).length < 4) return;
        if (!this._timeout_id)
          this._timeout_id = setTimeout(() => this.next(), 0);
      }
      next() {
        this._timeout_id = clearTimeout(this._timeout_id);
        if (this._reply.filter((x) => x).length < 4) return;
        if (this._stop) return this._stop();
        if (this._status == "kaiju") this.reply_kaiju();
        else if (this._status == "qipai") this.reply_qipai();
        else if (this._status == "zimo") this.reply_zimo();
        else if (this._status == "dapai") this.reply_dapai();
        else if (this._status == "fulou") this.reply_fulou();
        else if (this._status == "gang") this.reply_gang();
        else if (this._status == "gangzimo") this.reply_zimo();
        else if (this._status == "hule") this.reply_hule();
        else if (this._status == "pingju") this.reply_pingju();
        else this._callback(this._paipu);
      }
      do_sync() {
        this._sync = true;
        this.kaiju();
        for (; ; ) {
          if (this._status == "kaiju") this.reply_kaiju();
          else if (this._status == "qipai") this.reply_qipai();
          else if (this._status == "zimo") this.reply_zimo();
          else if (this._status == "dapai") this.reply_dapai();
          else if (this._status == "fulou") this.reply_fulou();
          else if (this._status == "gang") this.reply_gang();
          else if (this._status == "gangzimo") this.reply_zimo();
          else if (this._status == "hule") this.reply_hule();
          else if (this._status == "pingju") this.reply_pingju();
          else break;
        }
        this._callback(this._paipu);
        return this;
      }
      kaiju(qijia) {
        this._model.qijia = qijia ?? Math.floor(Math.random() * 4);
        this._max_jushu = this._rule["\u5834\u6570"] == 0 ? 0 : this._rule["\u5834\u6570"] * 4 - 1;
        this._paipu = {
          title: this._model.title,
          player: this._model.player,
          qijia: this._model.qijia,
          log: [],
          defen: this._model.defen.concat(),
          point: [],
          rank: []
        };
        let msg = [];
        for (let id = 0; id < 4; id++) {
          msg[id] = JSON.parse(JSON.stringify({
            kaiju: {
              id,
              rule: this._rule,
              title: this._paipu.title,
              player: this._paipu.player,
              qijia: this._paipu.qijia
            }
          }));
        }
        this.call_players("kaiju", msg, 0);
        if (this._view) this._view.kaiju();
      }
      qipai(shan) {
        let model = this._model;
        model.shan = shan || new Majiang2.Shan(this._rule);
        for (let l = 0; l < 4; l++) {
          let qipai = [];
          for (let i = 0; i < 13; i++) {
            qipai.push(model.shan.zimo());
          }
          model.shoupai[l] = new Majiang2.Shoupai(qipai);
          model.he[l] = new Majiang2.He();
          model.player_id[l] = (model.qijia + model.jushu + l) % 4;
        }
        model.lunban = -1;
        this._diyizimo = true;
        this._fengpai = this._rule["\u9014\u4E2D\u6D41\u5C40\u3042\u308A"];
        this._dapai = null;
        this._gang = null;
        this._lizhi = [0, 0, 0, 0];
        this._yifa = [0, 0, 0, 0];
        this._n_gang = [0, 0, 0, 0];
        this._neng_rong = [1, 1, 1, 1];
        this._hule = [];
        this._hule_option = null;
        this._no_game = false;
        this._lianzhuang = false;
        this._changbang = model.changbang;
        this._fenpei = null;
        this._paipu.defen = model.defen.concat();
        this._paipu.log.push([]);
        let paipu = {
          qipai: {
            zhuangfeng: model.zhuangfeng,
            jushu: model.jushu,
            changbang: model.changbang,
            lizhibang: model.lizhibang,
            defen: model.player_id.map((id) => model.defen[id]),
            baopai: model.shan.baopai[0],
            shoupai: model.shoupai.map((shoupai) => shoupai.toString())
          }
        };
        this.add_paipu(paipu);
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
          for (let i = 0; i < 4; i++) {
            if (i != l) msg[l].qipai.shoupai[i] = "";
          }
        }
        this.call_players("qipai", msg, 0);
        if (this._view) this._view.redraw();
      }
      zimo() {
        let model = this._model;
        model.lunban = (model.lunban + 1) % 4;
        let zimo = model.shan.zimo();
        model.shoupai[model.lunban].zimo(zimo);
        let paipu = { zimo: { l: model.lunban, p: zimo } };
        this.add_paipu(paipu);
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
          if (l != model.lunban) msg[l].zimo.p = "";
        }
        this.call_players("zimo", msg);
        if (this._view) this._view.update(paipu);
      }
      dapai(dapai) {
        let model = this._model;
        this._yifa[model.lunban] = 0;
        if (!model.shoupai[model.lunban].lizhi)
          this._neng_rong[model.lunban] = true;
        model.shoupai[model.lunban].dapai(dapai);
        model.he[model.lunban].dapai(dapai);
        if (this._diyizimo) {
          if (!dapai.match(/^z[1234]/)) this._fengpai = false;
          if (this._dapai && this._dapai.slice(0, 2) != dapai.slice(0, 2))
            this._fengpai = false;
        } else this._fengpai = false;
        if (dapai.slice(-1) == "*") {
          this._lizhi[model.lunban] = this._diyizimo ? 2 : 1;
          this._yifa[model.lunban] = this._rule["\u4E00\u767A\u3042\u308A"];
        }
        if (Majiang2.Util.xiangting(model.shoupai[model.lunban]) == 0 && Majiang2.Util.tingpai(model.shoupai[model.lunban]).find((p) => model.he[model.lunban].find(p))) {
          this._neng_rong[model.lunban] = false;
        }
        this._dapai = dapai;
        let paipu = { dapai: { l: model.lunban, p: dapai } };
        this.add_paipu(paipu);
        if (this._gang) this.kaigang();
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players("dapai", msg);
        if (this._view) this._view.update(paipu);
      }
      fulou(fulou) {
        let model = this._model;
        this._diyizimo = false;
        this._yifa = [0, 0, 0, 0];
        model.he[model.lunban].fulou(fulou);
        let d = fulou.match(/[\+\=\-]/);
        model.lunban = (model.lunban + "_-=+".indexOf(d)) % 4;
        model.shoupai[model.lunban].fulou(fulou);
        if (fulou.match(/^[mpsz]\d{4}/)) {
          this._gang = fulou;
          this._n_gang[model.lunban]++;
        }
        let paipu = { fulou: { l: model.lunban, m: fulou } };
        this.add_paipu(paipu);
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players("fulou", msg);
        if (this._view) this._view.update(paipu);
      }
      gang(gang) {
        let model = this._model;
        model.shoupai[model.lunban].gang(gang);
        let paipu = { gang: { l: model.lunban, m: gang } };
        this.add_paipu(paipu);
        if (this._gang) this.kaigang();
        this._gang = gang;
        this._n_gang[model.lunban]++;
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players("gang", msg);
        if (this._view) this._view.update(paipu);
      }
      gangzimo() {
        let model = this._model;
        this._diyizimo = false;
        this._yifa = [0, 0, 0, 0];
        let zimo = model.shan.gangzimo();
        model.shoupai[model.lunban].zimo(zimo);
        let paipu = { gangzimo: { l: model.lunban, p: zimo } };
        this.add_paipu(paipu);
        if (!this._rule["\u30AB\u30F3\u30C9\u30E9\u5F8C\u4E57\u305B"] || this._gang.match(/^[mpsz]\d{4}$/)) this.kaigang();
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
          if (l != model.lunban) msg[l].gangzimo.p = "";
        }
        this.call_players("gangzimo", msg);
        if (this._view) this._view.update(paipu);
      }
      kaigang() {
        this._gang = null;
        if (!this._rule["\u30AB\u30F3\u30C9\u30E9\u3042\u308A"]) return;
        let model = this._model;
        model.shan.kaigang();
        let baopai = model.shan.baopai.pop();
        let paipu = { kaigang: { baopai } };
        this.add_paipu(paipu);
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.notify_players("kaigang", msg);
        if (this._view) this._view.update(paipu);
      }
      hule() {
        let model = this._model;
        if (this._status != "hule") {
          model.shan.close();
          this._hule_option = this._status == "gang" ? "qianggang" : this._status == "gangzimo" ? "lingshang" : null;
        }
        let menfeng = this._hule.length ? this._hule.shift() : model.lunban;
        let rongpai = menfeng == model.lunban ? null : (this._hule_option == "qianggang" ? this._gang[0] + this._gang.slice(-1) : this._dapai.slice(0, 2)) + "_+=-"[(4 + model.lunban - menfeng) % 4];
        let shoupai = model.shoupai[menfeng].clone();
        let fubaopai = shoupai.lizhi ? model.shan.fubaopai : null;
        let param = {
          rule: this._rule,
          zhuangfeng: model.zhuangfeng,
          menfeng,
          hupai: {
            lizhi: this._lizhi[menfeng],
            yifa: this._yifa[menfeng],
            qianggang: this._hule_option == "qianggang",
            lingshang: this._hule_option == "lingshang",
            haidi: model.shan.paishu > 0 || this._hule_option == "lingshang" ? 0 : !rongpai ? 1 : 2,
            tianhu: !(this._diyizimo && !rongpai) ? 0 : menfeng == 0 ? 1 : 2
          },
          baopai: model.shan.baopai,
          fubaopai,
          jicun: {
            changbang: model.changbang,
            lizhibang: model.lizhibang
          }
        };
        let hule = Majiang2.Util.hule(shoupai, rongpai, param);
        if (this._rule["\u9023\u8358\u65B9\u5F0F"] > 0 && menfeng == 0) this._lianzhuang = true;
        if (this._rule["\u5834\u6570"] == 0) this._lianzhuang = false;
        this._fenpei = hule.fenpei;
        let paipu = {
          hule: {
            l: menfeng,
            shoupai: rongpai ? shoupai.zimo(rongpai).toString() : shoupai.toString(),
            baojia: rongpai ? model.lunban : null,
            fubaopai,
            fu: hule.fu,
            fanshu: hule.fanshu,
            damanguan: hule.damanguan,
            defen: hule.defen,
            hupai: hule.hupai,
            fenpei: hule.fenpei
          }
        };
        for (let key of ["fu", "fanshu", "damanguan"]) {
          if (!paipu.hule[key]) delete paipu.hule[key];
        }
        this.add_paipu(paipu);
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players("hule", msg, this._wait);
        if (this._view) this._view.update(paipu);
      }
      pingju(name, shoupai = ["", "", "", ""]) {
        let model = this._model;
        let fenpei = [0, 0, 0, 0];
        if (!name) {
          let n_tingpai = 0;
          for (let l = 0; l < 4; l++) {
            if (this._rule["\u30CE\u30FC\u30C6\u30F3\u5BA3\u8A00\u3042\u308A"] && !shoupai[l] && !model.shoupai[l].lizhi) continue;
            if (!this._rule["\u30CE\u30FC\u30C6\u30F3\u7F70\u3042\u308A"] && (this._rule["\u9023\u8358\u65B9\u5F0F"] != 2 || l != 0) && !model.shoupai[l].lizhi) {
              shoupai[l] = "";
            } else if (Majiang2.Util.xiangting(model.shoupai[l]) == 0 && Majiang2.Util.tingpai(model.shoupai[l]).length > 0) {
              n_tingpai++;
              shoupai[l] = model.shoupai[l].toString();
              if (this._rule["\u9023\u8358\u65B9\u5F0F"] == 2 && l == 0)
                this._lianzhuang = true;
            } else {
              shoupai[l] = "";
            }
          }
          if (this._rule["\u6D41\u3057\u6E80\u8CAB\u3042\u308A"]) {
            for (let l = 0; l < 4; l++) {
              let all_yaojiu = true;
              for (let p of model.he[l]._pai) {
                if (p.match(/[\+\=\-]$/)) {
                  all_yaojiu = false;
                  break;
                }
                if (p.match(/^z/)) continue;
                if (p.match(/^[mps][19]/)) continue;
                all_yaojiu = false;
                break;
              }
              if (all_yaojiu) {
                name = "\u6D41\u3057\u6E80\u8CAB";
                for (let i = 0; i < 4; i++) {
                  fenpei[i] += l == 0 && i == l ? 12e3 : l == 0 ? -4e3 : l != 0 && i == l ? 8e3 : l != 0 && i == 0 ? -4e3 : -2e3;
                }
              }
            }
          }
          if (!name) {
            name = "\u8352\u724C\u5E73\u5C40";
            if (this._rule["\u30CE\u30FC\u30C6\u30F3\u7F70\u3042\u308A"] && 0 < n_tingpai && n_tingpai < 4) {
              for (let l = 0; l < 4; l++) {
                fenpei[l] = shoupai[l] ? 3e3 / n_tingpai : -3e3 / (4 - n_tingpai);
              }
            }
          }
          if (this._rule["\u9023\u8358\u65B9\u5F0F"] == 3) this._lianzhuang = true;
        } else {
          this._no_game = true;
          this._lianzhuang = true;
        }
        if (this._rule["\u5834\u6570"] == 0) this._lianzhuang = true;
        this._fenpei = fenpei;
        let paipu = {
          pingju: { name, shoupai, fenpei }
        };
        this.add_paipu(paipu);
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players("pingju", msg, this._wait);
        if (this._view) this._view.update(paipu);
      }
      last() {
        let model = this._model;
        model.lunban = -1;
        if (this._view) this._view.update();
        if (!this._lianzhuang) {
          model.jushu++;
          model.zhuangfeng += model.jushu / 4 | 0;
          model.jushu = model.jushu % 4;
        }
        let jieju = false;
        let guanjun = -1;
        const defen = model.defen;
        for (let i = 0; i < 4; i++) {
          let id = (model.qijia + i) % 4;
          if (defen[id] < 0 && this._rule["\u30C8\u30D3\u7D42\u4E86\u3042\u308A"]) jieju = true;
          if (defen[id] >= 3e4 && (guanjun < 0 || defen[id] > defen[guanjun])) guanjun = id;
        }
        let sum_jushu = model.zhuangfeng * 4 + model.jushu;
        if (15 < sum_jushu) jieju = true;
        else if ((this._rule["\u5834\u6570"] + 1) * 4 - 1 < sum_jushu) jieju = true;
        else if (this._max_jushu < sum_jushu) {
          if (this._rule["\u5EF6\u9577\u6226\u65B9\u5F0F"] == 0) jieju = true;
          else if (this._rule["\u5834\u6570"] == 0) jieju = true;
          else if (guanjun >= 0) jieju = true;
          else {
            this._max_jushu += this._rule["\u5EF6\u9577\u6226\u65B9\u5F0F"] == 3 ? 4 : this._rule["\u5EF6\u9577\u6226\u65B9\u5F0F"] == 2 ? 1 : 0;
          }
        } else if (this._max_jushu == sum_jushu) {
          if (this._rule["\u30AA\u30FC\u30E9\u30B9\u6B62\u3081\u3042\u308A"] && guanjun == model.player_id[0] && this._lianzhuang && !this._no_game) jieju = true;
        }
        if (jieju) this.delay(() => this.jieju(), 0);
        else this.delay(() => this.qipai(), 0);
      }
      jieju() {
        let model = this._model;
        let paiming = [];
        const defen = model.defen;
        for (let i = 0; i < 4; i++) {
          let id = (model.qijia + i) % 4;
          for (let j = 0; j < 4; j++) {
            if (j == paiming.length || defen[id] > defen[paiming[j]]) {
              paiming.splice(j, 0, id);
              break;
            }
          }
        }
        defen[paiming[0]] += model.lizhibang * 1e3;
        this._paipu.defen = defen;
        let rank = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
          rank[paiming[i]] = i + 1;
        }
        this._paipu.rank = rank;
        const round = !this._rule["\u9806\u4F4D\u70B9"].find((p) => p.match(/\.\d$/));
        let point = [0, 0, 0, 0];
        for (let i = 1; i < 4; i++) {
          let id = paiming[i];
          point[id] = (defen[id] - 3e4) / 1e3 + +this._rule["\u9806\u4F4D\u70B9"][i];
          if (round) point[id] = Math.round(point[id]);
          point[paiming[0]] -= point[id];
        }
        this._paipu.point = point.map((p) => p.toFixed(round ? 0 : 1));
        let paipu = { jieju: this._paipu };
        let msg = [];
        for (let l = 0; l < 4; l++) {
          msg[l] = JSON.parse(JSON.stringify(paipu));
        }
        this.call_players("jieju", msg, this._wait);
        if (this._view) this._view.summary(this._paipu);
        if (this._handler) this._handler();
      }
      get_reply(l) {
        let model = this._model;
        return this._reply[model.player_id[l]];
      }
      reply_kaiju() {
        this.delay(() => this.qipai(), 0);
      }
      reply_qipai() {
        this.delay(() => this.zimo(), 0);
      }
      reply_zimo() {
        let model = this._model;
        let reply = this.get_reply(model.lunban);
        if (reply.daopai) {
          if (this.allow_pingju()) {
            let shoupai = ["", "", "", ""];
            shoupai[model.lunban] = model.shoupai[model.lunban].toString();
            return this.delay(() => this.pingju("\u4E5D\u7A2E\u4E5D\u724C", shoupai), 0);
          }
        } else if (reply.hule) {
          if (this.allow_hule()) {
            this.say("zimo", model.lunban);
            return this.delay(() => this.hule());
          }
        } else if (reply.gang) {
          if (this.get_gang_mianzi().find((m) => m == reply.gang)) {
            this.say("gang", model.lunban);
            return this.delay(() => this.gang(reply.gang));
          }
        } else if (reply.dapai) {
          let dapai = reply.dapai.replace(/\*$/, "");
          if (this.get_dapai().find((p2) => p2 == dapai)) {
            if (reply.dapai.slice(-1) == "*" && this.allow_lizhi(dapai)) {
              this.say("lizhi", model.lunban);
              return this.delay(() => this.dapai(reply.dapai));
            }
            return this.delay(() => this.dapai(dapai), 0);
          }
        }
        let p = this.get_dapai().pop();
        this.delay(() => this.dapai(p), 0);
      }
      reply_dapai() {
        let model = this._model;
        for (let i = 1; i < 4; i++) {
          let l2 = (model.lunban + i) % 4;
          let reply2 = this.get_reply(l2);
          if (reply2.hule && this.allow_hule(l2)) {
            if (this._rule["\u6700\u5927\u540C\u6642\u548C\u4E86\u6570"] == 1 && this._hule.length)
              continue;
            this.say("rong", l2);
            this._hule.push(l2);
          } else {
            let shoupai = model.shoupai[l2].clone().zimo(this._dapai);
            if (Majiang2.Util.xiangting(shoupai) == -1)
              this._neng_rong[l2] = false;
          }
        }
        if (this._hule.length == 3 && this._rule["\u6700\u5927\u540C\u6642\u548C\u4E86\u6570"] == 2) {
          let shoupai = ["", "", "", ""];
          for (let l2 of this._hule) {
            shoupai[l2] = model.shoupai[l2].toString();
          }
          return this.delay(() => this.pingju("\u4E09\u5BB6\u548C", shoupai));
        } else if (this._hule.length) {
          return this.delay(() => this.hule());
        }
        if (this._dapai.slice(-1) == "*") {
          model.defen[model.player_id[model.lunban]] -= 1e3;
          model.lizhibang++;
          if (this._lizhi.filter((x) => x).length == 4 && this._rule["\u9014\u4E2D\u6D41\u5C40\u3042\u308A"]) {
            let shoupai = model.shoupai.map((s) => s.toString());
            return this.delay(() => this.pingju("\u56DB\u5BB6\u7ACB\u76F4", shoupai));
          }
        }
        if (this._diyizimo && model.lunban == 3) {
          this._diyizimo = false;
          if (this._fengpai) {
            return this.delay(() => this.pingju("\u56DB\u98A8\u9023\u6253"), 0);
          }
        }
        if (this._n_gang.reduce((x, y) => x + y) == 4) {
          if (Math.max(...this._n_gang) < 4 && this._rule["\u9014\u4E2D\u6D41\u5C40\u3042\u308A"]) {
            return this.delay(() => this.pingju("\u56DB\u958B\u69D3"), 0);
          }
        }
        if (!model.shan.paishu) {
          let shoupai = ["", "", "", ""];
          for (let l2 = 0; l2 < 4; l2++) {
            let reply2 = this.get_reply(l2);
            if (reply2.daopai) shoupai[l2] = reply2.daopai;
          }
          return this.delay(() => this.pingju("", shoupai), 0);
        }
        for (let i = 1; i < 4; i++) {
          let l2 = (model.lunban + i) % 4;
          let reply2 = this.get_reply(l2);
          if (reply2.fulou) {
            let m = reply2.fulou.replace(/0/g, "5");
            if (m.match(/^[mpsz](\d)\1\1\1/)) {
              if (this.get_gang_mianzi(l2).find((m2) => m2 == reply2.fulou)) {
                this.say("gang", l2);
                return this.delay(() => this.fulou(reply2.fulou));
              }
            } else if (m.match(/^[mpsz](\d)\1\1/)) {
              if (this.get_peng_mianzi(l2).find((m2) => m2 == reply2.fulou)) {
                this.say("peng", l2);
                return this.delay(() => this.fulou(reply2.fulou));
              }
            }
          }
        }
        let l = (model.lunban + 1) % 4;
        let reply = this.get_reply(l);
        if (reply.fulou) {
          if (this.get_chi_mianzi(l).find((m) => m == reply.fulou)) {
            this.say("chi", l);
            return this.delay(() => this.fulou(reply.fulou));
          }
        }
        this.delay(() => this.zimo(), 0);
      }
      reply_fulou() {
        let model = this._model;
        if (this._gang) {
          return this.delay(() => this.gangzimo(), 0);
        }
        let reply = this.get_reply(model.lunban);
        if (reply.dapai) {
          if (this.get_dapai().find((p2) => p2 == reply.dapai)) {
            return this.delay(() => this.dapai(reply.dapai), 0);
          }
        }
        let p = this.get_dapai().pop();
        this.delay(() => this.dapai(p), 0);
      }
      reply_gang() {
        let model = this._model;
        if (this._gang.match(/^[mpsz]\d{4}$/)) {
          return this.delay(() => this.gangzimo(), 0);
        }
        for (let i = 1; i < 4; i++) {
          let l = (model.lunban + i) % 4;
          let reply = this.get_reply(l);
          if (reply.hule && this.allow_hule(l)) {
            if (this._rule["\u6700\u5927\u540C\u6642\u548C\u4E86\u6570"] == 1 && this._hule.length)
              continue;
            this.say("rong", l);
            this._hule.push(l);
          } else {
            let p = this._gang[0] + this._gang.slice(-1);
            let shoupai = model.shoupai[l].clone().zimo(p);
            if (Majiang2.Util.xiangting(shoupai) == -1)
              this._neng_rong[l] = false;
          }
        }
        if (this._hule.length) {
          return this.delay(() => this.hule());
        }
        this.delay(() => this.gangzimo(), 0);
      }
      reply_hule() {
        let model = this._model;
        for (let l = 0; l < 4; l++) {
          model.defen[model.player_id[l]] += this._fenpei[l];
        }
        model.changbang = 0;
        model.lizhibang = 0;
        if (this._hule.length) {
          return this.delay(() => this.hule());
        } else {
          if (this._lianzhuang) model.changbang = this._changbang + 1;
          return this.delay(() => this.last(), 0);
        }
      }
      reply_pingju() {
        let model = this._model;
        for (let l = 0; l < 4; l++) {
          model.defen[model.player_id[l]] += this._fenpei[l];
        }
        model.changbang++;
        this.delay(() => this.last(), 0);
      }
      get_dapai() {
        let model = this._model;
        return Game.get_dapai(this._rule, model.shoupai[model.lunban]);
      }
      get_chi_mianzi(l) {
        let model = this._model;
        let d = "_+=-"[(4 + model.lunban - l) % 4];
        return Game.get_chi_mianzi(
          this._rule,
          model.shoupai[l],
          this._dapai + d,
          model.shan.paishu
        );
      }
      get_peng_mianzi(l) {
        let model = this._model;
        let d = "_+=-"[(4 + model.lunban - l) % 4];
        return Game.get_peng_mianzi(
          this._rule,
          model.shoupai[l],
          this._dapai + d,
          model.shan.paishu
        );
      }
      get_gang_mianzi(l) {
        let model = this._model;
        if (l == null) {
          return Game.get_gang_mianzi(
            this._rule,
            model.shoupai[model.lunban],
            null,
            model.shan.paishu,
            this._n_gang.reduce((x, y) => x + y)
          );
        } else {
          let d = "_+=-"[(4 + model.lunban - l) % 4];
          return Game.get_gang_mianzi(
            this._rule,
            model.shoupai[l],
            this._dapai + d,
            model.shan.paishu,
            this._n_gang.reduce((x, y) => x + y)
          );
        }
      }
      allow_lizhi(p) {
        let model = this._model;
        return Game.allow_lizhi(
          this._rule,
          model.shoupai[model.lunban],
          p,
          model.shan.paishu,
          model.defen[model.player_id[model.lunban]]
        );
      }
      allow_hule(l) {
        let model = this._model;
        if (l == null) {
          let hupai = model.shoupai[model.lunban].lizhi || this._status == "gangzimo" || model.shan.paishu == 0;
          return Game.allow_hule(
            this._rule,
            model.shoupai[model.lunban],
            null,
            model.zhuangfeng,
            model.lunban,
            hupai
          );
        } else {
          let p = (this._status == "gang" ? this._gang[0] + this._gang.slice(-1) : this._dapai) + "_+=-"[(4 + model.lunban - l) % 4];
          let hupai = model.shoupai[l].lizhi || this._status == "gang" || model.shan.paishu == 0;
          return Game.allow_hule(
            this._rule,
            model.shoupai[l],
            p,
            model.zhuangfeng,
            l,
            hupai,
            this._neng_rong[l]
          );
        }
      }
      allow_pingju() {
        let model = this._model;
        return Game.allow_pingju(
          this._rule,
          model.shoupai[model.lunban],
          this._diyizimo
        );
      }
      static get_dapai(rule, shoupai) {
        if (rule["\u55B0\u3044\u66FF\u3048\u8A31\u53EF\u30EC\u30D9\u30EB"] == 0) return shoupai.get_dapai(true);
        if (rule["\u55B0\u3044\u66FF\u3048\u8A31\u53EF\u30EC\u30D9\u30EB"] == 1 && shoupai._zimo && shoupai._zimo.length > 2) {
          let deny = shoupai._zimo[0] + (+shoupai._zimo.match(/\d(?=[\+\=\-])/) || 5);
          return shoupai.get_dapai(false).filter((p) => p.replace(/0/, "5") != deny);
        }
        return shoupai.get_dapai(false);
      }
      static get_chi_mianzi(rule, shoupai, p, paishu) {
        let mianzi = shoupai.get_chi_mianzi(p, rule["\u55B0\u3044\u66FF\u3048\u8A31\u53EF\u30EC\u30D9\u30EB"] == 0);
        if (!mianzi) return mianzi;
        if (rule["\u55B0\u3044\u66FF\u3048\u8A31\u53EF\u30EC\u30D9\u30EB"] == 1 && shoupai._fulou.length == 3 && shoupai._bingpai[p[0]][p[1]] == 2) mianzi = [];
        return paishu == 0 ? [] : mianzi;
      }
      static get_peng_mianzi(rule, shoupai, p, paishu) {
        let mianzi = shoupai.get_peng_mianzi(p);
        if (!mianzi) return mianzi;
        return paishu == 0 ? [] : mianzi;
      }
      static get_gang_mianzi(rule, shoupai, p, paishu, n_gang) {
        let mianzi = shoupai.get_gang_mianzi(p);
        if (!mianzi || mianzi.length == 0) return mianzi;
        if (shoupai.lizhi) {
          if (rule["\u30EA\u30FC\u30C1\u5F8C\u6697\u69D3\u8A31\u53EF\u30EC\u30D9\u30EB"] == 0) return [];
          else if (rule["\u30EA\u30FC\u30C1\u5F8C\u6697\u69D3\u8A31\u53EF\u30EC\u30D9\u30EB"] == 1) {
            let new_shoupai, n_hule1 = 0, n_hule2 = 0;
            new_shoupai = shoupai.clone().dapai(shoupai._zimo);
            for (let p2 of Majiang2.Util.tingpai(new_shoupai)) {
              n_hule1 += Majiang2.Util.hule_mianzi(new_shoupai, p2).length;
            }
            new_shoupai = shoupai.clone().gang(mianzi[0]);
            for (let p2 of Majiang2.Util.tingpai(new_shoupai)) {
              n_hule2 += Majiang2.Util.hule_mianzi(new_shoupai, p2).length;
            }
            if (n_hule1 > n_hule2) return [];
          } else {
            let new_shoupai;
            new_shoupai = shoupai.clone().dapai(shoupai._zimo);
            let n_tingpai1 = Majiang2.Util.tingpai(new_shoupai).length;
            new_shoupai = shoupai.clone().gang(mianzi[0]);
            if (Majiang2.Util.xiangting(new_shoupai) > 0) return [];
            let n_tingpai2 = Majiang2.Util.tingpai(new_shoupai).length;
            if (n_tingpai1 > n_tingpai2) return [];
          }
        }
        return paishu == 0 || n_gang == 4 ? [] : mianzi;
      }
      static allow_lizhi(rule, shoupai, p, paishu, defen) {
        if (!shoupai._zimo) return false;
        if (shoupai.lizhi) return false;
        if (!shoupai.menqian) return false;
        if (!rule["\u30C4\u30E2\u756A\u306A\u3057\u30EA\u30FC\u30C1\u3042\u308A"] && paishu < 4) return false;
        if (rule["\u30C8\u30D3\u7D42\u4E86\u3042\u308A"] && defen < 1e3) return false;
        if (Majiang2.Util.xiangting(shoupai) > 0) return false;
        if (p) {
          let new_shoupai = shoupai.clone().dapai(p);
          return Majiang2.Util.xiangting(new_shoupai) == 0 && Majiang2.Util.tingpai(new_shoupai).length > 0;
        } else {
          let dapai = [];
          for (let p2 of Game.get_dapai(rule, shoupai)) {
            let new_shoupai = shoupai.clone().dapai(p2);
            if (Majiang2.Util.xiangting(new_shoupai) == 0 && Majiang2.Util.tingpai(new_shoupai).length > 0) {
              dapai.push(p2);
            }
          }
          return dapai.length ? dapai : false;
        }
      }
      static allow_hule(rule, shoupai, p, zhuangfeng, menfeng, hupai, neng_rong) {
        if (p && !neng_rong) return false;
        let new_shoupai = shoupai.clone();
        if (p) new_shoupai.zimo(p);
        if (Majiang2.Util.xiangting(new_shoupai) != -1) return false;
        if (hupai) return true;
        let param = {
          rule,
          zhuangfeng,
          menfeng,
          hupai: {},
          baopai: [],
          jicun: { changbang: 0, lizhibang: 0 }
        };
        let hule = Majiang2.Util.hule(shoupai, p, param);
        return hule.hupai != null;
      }
      static allow_pingju(rule, shoupai, diyizimo) {
        if (!(diyizimo && shoupai._zimo)) return false;
        if (!rule["\u9014\u4E2D\u6D41\u5C40\u3042\u308A"]) return false;
        let n_yaojiu = 0;
        for (let s of ["m", "p", "s", "z"]) {
          let bingpai = shoupai._bingpai[s];
          let nn = s == "z" ? [1, 2, 3, 4, 5, 6, 7] : [1, 9];
          for (let n of nn) {
            if (bingpai[n] > 0) n_yaojiu++;
          }
        }
        return n_yaojiu >= 9;
      }
      static allow_no_daopai(rule, shoupai, paishu) {
        if (paishu > 0 || shoupai._zimo) return false;
        if (!rule["\u30CE\u30FC\u30C6\u30F3\u5BA3\u8A00\u3042\u308A"]) return false;
        if (shoupai.lizhi) return false;
        return Majiang2.Util.xiangting(shoupai) == 0 && Majiang2.Util.tingpai(shoupai).length > 0;
      }
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/player.js
var require_player = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/player.js"(exports, module) {
    "use strict";
    var Majiang2 = {
      Shoupai: require_shoupai(),
      He: require_he(),
      Game: require_game(),
      Board: require_board(),
      Util: Object.assign(
        require_xiangting(),
        require_hule()
      )
    };
    module.exports = class Player {
      constructor() {
        this._model = new Majiang2.Board();
      }
      action(msg, callback) {
        this._callback = callback;
        if (msg.kaiju) this.kaiju(msg.kaiju);
        else if (msg.qipai) this.qipai(msg.qipai);
        else if (msg.zimo) this.zimo(msg.zimo);
        else if (msg.dapai) this.dapai(msg.dapai);
        else if (msg.fulou) this.fulou(msg.fulou);
        else if (msg.gang) this.gang(msg.gang);
        else if (msg.gangzimo) this.zimo(msg.gangzimo, true);
        else if (msg.kaigang) this.kaigang(msg.kaigang);
        else if (msg.hule) this.hule(msg.hule);
        else if (msg.pingju) this.pingju(msg.pingju);
        else if (msg.jieju) this.jieju(msg.jieju);
      }
      get shoupai() {
        return this._model.shoupai[this._menfeng];
      }
      get he() {
        return this._model.he[this._menfeng];
      }
      get shan() {
        return this._model.shan;
      }
      get hulepai() {
        return Majiang2.Util.xiangting(this.shoupai) == 0 && Majiang2.Util.tingpai(this.shoupai) || [];
      }
      get model() {
        return this._model;
      }
      set view(view) {
        this._view = view;
      }
      kaiju(kaiju) {
        this._id = kaiju.id;
        this._rule = kaiju.rule;
        this._model.kaiju(kaiju);
        if (this._view) this._view.kaiju(kaiju.id);
        if (this._callback) this.action_kaiju(kaiju);
      }
      qipai(qipai) {
        this._model.qipai(qipai);
        this._menfeng = this._model.menfeng(this._id);
        this._diyizimo = true;
        this._n_gang = 0;
        this._neng_rong = true;
        if (this._view) this._view.redraw();
        if (this._callback) this.action_qipai(qipai);
      }
      zimo(zimo, gangzimo) {
        this._model.zimo(zimo);
        if (gangzimo) this._n_gang++;
        if (this._view) {
          if (gangzimo) this._view.update({ gangzimo: zimo });
          else this._view.update({ zimo });
        }
        if (this._callback) this.action_zimo(zimo, gangzimo);
      }
      dapai(dapai) {
        if (dapai.l == this._menfeng) {
          if (!this.shoupai.lizhi) this._neng_rong = true;
        }
        this._model.dapai(dapai);
        if (this._view) this._view.update({ dapai });
        if (this._callback) this.action_dapai(dapai);
        if (dapai.l == this._menfeng) {
          this._diyizimo = false;
          if (this.hulepai.find((p) => this.he.find(p))) this._neng_rong = false;
        } else {
          let s = dapai.p[0], n = +dapai.p[1] || 5;
          if (this.hulepai.find((p) => p == s + n)) this._neng_rong = false;
        }
      }
      fulou(fulou) {
        this._model.fulou(fulou);
        if (this._view) this._view.update({ fulou });
        if (this._callback) this.action_fulou(fulou);
        this._diyizimo = false;
      }
      gang(gang) {
        this._model.gang(gang);
        if (this._view) this._view.update({ gang });
        if (this._callback) this.action_gang(gang);
        this._diyizimo = false;
        if (gang.l != this._menfeng && !gang.m.match(/^[mpsz]\d{4}$/)) {
          let s = gang.m[0], n = +gang.m.slice(-1) || 5;
          if (this.hulepai.find((p) => p == s + n)) this._neng_rong = false;
        }
      }
      kaigang(kaigang) {
        this._model.kaigang(kaigang);
        if (this._view) this._view.update({ kaigang });
      }
      hule(hule) {
        this._model.hule(hule);
        if (this._view) this._view.update({ hule });
        if (this._callback) this.action_hule(hule);
      }
      pingju(pingju) {
        this._model.pingju(pingju);
        if (this._view) this._view.update({ pingju });
        if (this._callback) this.action_pingju(pingju);
      }
      jieju(paipu) {
        this._model.jieju(paipu);
        this._paipu = paipu;
        if (this._view) this._view.summary(paipu);
        if (this._callback) this.action_jieju(paipu);
      }
      get_dapai(shoupai) {
        return Majiang2.Game.get_dapai(this._rule, shoupai);
      }
      get_chi_mianzi(shoupai, p) {
        return Majiang2.Game.get_chi_mianzi(
          this._rule,
          shoupai,
          p,
          this.shan.paishu
        );
      }
      get_peng_mianzi(shoupai, p) {
        return Majiang2.Game.get_peng_mianzi(
          this._rule,
          shoupai,
          p,
          this.shan.paishu
        );
      }
      get_gang_mianzi(shoupai, p) {
        return Majiang2.Game.get_gang_mianzi(
          this._rule,
          shoupai,
          p,
          this.shan.paishu,
          this._n_gang
        );
      }
      allow_lizhi(shoupai, p) {
        return Majiang2.Game.allow_lizhi(
          this._rule,
          shoupai,
          p,
          this.shan.paishu,
          this._model.defen[this._id]
        );
      }
      allow_hule(shoupai, p, hupai) {
        hupai = hupai || shoupai.lizhi || this.shan.paishu == 0;
        return Majiang2.Game.allow_hule(
          this._rule,
          shoupai,
          p,
          this._model.zhuangfeng,
          this._menfeng,
          hupai,
          this._neng_rong
        );
      }
      allow_pingju(shoupai) {
        return Majiang2.Game.allow_pingju(
          this._rule,
          shoupai,
          this._diyizimo
        );
      }
      allow_no_daopai(shoupai) {
        return Majiang2.Game.allow_no_daopai(
          this._rule,
          shoupai,
          this.shan.paishu
        );
      }
    };
  }
});

// node_modules/@kobalab/majiang-core/lib/index.js
var require_lib = __commonJS({
  "node_modules/@kobalab/majiang-core/lib/index.js"(exports, module) {
    "use strict";
    module.exports = {
      rule: require_rule(),
      Shoupai: require_shoupai(),
      Shan: require_shan(),
      He: require_he(),
      Board: require_board(),
      Game: require_game(),
      Player: require_player(),
      Util: Object.assign(
        require_xiangting(),
        require_hule()
      )
    };
  }
});

// node_modules/@kobalab/majiang-ai/lib/suanpai.js
var require_suanpai = __commonJS({
  "node_modules/@kobalab/majiang-ai/lib/suanpai.js"(exports, module) {
    "use strict";
    var Majiang2 = require_lib();
    var Paishu = class {
      constructor(paishu, n_zimo) {
        this._paishu = {};
        this._sum_paishu = 0;
        for (let s of ["m", "p", "s", "z"]) {
          for (let n = 0; n < paishu[s].length; n++) {
            if (s == "z" && n == 0) continue;
            this._paishu[s + n] = n == 5 ? paishu[s][n] - paishu[s][0] : paishu[s][n];
            this._sum_paishu += this._paishu[s + n];
          }
        }
        this._n_zimo = n_zimo;
      }
      val(p, real) {
        return real ? this._paishu[p.slice(0, 2)] : this._n_zimo > 0 ? this._paishu[p.slice(0, 2)] * this._n_zimo / this._sum_paishu : 0;
      }
      pop(p) {
        this._paishu[p.slice(0, 2)]--;
        this._sum_paishu--;
        this._n_zimo -= 4;
        return this;
      }
      push(p) {
        this._paishu[p.slice(0, 2)]++;
        this._sum_paishu++;
        this._n_zimo += 4;
        return this;
      }
    };
    module.exports = class SuanPai {
      constructor(hongpai) {
        this._paishu = {
          m: [hongpai.m, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          p: [hongpai.p, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          s: [hongpai.s, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          z: [0, 4, 4, 4, 4, 4, 4, 4]
        };
        this._zhuangfeng = 0;
        this._menfeng = 0;
        this._baopai = [];
        this._dapai = [{}, {}, {}, {}];
        this._lizhi = [];
        this._n_zimo = 70;
      }
      decrease(p) {
        this._paishu[p[0]][p[1]]--;
        if (p[1] == 0) this._paishu[p[0]][5]--;
      }
      qipai(qipai, menfeng) {
        this._zhuangfeng = qipai.zhuangfeng;
        this._menfeng = menfeng;
        this._baopai = [qipai.baopai];
        this.decrease(qipai.baopai);
        let paistr = qipai.shoupai[menfeng];
        for (let suitstr of paistr.match(/[mpsz]\d[\d\+\=\-]*/g) || []) {
          let s = suitstr[0];
          for (let n of suitstr.match(/\d/g)) {
            this.decrease(s + n);
          }
        }
      }
      zimo(zimo) {
        if (zimo.l == this._menfeng) this.decrease(zimo.p);
        this._n_zimo--;
      }
      dapai(dapai) {
        if (dapai.l != this._menfeng) {
          this.decrease(dapai.p);
          if (dapai.p.slice(-1) == "*") this._lizhi[dapai.l] = true;
        }
        let p = dapai.p[0] + (+dapai.p[1] || 5);
        this._dapai[dapai.l][p] = true;
        for (let l = 0; l < 4; l++) {
          if (this._lizhi[l]) this._dapai[l][p] = true;
        }
      }
      fulou(fulou) {
        if (fulou.l != this._menfeng) {
          let s = fulou.m[0];
          for (let n of fulou.m.match(/\d(?![\+\=\-])/g)) {
            this.decrease(s + n);
          }
        }
      }
      gang(gang) {
        if (gang.l != this._menfeng) {
          if (gang.m.match(/^[mpsz]\d{4}$/)) {
            let s = gang.m[0];
            for (let n of gang.m.match(/\d/g)) {
              this.decrease(s + n);
            }
          } else {
            let s = gang.m[0], n = gang.m.slice(-1);
            this.decrease(s + n);
          }
        }
      }
      kaigang(kaigang) {
        this._baopai.push(kaigang.baopai);
        this.decrease(kaigang.baopai);
      }
      get_paishu() {
        return new Paishu(this._paishu, this._n_zimo);
      }
      paijia(p) {
        const weight = (s2, n2) => {
          if (n2 < 1 || 9 < n2) return 0;
          let rv2 = 1;
          for (let p2 of this._baopai) {
            if (s2 + n2 == Majiang2.Shan.zhenbaopai(p2)) rv2 *= 2;
          }
          return rv2;
        };
        let rv = 0;
        let s = p[0], n = +p[1] || 5;
        const min = Math.min, max = Math.max, num = this._paishu[s];
        if (s == "z") {
          rv = p[1] != "0" ? num[n] * weight(s, n) : 0;
          if (n == this._zhuangfeng + 1) rv *= 2;
          if (n == this._menfeng + 1) rv *= 2;
          if (5 <= n && n <= 7) rv *= 2;
        } else {
          let left = 1 <= n - 2 ? min(num[n - 2], num[n - 1]) : 0;
          let center = 1 <= n - 1 && n + 1 <= 9 ? min(num[n - 1], num[n + 1]) : 0;
          let right = n + 2 <= 9 ? min(num[n + 1], num[n + 2]) : 0;
          let n_pai = [
            left,
            max(left, center),
            num[n],
            max(center, right),
            right
          ];
          rv = n_pai[0] * weight(s, n - 2) + n_pai[1] * weight(s, n - 1) + n_pai[2] * weight(s, n) + n_pai[3] * weight(s, n + 1) + n_pai[4] * weight(s, n + 2);
          rv += !num[0] ? 0 : n == 7 ? min(num[0], n_pai[0]) * weight(s, n - 2) : n == 6 ? min(num[0], n_pai[1]) * weight(s, n - 1) : n == 5 ? min(num[0], n_pai[2]) * weight(s, n) : n == 4 ? min(num[0], n_pai[3]) * weight(s, n + 1) : n == 3 ? min(num[0], n_pai[4]) * weight(s, n + 2) : 0;
          if (p[1] == "0") rv *= 2;
        }
        rv *= weight(s, n);
        return rv;
      }
      make_paijia(shoupai) {
        let n_suit = {};
        for (let s of ["m", "p", "s", "z"]) {
          n_suit[s] = shoupai._bingpai[s].slice(1).reduce((x, y) => x + y);
        }
        let n_sifeng = shoupai._bingpai.z.slice(1, 5).reduce((x, y) => x + y);
        let n_sanyuan = shoupai._bingpai.z.slice(5).reduce((x, y) => x + y);
        for (let m of shoupai._fulou) {
          n_suit[m[0]] += 3;
          if (m.match(/^z[1234]/)) n_sifeng += 3;
          if (m.match(/^z[567]/)) n_sanyuan += 3;
        }
        let paijia = {};
        return (p) => paijia[p] ?? (paijia[p] = this.paijia(p) * (p.match(/^z[1234]/) && n_sifeng >= 9 ? 8 : p.match(/^z[567]/) && n_sanyuan >= 6 ? 8 : p[0] == "z" && Math.max(...["m", "p", "s"].map((s) => n_suit[s])) + n_suit.z >= 10 ? 4 : n_suit[p[0]] + n_suit.z >= 10 ? 2 : 1));
      }
      suan_weixian(p, l, c = 1) {
        let s = p[0], n = +p[1] || 5;
        let r = 0;
        if (this._dapai[l][s + n]) return r;
        const paishu = this._paishu[s];
        r += paishu[n] - (c ? 0 : 1) == 3 ? s == "z" ? 8 : 3 : paishu[n] - (c ? 0 : 1) == 2 ? 3 : paishu[n] - (c ? 0 : 1) == 1 ? 1 : 0;
        if (s == "z") return r;
        r += n - 2 < 1 ? 0 : Math.min(paishu[n - 2], paishu[n - 1]) == 0 ? 0 : n - 2 == 1 ? 3 : this._dapai[l][s + (n - 3)] ? 0 : 10;
        r += n - 1 < 1 ? 0 : n + 1 > 9 ? 0 : Math.min(paishu[n - 1], paishu[n + 1]) == 0 ? 0 : 3;
        r += n + 2 > 9 ? 0 : Math.min(paishu[n + 1], paishu[n + 2]) == 0 ? 0 : n + 2 == 9 ? 3 : this._dapai[l][s + (n + 3)] ? 0 : 10;
        return r;
      }
      suan_weixian_all(bingpai) {
        let weixian_all;
        for (let l = 0; l < 4; l++) {
          if (!this._lizhi[l]) continue;
          if (!weixian_all) weixian_all = {};
          let weixian = {}, sum = 0;
          for (let s of ["m", "p", "s", "z"]) {
            for (let n = 1; n < this._paishu[s].length; n++) {
              weixian[s + n] = this.suan_weixian(s + n, l, bingpai[s][n]);
              sum += weixian[s + n];
            }
          }
          for (let p of Object.keys(weixian)) {
            weixian[p] = weixian[p] / (sum || 1) * 100 * (l == 0 ? 1.5 : 1);
            if (!weixian_all[p]) weixian_all[p] = 0;
            weixian_all[p] = Math.max(weixian_all[p], weixian[p]);
          }
        }
        if (weixian_all) return (p) => weixian_all[p[0] + (+p[1] || 5)];
      }
    };
  }
});

// node_modules/@kobalab/majiang-ai/lib/player.js
var require_player2 = __commonJS({
  "node_modules/@kobalab/majiang-ai/lib/player.js"(exports, module) {
    "use strict";
    var Majiang2 = require_lib();
    var SuanPai = require_suanpai();
    var width = [8, 8 * 4, 8 * 4 * 2];
    function add_hongpai(tingpai) {
      let pai = [];
      for (let p of tingpai) {
        if (p[0] != "z" && p[1] == "5") pai.push(p.replace(/5/, "0"));
        pai.push(p);
      }
      return pai;
    }
    module.exports = class Player extends Majiang2.Player {
      qipai(qipai) {
        this._defen_cache = {};
        this._eval_cache = {};
        this._suanpai = new SuanPai(this._rule["\u8D64\u724C"]);
        this._suanpai.qipai(
          qipai,
          (this._id + 4 - this._model.qijia + 4 - qipai.jushu) % 4
        );
        super.qipai(qipai);
      }
      zimo(zimo, gangzimo) {
        if (zimo.l == this._menfeng) this._eval_cache = {};
        this._suanpai.zimo(zimo);
        super.zimo(zimo, gangzimo);
      }
      dapai(dapai) {
        if (dapai.l != this._menfeng) this._eval_cache = {};
        this._suanpai.dapai(dapai);
        super.dapai(dapai);
      }
      fulou(fulou) {
        this._suanpai.fulou(fulou);
        super.fulou(fulou);
      }
      gang(gang) {
        this._suanpai.gang(gang);
        super.gang(gang);
      }
      kaigang(kaigang) {
        this._defen_cache = {};
        this._eval_cache = {};
        this._suanpai.kaigang(kaigang);
        super.kaigang(kaigang);
      }
      action_kaiju(kaiju) {
        this._callback();
      }
      action_qipai(qipai) {
        this._callback();
      }
      action_zimo(zimo, gangzimo) {
        if (zimo.l != this._menfeng) return this._callback();
        let m;
        if (this.select_hule(null, gangzimo))
          this._callback({ hule: "-" });
        else if (this.select_pingju()) this._callback({ daopai: "-" });
        else if (m = this.select_gang()) this._callback({ gang: m });
        else this._callback({ dapai: this.select_dapai() });
      }
      action_dapai(dapai) {
        if (dapai.l == this._menfeng) {
          if (this.select_daopai()) this._callback({ daopai: "-" });
          else this._callback();
          return;
        }
        let m;
        if (this.select_hule(dapai)) this._callback({ hule: "-" });
        else if (m = this.select_fulou(dapai)) this._callback({ fulou: m });
        else if (this.select_daopai()) this._callback({ daopai: "-" });
        else this._callback();
      }
      action_fulou(fulou) {
        if (fulou.l != this._menfeng) return this._callback();
        if (fulou.m.match(/^[mpsz]\d{4}/)) return this._callback();
        this._callback({ dapai: this.select_dapai() });
      }
      action_gang(gang) {
        if (gang.l == this._menfeng) return this._callback();
        if (this.select_hule(gang, true)) this._callback({ hule: "-" });
        else this._callback();
      }
      action_hule(hule) {
        this._callback();
      }
      action_pingju(pingju) {
        this._callback();
      }
      action_jieju(jieju) {
        this._callback();
      }
      select_hule(data, hupai, info) {
        let rongpai;
        if (data) {
          if (data.m && data.m.match(/^[mpsz]\d{4}$/)) return false;
          let d = ["", "+", "=", "-"][(4 + this._model.lunban - this._menfeng) % 4];
          rongpai = data.m ? data.m[0] + data.m.slice(-1) + d : data.p.slice(0, 2) + d;
        }
        let hule = this.allow_hule(this.shoupai, rongpai, hupai);
        if (info && hule) {
          let shoupai = this.shoupai.clone();
          if (rongpai) shoupai.zimo(rongpai);
          info.push({
            m: "",
            n_xiangting: -1,
            ev: this.get_defen(this.shoupai, rongpai),
            shoupai: shoupai.toString()
          });
        }
        return hule;
      }
      select_pingju() {
        if (Majiang2.Util.xiangting(this.shoupai) < 4) return false;
        return this.allow_pingju(this.shoupai);
      }
      select_fulou(dapai, info) {
        let n_xiangting = Majiang2.Util.xiangting(this.shoupai);
        if (this._model.shoupai.find((s) => s.lizhi) && n_xiangting >= 3) return;
        let d = ["", "+", "=", "-"][(4 + this._model.lunban - this._menfeng) % 4];
        let p = dapai.p.slice(0, 2) + d;
        if (n_xiangting < 3) {
          let mianzi = this.get_gang_mianzi(this.shoupai, p).concat(this.get_peng_mianzi(this.shoupai, p)).concat(this.get_chi_mianzi(this.shoupai, p));
          if (!mianzi.length) return;
          let fulou;
          let paishu = this._suanpai.get_paishu();
          let max = this.eval_shoupai(this.shoupai, paishu, "");
          if (info) {
            info.push({
              m: "",
              n_xiangting,
              ev: max,
              shoupai: this.shoupai.toString()
            });
          }
          for (let m of mianzi) {
            let shoupai = this.shoupai.clone().fulou(m);
            let x = Majiang2.Util.xiangting(shoupai);
            if (x >= 3) continue;
            let ev = this.eval_shoupai(shoupai, paishu);
            if (info && ev > 0) {
              info.push({
                m,
                n_xiangting: x,
                ev,
                shoupai: shoupai.toString()
              });
            }
            if (this._model.shoupai.find((s) => s.lizhi)) {
              if (x > 0 && ev < 750) continue;
              if (x == 0 && ev < 250) continue;
            }
            if (ev - max > 1e-7) {
              max = ev;
              fulou = m;
            }
          }
          return fulou;
        } else {
          let mianzi = this.get_peng_mianzi(this.shoupai, p).concat(this.get_chi_mianzi(this.shoupai, p));
          if (!mianzi.length) return;
          n_xiangting = this.xiangting(this.shoupai);
          let paishu;
          if (info) {
            paishu = this._suanpai.get_paishu();
            let ev = this.eval_shoupai(this.shoupai, paishu);
            let n_tingpai = Majiang2.Util.tingpai(this.shoupai).map((p2) => this._suanpai._paishu[p2[0]][p2[1]]).reduce((x, y) => x + y, 0);
            info.push({
              m: "",
              n_xiangting,
              ev,
              n_tingpai,
              shoupai: this.shoupai.toString()
            });
          }
          for (let m of mianzi) {
            let shoupai = this.shoupai.clone().fulou(m);
            let x = this.xiangting(shoupai);
            if (x >= n_xiangting) continue;
            if (info) {
              info.push({
                m,
                n_xiangting: x,
                shoupai: shoupai.toString()
              });
            }
            return m;
          }
        }
      }
      select_gang(info) {
        let n_xiangting = Majiang2.Util.xiangting(this.shoupai);
        if (this._model.shoupai.find((s) => s.lizhi) && n_xiangting > 0) return;
        let paishu = this._suanpai.get_paishu();
        if (n_xiangting < 3) {
          let gang, max = this.eval_shoupai(this.shoupai, paishu);
          for (let m of this.get_gang_mianzi(this.shoupai)) {
            let shoupai = this.shoupai.clone().gang(m);
            if (Majiang2.Util.xiangting(shoupai) >= 3) continue;
            let ev = this.eval_shoupai(shoupai, paishu);
            if (info) {
              let p = m.match(/\d{4}$/) ? m.slice(0, 2) : m[0] + m.slice(-1);
              let tingpai = Majiang2.Util.tingpai(shoupai);
              let n_tingpai = tingpai.map((p2) => this._suanpai._paishu[p2[0]][p2[1]]).reduce((x, y) => x + y, 0);
              info.push({
                p,
                m,
                n_xiangting,
                ev,
                tingpai,
                n_tingpai
              });
            }
            if (ev - max > -1e-7) {
              gang = m;
              max = ev;
            }
          }
          return gang;
        } else {
          n_xiangting = this.xiangting(this.shoupai);
          for (let m of this.get_gang_mianzi(this.shoupai)) {
            let shoupai = this.shoupai.clone().gang(m);
            if (this.xiangting(shoupai) == n_xiangting) {
              if (info) {
                let p = m.match(/\d{4}$/) ? m.slice(0, 2) : m[0] + m.slice(-1);
                let ev = this.eval_shoupai(shoupai, paishu);
                let tingpai = Majiang2.Util.tingpai(shoupai);
                let n_tingpai = tingpai.map((p2) => this._suanpai._paishu[p2[0]][p2[1]]).reduce((x, y) => x + y, 0);
                info.push({
                  p,
                  m,
                  n_xiangting,
                  ev,
                  tingpai,
                  n_tingpai
                });
              }
              return m;
            }
          }
        }
      }
      select_dapai(info) {
        let anquan, min = Infinity;
        const weixian = this._suanpai.suan_weixian_all(this.shoupai._bingpai);
        if (weixian) {
          for (let p of this.get_dapai(this.shoupai)) {
            if (weixian(p) < min) {
              min = weixian(p);
              anquan = p;
            }
          }
        }
        let dapai = anquan, max = -1, min_tingpai = 0, backtrack = [];
        let n_xiangting = Majiang2.Util.xiangting(this.shoupai);
        let paishu = this._suanpai.get_paishu();
        const paijia = this._suanpai.make_paijia(this.shoupai);
        const cmp = (a, b) => paijia(a) - paijia(b);
        for (let p of this.get_dapai(this.shoupai).reverse().sort(cmp)) {
          if (!dapai) dapai = p;
          let shoupai = this.shoupai.clone().dapai(p);
          if (n_xiangting > 2 && this.xiangting(shoupai) > n_xiangting || Majiang2.Util.xiangting(shoupai) > n_xiangting) {
            if (anquan) continue;
            if (n_xiangting < 2) backtrack.push(p);
            continue;
          }
          let ev = this.eval_shoupai(shoupai, paishu);
          let tingpai = Majiang2.Util.tingpai(shoupai);
          let n_tingpai = tingpai.map((p2) => this._suanpai._paishu[p2[0]][p2[1]]).reduce((x, y) => x + y, 0);
          if (info) {
            info.map((i) => {
              if (i.p == p.slice(0, 2) && i.m)
                i.weixian = weixian && weixian(p);
            });
            if (!info.find((i) => i.p == p.slice(0, 2) && !i.m)) {
              info.push({
                p: p.slice(0, 2),
                n_xiangting,
                ev,
                tingpai,
                n_tingpai,
                weixian: weixian && weixian(p)
              });
            }
          }
          if (weixian && weixian(p) > min) {
            if (weixian(p) >= 13) continue;
            if (n_xiangting > 2 || n_xiangting > 0 && ev < 80) {
              if (weixian(p) >= 8) continue;
              if (min < 3.2) continue;
            } else if (n_xiangting > 0 && ev < 750 || n_xiangting == 0 && ev < 50) {
              if (weixian(p) >= 8) continue;
              if (min < 3.2 && weixian(p) >= 3.2) continue;
            }
          }
          if (ev - max > 1e-7) {
            max = ev;
            dapai = p;
            min_tingpai = n_tingpai * 6;
          }
        }
        let tmp_max = max;
        for (let p of backtrack) {
          let shoupai = this.shoupai.clone().dapai(p);
          let tingpai = Majiang2.Util.tingpai(shoupai);
          let n_tingpai = tingpai.map((p2) => this._suanpai._paishu[p2[0]][p2[1]]).reduce((x, y) => x + y, 0);
          if (n_tingpai < min_tingpai) continue;
          let back = p[0] + (+p[1] || 5);
          let ev = this.eval_backtrack(shoupai, paishu, back, tmp_max * 2);
          if (info && ev > 0) {
            if (!info.find((i) => i.p == p.slice(0, 2) && !i.m)) {
              info.push({
                p: p.slice(0, 2),
                n_xiangting: n_xiangting + 1,
                ev,
                tingpai,
                n_tingpai
              });
            }
          }
          if (ev - max > 1e-7) {
            max = ev;
            dapai = p;
          }
        }
        if (anquan) {
          if (info && dapai == anquan && !info.find((i) => i.p == anquan.slice(0, 2))) {
            info.push({
              p: anquan.slice(0, 2),
              n_xiangting: Majiang2.Util.xiangting(
                this.shoupai.clone().dapai(anquan)
              ),
              weixian: weixian && weixian(anquan)
            });
          }
        }
        if (this.select_lizhi(dapai) && max >= 350) dapai += "*";
        return dapai;
      }
      select_lizhi(p) {
        return this.allow_lizhi(this.shoupai, p);
      }
      select_daopai() {
        return this.allow_no_daopai(this.shoupai);
      }
      xiangting(shoupai) {
        function xiangting_menqian(shoupai2) {
          return shoupai2.menqian ? Majiang2.Util.xiangting(shoupai2) : Infinity;
        }
        function xiangting_fanpai(shoupai2, zhuangfeng, menfeng, suanpai) {
          let n_fanpai = 0, back;
          for (let n of [zhuangfeng + 1, menfeng + 1, 5, 6, 7]) {
            if (shoupai2._bingpai.z[n] >= 3) n_fanpai++;
            else if (shoupai2._bingpai.z[n] == 2 && suanpai._paishu.z[n]) back = "z" + n + n + n + "+";
            for (let m of shoupai2._fulou) {
              if (m[0] == "z" && m[1] == n) n_fanpai++;
            }
          }
          if (n_fanpai) return Majiang2.Util.xiangting(shoupai2);
          if (back) {
            let new_shoupai = shoupai2.clone();
            new_shoupai.fulou(back, false);
            new_shoupai._zimo = null;
            return Majiang2.Util.xiangting(new_shoupai) + 1;
          }
          return Infinity;
        }
        function xiangting_duanyao(shoupai2, rule) {
          if (!rule["\u30AF\u30A4\u30BF\u30F3\u3042\u308A"] && !shoupai2.menqian) return Infinity;
          if (shoupai2._fulou.find((m) => m.match(/^z|[19]/))) return Infinity;
          let new_shoupai = shoupai2.clone();
          for (let s of ["m", "p", "s"]) {
            new_shoupai._bingpai[s][1] = 0;
            new_shoupai._bingpai[s][9] = 0;
          }
          new_shoupai._bingpai.z = [0, 0, 0, 0, 0, 0, 0, 0];
          return Majiang2.Util.xiangting(new_shoupai);
        }
        function xiangting_duidui(shoupai2) {
          if (shoupai2._fulou.map((m) => m.replace(/0/, "5")).find((m) => !m.match(/^[mpsz](\d)\1\1/)))
            return Infinity;
          let n_kezi = shoupai2._fulou.length, n_duizi = 0;
          for (let s of ["m", "p", "s", "z"]) {
            let bingpai = shoupai2._bingpai[s];
            for (let n = 1; n < bingpai.length; n++) {
              if (bingpai[n] >= 3) n_kezi++;
              else if (bingpai[n] == 2) n_duizi++;
            }
          }
          if (n_kezi + n_duizi > 5) n_duizi = 5 - n_kezi;
          return 8 - n_kezi * 2 - n_duizi;
        }
        function xiangting_yise(shoupai2, suit) {
          const regexp = new RegExp(`^[z${suit}]`);
          if (shoupai2._fulou.find((m) => !m.match(regexp))) return Infinity;
          let new_shoupai = shoupai2.clone();
          for (let s of ["m", "p", "s"]) {
            if (s != suit) new_shoupai._bingpai[s] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }
          return Majiang2.Util.xiangting(new_shoupai);
        }
        return Math.min(
          xiangting_menqian(shoupai),
          xiangting_fanpai(
            shoupai,
            this._model.zhuangfeng,
            this._menfeng,
            this._suanpai
          ),
          xiangting_duanyao(shoupai, this._rule),
          xiangting_duidui(shoupai),
          xiangting_yise(shoupai, "m"),
          xiangting_yise(shoupai, "p"),
          xiangting_yise(shoupai, "s")
        );
      }
      tingpai(shoupai) {
        let n_xiangting = this.xiangting(shoupai);
        let pai = [];
        for (let p of Majiang2.Util.tingpai(shoupai, (s) => this.xiangting(s))) {
          if (n_xiangting > 0) {
            for (let m of this.get_peng_mianzi(shoupai, p + "+")) {
              let new_shoupai = shoupai.clone().fulou(m);
              if (this.xiangting(new_shoupai) < n_xiangting) {
                pai.push(p + "+");
                break;
              }
            }
            if (pai[pai.length - 1] == p + "+") continue;
            for (let m of this.get_chi_mianzi(shoupai, p + "-")) {
              let new_shoupai = shoupai.clone().fulou(m);
              if (this.xiangting(new_shoupai) < n_xiangting) {
                pai.push(p + "-");
                break;
              }
            }
            if (pai[pai.length - 1] == p + "-") continue;
          }
          pai.push(p);
        }
        return pai;
      }
      get_defen(shoupai, rongpai) {
        let paistr = shoupai.toString();
        if (rongpai)
          paistr = paistr.replace(/^([^\*\,]*)(.*)$/, `$1${rongpai}$2`);
        if (this._defen_cache[paistr] != null) return this._defen_cache[paistr];
        let param = {
          rule: this._rule,
          zhuangfeng: this._model.zhuangfeng,
          menfeng: this._menfeng,
          hupai: { lizhi: shoupai.menqian },
          baopai: this.shan.baopai,
          jicun: { changbang: 0, lizhibang: 0 }
        };
        let hule = Majiang2.Util.hule(shoupai, rongpai, param);
        this._defen_cache[paistr] = hule.defen;
        return hule.defen;
      }
      eval_shoupai(shoupai, paishu, back) {
        let paistr = shoupai.toString() + (back != null ? `:${back}` : "");
        if (this._eval_cache[paistr] != null) return this._eval_cache[paistr];
        let rv = 0;
        let n_xiangting = Majiang2.Util.xiangting(shoupai);
        if (n_xiangting == -1) {
          rv = this.get_defen(shoupai);
        } else if (shoupai._zimo) {
          for (let p of this.get_dapai(shoupai)) {
            let new_shoupai = shoupai.clone().dapai(p);
            if (Majiang2.Util.xiangting(new_shoupai) > n_xiangting) continue;
            let ev = this.eval_shoupai(new_shoupai, paishu, back);
            if (ev > rv) rv = ev;
          }
        } else if (n_xiangting < 3) {
          for (let p of add_hongpai(Majiang2.Util.tingpai(shoupai))) {
            if (p == back) {
              rv = 0;
              break;
            }
            if (paishu.val(p) == 0) continue;
            let new_shoupai = shoupai.clone().zimo(p);
            paishu.pop(p);
            let ev = this.eval_shoupai(new_shoupai, paishu, back);
            if (!back) {
              if (n_xiangting > 0)
                ev += this.eval_fulou(shoupai, p, paishu, back);
            }
            paishu.push(p);
            rv += ev * paishu.val(p);
          }
          rv /= width[n_xiangting];
        } else {
          for (let p of add_hongpai(this.tingpai(shoupai))) {
            if (paishu.val(p, 1) == 0) continue;
            rv += paishu.val(p, 1) * (p[2] == "+" ? 4 : p[2] == "-" ? 2 : 1);
          }
        }
        this._eval_cache[paistr] = rv;
        return rv;
      }
      eval_backtrack(shoupai, paishu, back, min) {
        let n_xiangting = Majiang2.Util.xiangting(shoupai);
        let rv = 0;
        for (let p of add_hongpai(Majiang2.Util.tingpai(shoupai))) {
          if (p.replace(/0/, "5") == back) continue;
          if (paishu.val(p) == 0) continue;
          let new_shoupai = shoupai.clone().zimo(p);
          paishu.pop(p);
          let ev = this.eval_shoupai(new_shoupai, paishu, back);
          paishu.push(p);
          if (ev - min > 1e-7) rv += ev * paishu.val(p);
        }
        return rv / width[n_xiangting];
      }
      eval_fulou(shoupai, p, paishu, back) {
        let n_xiangting = Majiang2.Util.xiangting(shoupai);
        let peng_max = 0;
        for (let m of this.get_peng_mianzi(shoupai, p + "+")) {
          let new_shoupai = shoupai.clone().fulou(m);
          if (Majiang2.Util.xiangting(new_shoupai) >= n_xiangting) continue;
          peng_max = Math.max(
            this.eval_shoupai(new_shoupai, paishu, back),
            peng_max
          );
        }
        let chi_max = 0;
        for (let m of this.get_chi_mianzi(shoupai, p + "-")) {
          let new_shoupai = shoupai.clone().fulou(m);
          if (Majiang2.Util.xiangting(new_shoupai) >= n_xiangting) continue;
          chi_max = Math.max(
            this.eval_shoupai(new_shoupai, paishu, back),
            chi_max
          );
        }
        return peng_max > chi_max ? peng_max * 3 : peng_max * 2 + chi_max;
      }
    };
  }
});

// node_modules/@kobalab/majiang-ai/lib/minipaipu.js
var require_minipaipu = __commonJS({
  "node_modules/@kobalab/majiang-ai/lib/minipaipu.js"(exports, module) {
    "use strict";
    var Majiang2 = require_lib();
    function parse_heinfo(heinfo, menfeng, paistr) {
      let he = [], fulou = [];
      for (let i = 0; i < 4; i++) {
        let l = (menfeng + i) % 4;
        fulou[l] = (heinfo[i] || "").split(/,/);
        he[l] = fulou[l].shift().match(/[mpsz]\d[_\*\+\=\-\^]*/g) || [];
        fulou[l] = fulou[l].map((m) => Majiang2.Shoupai.valid_mianzi(m)).filter((m) => m);
      }
      fulou[menfeng] = paistr.split(/,/).slice(1);
      for (let l = 0; l < 4; l++) {
        for (let m of fulou[l].reverse()) {
          if (m.match(/[mpsz]\d{3}[\+\=\-]\d$/)) {
            let p = m[0] + m[5] + "^";
            let i = he[l].lastIndexOf(p);
            if (i >= 0) {
              he[l][i] = `^,${m}`;
              m = m.slice(0, 5);
            }
          }
          let d = { "+": 1, "=": 2, "-": 3 }[m.match(/[\+\=\-]/)] || 0;
          if (d) {
            let p = m[0] + m.match(/\d[\+\=\-]/);
            let i = he[(l + d) % 4].map((p2) => p2.replace(/[_\*]/, "")).lastIndexOf(p);
            if (i < 0) he[(l + d) % 4].unshift(`${p},${m}`);
            else he[(l + d) % 4][i] += `,${m}`;
          } else {
            let p = m[0] + m[1] + "^";
            let i = he[l].lastIndexOf(p);
            if (i < 0) he[l].unshift(`^,${m}`);
            else he[l][i] = `^,${m}`;
          }
        }
      }
      return he;
    }
    function play_heinfo(player, heinfo, menfeng, paistr, fix) {
      let he = parse_heinfo(heinfo, menfeng, paistr);
      let rv = ["", "", "", ""];
      let l = 0, fulou, gang;
      while (he.find((h) => h && h.length) || gang) {
        if (!he[l].length || fulou && he[l][0][0] == "^") {
          if (fulou) {
            player.model.shoupai[l]._bingpai._--;
            fulou = null;
          } else {
            player.shan.paishu--;
          }
          if (gang) {
            he[l].unshift(`^,${gang}`);
            gang = null;
          }
          l = (l + 1) % 4;
          continue;
        }
        let id = player.model.player_id[l];
        let [p, m] = he[l].shift().split(/,/);
        if (p == "^") {
          if (l != menfeng) {
            player.zimo({ l, m: "_" });
            player.gang({ l, m });
          } else {
            player.shan.paishu--;
          }
          rv[id] += m[0] + (m[5] || m[1]) + "^";
          continue;
        } else {
          p = p.replace(/[\+\=\-\^]$/, "");
          if (!fulou) {
            player.zimo({ l, p });
          } else if (l == menfeng) {
            player._suanpai._paishu[p[0]][p[1]]--;
            if (p[1] == 0) player._suanpai._paishu[p[0]][5]--;
          }
          player.dapai({ l, p });
          rv[id] += p;
          if (gang) {
            he[l].unshift(`^,${gang}`);
            gang = null;
          }
        }
        if (m) {
          let d = { "+": 1, "=": 2, "-": 3 }[m.match(/[\+\=\-]/)];
          l = (l + 4 - d) % 4;
          if (m.match(/[mpsz]\d{3}[\+\=\-]\d$/)) {
            gang = m;
            m = m.slice(0, 5);
          }
          if (l != menfeng) {
            player.fulou({ l, m });
          } else {
            player.model.he[player.model.lunban].fulou(m);
            player.shoupai._bingpai._++;
            player._suanpai._paishu[p[0]][p[1]]++;
            if (p[1] == 0) player._suanpai._paishu[p[0]][5]++;
          }
          rv[id] += m.match(/[\+\=\-]/);
          if (m.length == 5) fulou = m;
        } else {
          l = (l + 1) % 4;
          fulou = null;
        }
      }
      player.shoupai.fromString(paistr);
      for (let i = 1; i < 4; i++) {
        let l2 = (menfeng + i) % 4;
        let fulou2 = (heinfo[i] || "").split(/,/).slice(1).map((m) => Majiang2.Shoupai.valid_mianzi(m)).filter((m) => m);
        rv[i] = [rv[i], ...fulou2].join(",");
        if (fix) player.model.shoupai[l2]._fulou = fulou2;
      }
      return rv;
    }
    function minipaipu(player, baseinfo, heinfo, fix) {
      let { paistr, zhuangfeng, menfeng, baopai, hongpai, xun } = baseinfo;
      baopai = baopai.filter((p) => Majiang2.Shoupai.valid_pai(p));
      const rule = hongpai ? Majiang2.rule({ "\u8D64\u724C": { m: 1, p: 1, s: 1 } }) : Majiang2.rule({ "\u8D64\u724C": { m: 0, p: 0, s: 0 } });
      player.kaiju({ id: 0, rule, qijia: 0 });
      let qipai = {
        zhuangfeng,
        jushu: [0, 3, 2, 1][menfeng],
        changbang: 0,
        lizhibang: 0,
        defen: [25e3, 25e3, 25e3, 25e3],
        baopai: baopai.shift(),
        shoupai: ["", "", "", ""]
      };
      qipai.shoupai[menfeng] = paistr;
      player.qipai(qipai);
      if (player.shoupai.get_dapai()) player.model.shan.paishu--;
      let rv;
      if (heinfo) rv = play_heinfo(player, heinfo, menfeng, paistr, fix);
      else if (xun) player.shan.paishu -= (xun - 1) * 4 + menfeng;
      while (baopai.length) player.kaigang({ baopai: baopai.shift() });
      if (player._suanpai._n_zimo) player._suanpai._n_zimo = player.shan.paishu;
      return rv;
    }
    module.exports = minipaipu;
  }
});

// node_modules/@kobalab/majiang-ai/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/@kobalab/majiang-ai/lib/index.js"(exports, module) {
    "use strict";
    var AI = require_player2();
    AI.minipaipu = require_minipaipu();
    module.exports = AI;
  }
});

// tools/majiang-ai-browser-entry.js
var import_majiang_ai = __toESM(require_lib2(), 1);
var import_majiang_core = __toESM(require_lib(), 1);
var majiang_ai_browser_entry_default = import_majiang_ai.default;
var export_Majiang = import_majiang_core.default;
export {
  export_Majiang as Majiang,
  majiang_ai_browser_entry_default as default
};
