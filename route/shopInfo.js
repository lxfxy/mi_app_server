const fs = require("fs");
const fsPromise = fs.promises;
const express = require("express");
const app = express.Router();
const path = require("path");

const util = require("../utils");

let shopPath = path.resolve(__dirname, "../data/shop.json");
let userPath = path.resolve(__dirname, "../data/user.json");

app.use(async (req, res, next) => {
    let [_USERS, _SHOPS] = await Promise.all([
        fsPromise.readFile(userPath, "utf8"),
        fsPromise.readFile(shopPath, "utf8")
    ]);
    res._USERS = JSON.parse(_USERS || "[]");
    res._SHOPS = JSON.parse(_SHOPS || "[]");
    // console.log(_SHOPS, _USERS)
    next();
});

app.get("/getShop", (req, res) => {
    let { id } = req.query;
    let data = res._SHOPS.find( item => parseInt(item.id) === parseInt(id));
    if (data) {
        util.success(res, {
            data,
        });
        return;
    };
    util.success(res);
});

app.post("/joinCart", async (req, res) => {
    let {
        types,
        phone,
        shopId,
        shopNum,
        place,
        name
    } = req.body;
    shopNum = parseInt(shopNum);
    shopId = parseInt(shopId);
    let curData = res._SHOPS.find( item => item.id === parseInt(shopId));
    let curUser = res._USERS.find( item => item.phone === phone || item.name === name);
    let hasShop = curUser.data.cart.find( item => item.title === curData.title && item.types === types && item.place === place);
    let SurplusNum = null;
    let { title, price } = curData;

    let curShopData = curData.msg.shopData;

    types.replace(/[\u4e00-\u9FA5]+:([\u4e00-\u9FA5]+);/g, (...[,$1]) => {
        if (SurplusNum <= 0 && SurplusNum !== null) return;
        let data = curShopData.find(item => item.name === $1);
        SurplusNum = parseInt(data.num);
        if (data.data) {
            curShopData = data.data;
        };
        if (data) {
            data.num -= shopNum;
        };
    });

    // console.log(SurplusNum);
    if (SurplusNum <= 0 && shopNum > 0) {
        util.success(res, {
            code: 1,
            codeText: "此商品已售空",
        });
        return;
    } else if (SurplusNum < shopNum && shopNum > 0) {
        util.success(res, {
            code: 1,
            codeText: "已选商品数量, 大于现有商品数量"
        })
        return;
    };

    if (hasShop) {
        hasShop.shopNum += shopNum;
    } else {
        curUser.data.cart.push({
            title,
            types,
            place,
            shopNum,
            shopId,
            price,
            checkFlag:false,
        });
    };

    curUser.allShopNum += shopNum;
    curData.sales += shopNum;

    await fsPromise.writeFile(shopPath, JSON.stringify(res._SHOPS));
    fs.writeFile(userPath, JSON.stringify(res._USERS), (err, val) => {
        if (!err) {
            util.success(res, {
                codeText: "加入购物车成功",
                data: {
                    cart: curUser.data.cart,
                    allShopNum: curUser.allShopNum,
                }
            });
            return;
        };
        util.success(res, {
            code: 1,
            codeText: "加入购物车失败, 请重新尝试, 如连续失败多次可向客服反馈"
        });
    });

});

app.post("/changeCheckShop", (req, res) => {
    let {
        title,
        types,
        phone,
        place,
        flag
    } = req.body;
    flag = eval(flag);
    let curUser = res._USERS.find(item => item.phone === phone);
    if (flag || flag === false) {
        curUser.data.cart.forEach( item => {
            item.checkFlag = flag;
        });
    } else {
        curUser.data.cart.find( item => {
            if (item.title === title && item.types === types && item.place === place) {
                item.checkFlag = !item.checkFlag;
                return item;
            };
        });
    }
    fs.writeFile(userPath, JSON.stringify(res._USERS), (err) => {
        if (!err) {
            util.success(res, {
                cart: curUser.data.cart,
                allShopNum: curUser.allShopNum
            });
            return;
        };
        util.success(res, {
            code: 1,
            codeText: "修改信息失败, 如出现多次可向客服反馈"
        });
    })
});

app.post("/delShop", async (req, res) => {
    let {
        phone
    } = req.body;
    let curUser = res._USERS.find(item => item.phone === phone);
    let length = curUser.data.cart.length;
    curUser.data.cart = curUser.data.cart.filter(_item => {
        if (_item.checkFlag) {
            curUser.allShopNum -= _item.shopNum;
            let curShop = res._SHOPS.find(item => item.title === _item.title).msg.shopData;
            _item.types.replace(/[\u4e00-\u9FA5]+:([\u4e00-\u9FA5]+)/g, (...[,$1]) => {
                let data = curShop.find(item => item.name === $1);
                if (data.data) {
                    curShop = data.data;
                };
                if (data) {
                    data.num += _item.shopNum;
                };
            });
            return false;
        };
        return true;
    });
    if (length === curUser.data.cart.length) {
        util.success(res, {
            codeText: "修改失败, 请重试"
        });
        return;
    };
    await fsPromise.writeFile(shopPath, JSON.stringify(res._SHOPS));
    fs.writeFile(userPath, JSON.stringify(res._USERS), (err) => {
        if (!err) {
            util.success(res, {
                cart: curUser.data.cart,
                allShopNum: curUser.allShopNum,
                codeText: "删除成功"
            });
            return;
        };
        util.success(res, {
            code: 1,
            codeText: "删除失败"
        })
    })
});

module.exports = app;