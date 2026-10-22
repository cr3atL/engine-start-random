# Blender 模型维护

当前源文件为 `assets/blender/rx100-game.blend`，游戏加载 `public/assets/models/rx100-game.glb`，挂点参数在同目录的 `rx100-layout.json`。所有建模通过 Blender MCP 完成。

车体来源为 [Kamesh.Hamare 的 Yamaha RX100](https://sketchfab.com/3d-models/yamaha-rx100-7615fba3db6e4e1ebd0d11eac80a0050)，许可 CC BY 4.0。保留 `public/assets/ATTRIBUTION.txt` 和操作说明中的作者、来源、许可及修改说明。这是第三方模型。

Blender 坐标为作者游戏坐标 `(x, -z, y)`。游戏 X 朝车头、Y 向上，相机位于负 Z。原始模型采用 X 横向、负 Y 朝车头、Z 向上；适配时镜像至现有游戏朝向并以 2.2 倍缩放，反转几何法线。glTF 导出 Y-up，运行时去除 Babylon 默认根节点反射。

动画挂点名称使用 `RX100_` 前缀：STATIC、BODY、ENGINE、CYLINDER、PISTON、CRANK、ROD、KICK、BOOT、LEG、MIRROR、EXHAUST_TIP。裤腿网格 `RX100_TROUSER_MESH` 仍以 2.2 单位高的直立绑定姿态导出。

原模型打火棍与车身合并。通过 `tools/blender/rx100-components.json` 提取轴座、杆身和橡胶踏头，展开踏头，增加侧盖间距和连接轴。缸体及独立散热片统一开窗，保留原始位置和排气接口，并装入原有活塞与连杆。后视镜、油箱和排气尾嘴分别保留动画挂点。

日常修改直接打开当前 `.blend`，通过 MCP 编辑。导出必须使用 `use_active_scene=True`、`use_selection=True`，只选择 RX100_ASSET 及后代，避免带入其他检查场景。可用 `bpy.data.libraries.write(path, {scene}, fake_user=True)` 单独保存当前场景及其材质贴图依赖。

全量适配脚本为 `tools/blender/prepare_rx100.py`，需要原始下载 GLB 位于 `.qa/rx100/original.glb`，并打开包含原有 CC110_BOOT、CC110_TROUSER_MESH 和活塞组件的 `cc110-mcp.blend`；旧文件只用于复用骑手及内部零件。组件表对应该原始文件的顶点顺序，换来源后须重新检查。

导出后通过 MCP 执行 `tools/blender/audit_rx100.py`。`assets/blender/rx100-audit.json` 记录 GLB SHA-256、独立脚踏、缸体/曲轴箱与排气接口距离、活塞余量、排气/轮胎交叉，以及 7 个踩踏姿态的鞋、裤腿和打火棍与车身三角面检查。脚踏轴座属于正常装配接触，不计入运动杆身交叉检查。接口距离为表面最近距离，套接管存在半径差，不能等同中心线断开。

`npm test` 校验报告与交换文件一致、动画挂点、UV、绑定姿态和 10 万三角面的预算。另在 `tests/visual-check.html` 检查侧面、斜视角、踩到底、抢修和启动反应。Blender 使用实体材质色检查，最终 PBR 材质在 Babylon.js 复核。

本轮保持 `game.js`、`gesture.js`、`pedal.js`、`performance.js` 和 `audio.js` 的规则与时间轴不变。只调整模型挂点和对应表演的空间接触。
