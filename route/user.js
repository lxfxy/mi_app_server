const fs = require("fs");
const fsPromise = fs.promises;
const express = require("express");
const app = express.Router();
const md5 = require("md5");
const path = require("path");

const util = require("../utils");

path.resolve = path.resolve.bind(null, __dirname);

let codes = {};

app.use(async (req, res, next) => {
    res.USERINFO = await fsPromise.readFile(path.resolve(__dirname, "../data/user.json"), "utf8");
    res.USERINFO = JSON.parse(res.USERINFO);
    next();
})

app.post("/getCode", (req, res) => {
    let {
        phone,
        type
    } = req.body;
    let hasPhone = res.USERINFO.find(item => item.phone === phone);
    if (!hasPhone && type !== "register") {
        util.success(res, {
            codeText: "NO",
            data: "此手机号还未注册, 请先注册"
        })
        return;
    };
    if (hasPhone && type === "register") {
        util.success(res, {
            code: 1,
            codeText: "NO",
            data: "此手机号码已经注册"
        });
        return;
    }
    if (/^1\d{10}$/.test(phone)) {
        util.success(res, {
            data: "手机号码不匹配, 请重新尝试"
        })
        return;
    };
    if (codes[phone]) {
        util.success(res, {
            data: md5(parseInt(codes[phone]))
        });
        console.log("手机验证码" + codes[phone]);
        return;
    };
    let nums = "1234567890";
    let result = "";
    let timer = null;
    let time = 59;
    for (let i = 0; i < 6; i++) {
        let index = Math.abs(Math.round(Math.random() * nums.length - 1));
        let num = nums[index];
        if (!num) {
            i--;
            continue;
        };
        result += num;
    };
    console.log("手机验证码" + result);
    codes[phone] = result;
    result = md5(parseInt(result));
    util.success(res, {
        data: result
    });
    timer = setInterval(() => {
        time--;
        if (time <= 0) {
            codes[phone] = "";
            clearInterval(timer);
        }
    }, 1000);
});

app.post("/checkCode", (req, res) => {
    let { 
        name, 
        pwd 
    } = req.body;
    let checkCode = codes[name];
    console.log(checkCode, pwd);
    if (checkCode === pwd) {
        let data = res.USERINFO.find(item => item.phone === name);
        data.pwd = "";
        data.data = "";
        codes[name] = "";
        util.success(res, {
            data
        });
        return;
    };
    if (!codes[name]) {
        util.success(res, {
            data: "请发送验证码"
        })
        return;
    };
    util.success(res, {
        data: "验证码输入错误, 请重试"
    });
});

app.post("/checkPwd", (req, res) => {
    let {
        name,
        pwd
    } = req.body;
    let user = res.USERINFO.find(item => item.username === name);
    if (!user) {
        util.success(res, {
            data: "此用户名不存在, 请前去注册"
        });
        return;
    };
    if (pwd === user.pwd) {
        user.pwd = "";
        util.success(res, {
            data: user
        });
        return;
    };
    util.success(res, {
        data: '密码错误'
    });
});

app.post("/getUser", (req, res) => {
    let {
        phone
    } = req.body;
    if (!phone) {
        util.success(res, {
            code: 1,
            codeText: "NO"
        });
        return;
    };
    let data = res.USERINFO.find(item => item.phone === phone);
    if (data) {
        util.success(res, {
            data,
        });
        return;
    };
    util.success(res, {
        code: 1,
        codeText: "not found",
    });
});

app.post("/addAddRess", (req, res) => {
    let {
        user,
        phone,
        placeArr,
        place,
        defaultPlace,
        name,
    } = req.body;
    defaultPlace = eval(defaultPlace);
    let curUser = res.USERINFO.find(item => item.name === user || item.phone === user);
    let hasAddress = curUser.data.address.some(item => {
        return item.phone === phone && item.place === `${placeArr} ${place}` && item.name === name;
    });
    if (hasAddress) {
        util.success(res, {});
        return;
    }
    if (defaultPlace) {
        curUser.hasDefaultPlace = true;
        curUser.data.address.find(item => {
            if (item.defaultPlace) {
                item.defaultPlace = false;
                return true;
            };
        });
    };
    curUser.data.address.push({
        phone,
        place: placeArr + " " + place,
        defaultPlace,
        name,
    });
    fs.writeFile(path.resolve(__dirname, "../data/user.json"), JSON.stringify(res.USERINFO), (err) => {
        if (!err) {
            util.success(res, {
                address: curUser.data.address
            });
            return;
        };
        util.success(res, {
            code: 1,
            codeText: "保存失败, 请重新尝试"
        });
    })
});

app.post("/register", (req, res) => {
    let {
        phone,
        name,
        username,
        pwd,
    } = req.body;
    phone = md5(parseInt(phone));
    pwd = md5(pwd);
    let userInfo = {
        name,
        username,
        pwd,
        phone,
        allShopNum: 0,
        hasDefaultPlace: false,
        data: {
            address: [],
            cart: [],
        }
    };
    res.USERINFO.push(userInfo);
    fs.writeFile(path.resolve("../data/user.json"), JSON.stringify(res.USERINFO), (err) => {
        console.log(err);
        if (!err) {
            util.success(res, {
                data: userInfo,
            });
            return;
        }
        util.success(res, {
            code: 1,
            codeText: "注册失败, 请重新尝试"
        })
    })
})

module.exports = app;