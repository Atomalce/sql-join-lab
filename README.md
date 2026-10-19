# SQL 连接实验室

一个条件的位置，会改变谁留下来。面向 SQL 初学者的交互教学网页，对比 LEFT JOIN 中 ON、WHERE、OR IS NULL 与 INNER JOIN 的结果。

## 运行

安装 Python 3，在项目目录运行 `python -m http.server 18083 --bind 127.0.0.1`，访问 `http://127.0.0.1:18083`。纯静态 ES module，无需 npm 安装。直接双击 HTML 可能受到浏览器模块加载限制，请使用本地 HTTP 服务。

## 使用

- 切换五种连接方式，观察结果行、保留用户和补齐行。
- 从四组数据中选择：默认边界、一对多已支付订单、空右表、全部 NULL 状态。
- 横向比较五种写法；同时查看 COUNT(*) 和 COUNT(o.id) 的差异。
- 复制当前查询，或下载包含建表、样例数据和查询的 SQL 脚本，在独立 SQLite 测试数据库中复现。

## 语义与边界

这不是完整 SQL 引擎。`core.js` 只模拟五种固定连接语义，不解析用户 SQL。仅使用内置样例，不连接数据库、不保存浏览器数据、不上传输入、不调用运行时模型。刷新恢复默认。

真实订单主键非空；NULL 状态与连接补齐行通过来源列和底色区分。一个用户可匹配多笔订单。孤立订单不进入左连接结果。当前内置数据按用户 ID、订单 ID 排列，SQL 显式按相同字段排序；核心函数按输入顺序输出。

## AI 辅助与验证

核心模块由华为云 AI 开发者空间 CodeArts 生成；界面、场景组织、复现脚本及独立校验由 Codex 辅助完成。开发期间使用 Node 测试以及 Python SQLite 对照实际执行结果；验证记录随发布材料保存。

参考：[PostgreSQL 连接语义](https://www.postgresql.org/docs/current/queries-table-expressions.html)、[SQLite SELECT](https://www.sqlite.org/lang_select.html)。

## 许可

MIT，见 LICENSE。
