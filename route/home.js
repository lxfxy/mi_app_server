const fs = require("fs");
const path = require("path");
const fsPromise = fs.promises;
const express = require("express");
const app = express.Router();

const util = require("../utils");

let limitObj = {
    time: null,
    data: [],
    hours: 3,
}

let shopsObj = {
    page: 1,
    dateIndexs: [], 
}

app.use(async (req, res, next) => {
    let data = await fs.promises.readFile(path.resolve(__dirname, "../data/shop.json"), "utf-8");
    data = JSON.parse(data || "[]");
    if (data.length > 0) {
        res.SHOPDATE = data;
    };
    next();
});

app.get("/news", (req, res) => {
    let data = res.SHOPDATE.reverse();
    data = data.map((item, index) => {
        if (index < 10) {
            item.msg = "";
            return item;
        };
    }).sort((a, b) => a.id - b.id);
    if (data.length === 0) {
        util.success(res);
        return;
    };
    util.success(res, {
        data
    });
});

app.get("/hots", (req, res) => {
    let obj = {};
    let nums = [];
    let result = [];
    res.SHOPDATE.forEach( item => {
        let {
            comment: {
                good
            },
            search,
            sales,
            id
        } = item;
        let num = good + search + sales;
        obj[num] = id;
        nums.push(num);
    });
    for (let i = 0; i < 10; i++) {
        let max = Math.max(...nums);
        let id = obj[max] - 1;
        result.push(res.SHOPDATE.find( item => {
            if (item.id === id + 1) {
                item.msg = "";
                return true;
            }
        } ));
        nums[id] = null;
    };
    if (result.length === 0) {
        util.success(res);
        return;
    }
    util.success(res, {
        data: result
    })
});

app.get("/limitTimeShop", (req, res) => {
    let time = new Date().getTime() - (limitObj.time || new Date()).getTime();
    let flag = time <= 8 * 60 * 60 * 1000;
    // console.log(limitObj.time, time, 8 * 60 * 60 * 1000)
    if (flag && limitObj.time) {
        util.success(res, {
            data: limitObj.data,
            time: new Date()
        })
        return;
    };
    if (res.SHOPDATE.length < 10) {
        util.success(res, {
            data:{
                data: res.SHOPDATE,
                time: new Date(),
            }
        })
        return;
    }
    let indexs = [];
    let data = [];
    for (let i = 0; i < 10; i++) {
        if (data.length === 10) break;
        let num = Math.abs(Math.round(Math.random() * res.SHOPDATE.length - 1));
        let item = res.SHOPDATE[num];
        item.msg = "";
        if (indexs.includes(num) || !item) {
            i--;
            continue;
        };
        data.push(item);
        indexs.push(num);
    };
    limitObj.time = new Date(new Date().toString().replace(/(\d+):\d+:\d+/, (...[content, $1]) => {
        $1 -= parseInt($1) % limitObj.hours;
        return $1 + content.slice(2);
    }));
    // console.log(limitObj.time);
    util.success(res, {
        data,
        time: limitObj.time,
    });
    limitObj.data = data;
});

app.get("/shops", (req, res) => {
    let { 
        type = "",
        limit = 10,
        firstLoading = false
    } = req.query;
    if (eval(firstLoading)) {
        shopsObj.page = 1;
        shopsObj.dateIndexs = [];
    };
    let page = shopsObj.page;
    // console.log(type)
    let shopDate = res.SHOPDATE;
    let i = (page - 1) * limit;
    let pages = Math.ceil(shopDate.length / limit);
    let data = [];
    for (i; i < (page * limit); i++) {
        if (i >= shopDate.length) break;
        if (type.trim()) {
            shopDate = shopDate.filter(item => {
                if (item.type === type) {
                    item.msg = "";
                    return true;
                };
            });
        };
        let num = Math.abs(Math.round(Math.random() * shopDate.length - 1));
        let item = shopDate[num];
        // console.log(num, shopsObj.dateIndexs, page, limit)
        if (shopsObj.dateIndexs.includes(num) || !item) {
            i--;
            continue;
        };
        item.msg = "";
        data.push(item);
        shopsObj.dateIndexs.push(num);
    };
    if (data.length === 0) {
        util.success(res);
        return;
    };
    shopsObj.page = page + 1;
    util.success(res, {
        data,
        pages,
        page,
        limit,
        total: shopDate.length,
    })
})

module.exports = app;