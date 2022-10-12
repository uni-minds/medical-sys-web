const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
// const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const webpack = require("webpack");  // node自带包
module.exports = {
    // 打包对入口文件，期望打包对文件入口
    entry: {
        home: "./src/main_ui/entry.ts",
        labelsys_core: "./src/labelsys/entry.ts",
        root_user_forget: "./src/user/forget.ts",
        root_user_login: "./src/user/login.ts",
        root_user_register: "./src/user/register.ts",
        pacs_us_tool: "./src/screen_tool/entry.ts",
    },
    // entry: "./src/entry.ts",
    output: {
        path: path.resolve(__dirname, './dist/js'), //获取输出路径
        filename: '[name].js',   // 输出文件名称
        // sourceMapFilename: "[name].map"
    },
    mode:'production',
    // mode: 'development',   // 整个mode 可以不要，模式是生产坏境就是压缩好对，这里配置开发坏境方便看生成对代码
    module: {
        rules: [{
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        }]
    },
    resolve: {
        extensions: ['.ts', '.js']      // 解析对文件格式
    },
    plugins: [
        // new HtmlWebpackPlugin({
        //     template: "templates/index.html"
        // }),
        // new webpack.ProvidePlugin({
        //     $: "jquery",
        //     jQuery:"jquery"
        // })
        // new CleanWebpackPlugin(),
    ],
    devtool: 'eval-cheap-module-source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, ".")
        }
    }
}