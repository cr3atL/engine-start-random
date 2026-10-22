# Blender 模型维护

当前源文件为 `assets/blender/cc110-mcp.blend`，游戏加载 `public/assets/models/cc110-rebuilt.glb`。建模必须通过 Blender MCP，在 Blender 内完成。不要再用 Babylon.js 几何替代摩托、鞋或裤腿。

作者坐标：X 朝车头、Y 向上、Z 朝车右侧；近景相机在负 Z。Blender 坐标转换为 `(x, -z, y)`，导出 glTF Y-up 后恢复作者坐标。运行时移除 Babylon 默认的 glTF X 反射，并设置对应面朝向。交换文件的单位缩放必须为 1；参考比例为 2.65 场景单位/米。

主要挂点：`CC110_STATIC`、`CC110_ENGINE`、`CC110_BODY`、`CC110_CYLINDER`、`CC110_PISTON`、`CC110_CRANK`、`CC110_ROD`、`CC110_KICK`、`CC110_BOOT`、`CC110_LEG`、`CC110_MIRROR`、`CC110_EXHAUST_TIP`。修改几何时保留名称；裤腿以竖直、2.2 单位高的绑定形态导出，运行时按顶点的绑定高度沿膝踝曲线变形。

缸体底座在 `(0.29, 0.92, 0)`，朝车头倾斜，缸筒从底座外侧延伸。检修视窗是真正去掉前侧一部分散热片和缸套，活塞中心仍在缸孔轴线上。缸盖下方的排气法兰与头段共享接头；管道沿曲轴箱下方转到外侧，消音器中心 Z 为 -0.46，以避开离合器侧盖。

通常打开当前 `.blend` 继续编辑，通过 MCP 执行 `finalize_cc110.py` 导出，再执行 `audit_cc110.py` 检查。全量重建在新的 Blender 文档中按以下顺序执行脚本：`rebuild_cc110.py`、`refine_cc110.py`、`exhaust_clearance.py`、`connect_exhaust.py`、`finalize_cc110.py`、`audit_cc110.py`。其中修整和排气位移脚本仅在全量重建后执行一次。

材质在 Blender 中设置物理颜色、金属度、粗糙度，并生成交换 UV。运行时继续使用项目自带的皮革、布料和铸铝微表面纹理，以及本地 studio.env。当前机器的 Blender 材质预览曾发生显卡着色器错误，因此 Blender 使用实体材质色检查，最终 PBR 材质在 Babylon.js 实机画面中复核。

检查要求：执行 `audit_cc110.py` 后报告必须 `passed: true`；`npm test` 验证报告对应当前 GLB。开发页还须检查发动机侧面、发动机斜视角、踩到底、踩到底斜视角，观察鞋底贴合、腿部连续性、接管及材质闪面。报告排除了正常的轴承、装配法兰和鞋底踏杆接触，不代表机械零件之间需要全部分离。

本轮保持 `game.js`、`gesture.js`、`pedal.js`、`performance.js` 和 `audio.js` 的规则与时间轴不变；只调整模型挂点、空间连接和对应表演的接触目标。转盘和小师傅的原有造型继续保留。
