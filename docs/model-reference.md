# CC110 模型参考与材质来源

这一版通过 Blender MCP 在 Blender 5.2 中建立车体、发动机、排气、打火棍、鞋与裤腿几何，并导出带 UV、材质和独立动画挂点的 GLB。按 Honda CROSS CUB 110 的实车侧视结构和尺度作视觉参考。

## 实车参考

- [Honda CROSS CUB 110 官方页面](https://www.honda.co.jp/CROSSCUB/)
- [官方绿色车型侧视图](https://www.honda.co.jp/content/dam/site/www/CROSSCUB/cq_img/type03_01.png)
- [骑手与车型比例参考](https://www.honda.co.jp/content/dam/site/www/CROSSCUB/cq_img/gallery_02.png)
- [官方车型规格](https://www.honda.co.jp/CROSSCUB/assets/files/supercub110_crosscub110_catalog.pdf)

尺寸基准：轴距 1230 mm，座高 784 mm，轮胎 80/90-17。项目以 2.65 场景单位表示 1 米，车轮中心距离为 3.2595，轮胎外半径约 0.763，座面高约 2.08。结构采用弯梁、座下油箱区域、卧式单缸、单座与后货架、铸轮与前碟刹。官方照片用于观察比例，没有把照片贴在 3D 模型上。

骑手的大腿、小腿骨段分别为 1.12、1.08 场景单位（约 423、408 mm）；鞋外长约 250 mm。布料表面沿固定骨段变形，抬脚和压到底时仍保持鞋底与踏杆的接触关系。主镜头保留侧面近景，略抬高视点以看见曲面厚度与鞋面。

## 材质与照明

- `public/assets/boot-leather-albedo.png`：使用 imagegen 为本项目生成的皮革颜色纹理，原图未裁改，已开启 mipmap 与各向异性过滤。其他布料、橡胶、旧漆、铸铝和加工纹理在项目中生成。
- `public/assets/studio.env`：[BabylonJS/Assets 的 studio.env](https://github.com/BabylonJS/Assets/blob/master/environments/studio.env)，来自 Babylon.js 团队，采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。文件未修改，在运行时作为预过滤 HDR 环境贴图，提供金属粗糙反射及环境漫射；见同目录 ATTRIBUTION.txt。

原型中的检修剖面、小师傅与金色活塞保留原有表演需求。点火次数、转盘分布、踩踏输入和音效时间轴没有改动。
