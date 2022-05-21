const _path = require("path");

module.exports = {
    success(res, options) {
        if (options) {
            options = Object.assign({
                code: 0,
                codeText: "OK"
            }, options);
            res.status(200).send(options)
            return;
        }
        res.status(200).send({
            code: 1,
            codeText: "NO"
        })
    },
    path(path) {
        return _path.resolve(__dirname, path);
    }
}