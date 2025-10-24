本项目**CFBlog-Plus**是由基于[gdtool/cloudflare-workers-blog](https://github.com/gdtool/cloudflare-workers-blog)二次开发而来，主要是对cf worker中的js进行自主开源，并扩展了许多功能。

## 与CF-Blog相比，有哪些变更：

1. 开源部署在workers中的js，根据自己的理解，进行自主开发并开源，详见[index_plus.js](https://github.com/Arronlong/cfblog-plus/blob/master/index_plus.js)
2. 扩展md编辑器配置，可以自行根据需要修改配置。目前可配置支持html标签解析（默认关闭），更多设置参考[editormd官网](https://pandao.github.io/editor.md/)
3. 后台新建页和编辑页，自动设置时间和默认图片(使用JustNews主题时必须设置，否则样式大变)，默认图片为：![](https://cdn.jsdelivr.net/gh/Arronlong/cdn@master/cfblog/cfblog-plus.png)
4. 添加文章置顶设置功能
5. 添加后台首页选择功能
6. 添加文章隐藏功能
7. 静态搜索
