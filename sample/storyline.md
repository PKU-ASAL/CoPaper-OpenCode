

##### **问题描述** 

**用一句话描述你想解决的问题，并添加要点作出解释** 

- **问题的一句话描述**：针对搭载视觉-语言-动作（VLA）大模型的自动驾驶/具身智能系统，解决因 VLA 模型推理的高延迟与不可预测性导致的高频安全关键任务（Safety-Critical Tasks）资源阻塞与截止时间失效问题。
- 解释1：场景现状：现代自动驾驶系统（如 UrgenGo [MobiCom‘25] 、VIPS [MobiCom'22]描述）不仅运行 VLA 进行长程逻辑推理（如理解交警手势），还必须并发运行高频实时任务（如 LiDAR Object Detection, SLAM Localization, Sensor Fusion），这些任务对VLA的推理和系统安全（如紧急避障）具有不可或缺的重要作用。
- 解释2（资源约束）：端侧机器人/车机通常受限于功耗和载荷，难以搭载 H100 等数据中心级 GPU，导致 7B+ 参数量的模型推理频率极低（<5Hz），无法满足 10Hz-50Hz 的控制闭环要求。同时，VLA 模型（7B）不仅计算量大，还会频繁申请/释放 KV Cache 显存。根据 Pitfalls [ECRTS ‘18] ：这会导致 GPU 驱动层面的隐式锁，直接卡死高频的 Safety Task
- 解释3（系统约束）：现有的加速方法要么永久牺牲精度（剪枝/量化），要么引入推理时间的不确定性（Reactive Early-Exit），导致最坏情况执行时间（WCET）无法优化，调度器不得不保守预留资源，导致系统资源利用率低下。

##### **问题重要性** 

**写出这是一个重要问题的理由，并给出论据。** 

- **论据**：文献，博客，新闻报道，自己做的实证研究等
- **有文献**：一句话总结文献的论证
- 文献不要太少（尽量避免一篇论文的孤证），尽量选取 CCF-A 类会议/期刊
- **没有文献**： 
- 在**原理上**论证重要性
- 针对性地设计**实证研究/实验/问卷调查**来获取支撑数据
- **理由 1：**  ： 具身智能场景中，推理延迟的确定性（Predictability）和抖动（Jitter）直接决定了物理交互的安全性与稳定性。
    - 论据 ：
      - Real-time task scheduling for machine perception in intelligent cyber-physical systems (IEEE TC)：延迟分布和调度对物理交互的系统性能至关重要
      - [RTSS ‘20]R-TOD: Real-time object detector with minimized end-to-end delay for autonomous driving：延迟对自动驾驶系统的感知-决策-执行链路的影响
      - [AAAI ‘24] SlowTrack: Increasing the Latency of Camera-based Perception in Autonomous Driving Using Adversarial Examples：证明了当感知模块的处理时间超过 Deadline会引发安全问题（95% 碰撞率）
      - [ICRA ‘25]On the Necessity of Real-Time Principles in GPU-Driven Autonomous Robots 
        高速无人机避障场景，干扰进程导致资源竞争严重导致安全问题
      - [ICRA ‘25] COLA: Characterizing and Optimizing the Tail Latency for Safe Level-4 Autonomous Vehicle Systems
        证明延迟的敏感性：100ms 的延迟增加意味着在高速行驶下刹车距离显著增加（5m+），直接导致交通事故。
      - Investigating Performance and Real-Time Trade-offs in Out-of-Order Processors（ISCA Workshop）等
- **理由 2：**  端侧 VLA 的部署是具身智能落地的必经之路，但“算力剪刀差”正在扩大，仅靠模型压缩已触及天花板。
    - 论据  1（行业现状）：厂商不断推出VLA模型，RT-2和OpenVLA等开源模型也证明了VLA模型强大的泛化能力，LLM等的发展，各类报告
    - 论据  2（硬件能力）：移动端硬件摩尔定律放缓，而模型参数量仍在指数增长。单纯依靠量化已接近极限（4-bit 之后精度崩塌），小模型的泛化能力和计算精度有限
    - 论据  3（paper）SPEED-Q: Staged Processing with Enhanced Distillation towards Efficient Low-bit On-device VLM Quantization" (arXiv 2511.08914, 2025) 等

##### **问题重要性：实证研究（选填）** 

**设计实证研究/实验/问卷调查来获取支撑数据。** 

- 收集到的数据尽量简单直观
- 收集数据的方法能够反映真实世界的普遍情况
- **收集什么数据：**  ： OpenVLA-7B （Reactive Early Exit）在典型端侧设备（Thor）上的推理耗时分布
    - 什么结果能证明问题的重要性：
      - 高 Latency： 平均推理时间远超一般控制周期（例如 > 100ms）。
      - 高 Jitter： 由于 Reactive Early-Exit 的不确定性，推理时间方差很大。
    
- **收集数据的方法：**  使用 Libero Benchmark，在固定算力限制下运行 OpenVLA，记录每一帧的推理时间
- **收集数据的方法为何能够反映普遍情况：**
    - Libero 涵盖了从简单平移到复杂操作的多样化场景
    - OpenVLA 是目前主流的性能强大的开源基座模型。
    - Thor 是目前最新，最强大的主流具身智能计算平台

- **收集数据的方法可能的缺陷（引入偏见/误差）：**  
    - 偏见/误差 1： 单纯记录 GPU 时间可能忽略了IO操作等的影响。
        - 如何避免：记录总体时间，包含 Pre/Post Processing，直到输出action为止


##### **背景知识** 

**给出相关技术的背景介绍。** 

- 文章用到的理论、概念等
- 区别于相关工作，背景知识主要是教科书上的内容
- **背景知识 1**：视觉-语言-动作模型（VLA）与 Early Exit
    - 解释 1：VLA（如 OpenVLA/RT-2）是将 ViT 和 LLM 结合，直接输出机器人动作 token 的端到端模型。
    - 解释 2：Early Exit 是一种动态推理技术，模型在中间层如果“置信度”够高就提前终止计算，以节省时间
- **背景知识 2**：实时系统
    - 解释 1：实时系统相比一般系统，更重视任务能否在既定deadline前完成，没有完成通常会有较大代价，具身智能系统因为与物理场景交互的特性，需要具备实时性。
- **背景知识 3**：Imprecise Computation Model（不精确计算模型）
    - [RTSS 2020] On Removing Algorithmic Priority Inversion fromMission-critical Machine Inference Pipelines
    - 解释：实时系统理论中的一种模型，将任务分解为必须完成的强制部分 (Mandatory Part) 和可以被丢弃的可选部分 (Optional Part)。强制部分提供最低限度的结果质量，可选部分进一步优化结果。这为 VLA 在资源受限下的调度提供了理论基础。



##### **解决问题的现有相关方法** 

**列出解决这一问题的现有相关方法。** 

- **直接方法：**  直接针对这一问题
- **间接方法：**  针对其它问题的方法稍作调整可以适应这一问题
- 其它问题和这一问题有共同性/相似性
- **第一类方法**：静态模型压缩
    - 直接方法：量化、剪枝、知识蒸馏
        - 方法的局限：模型一旦压缩，其容量被永久削减，处理长尾困难场景的能力由于“天花板效应”必然下降。
        - 局限的根本原因：Run-time Agnostic。无法根据当前的输入难度或系统负载动态调整计算量。

- **第二类方法**：反应式自适应推理
    - 间接方法：DeeR-VLA（Reactive Early-Exit）LayerSkip
      - 方法的局限：系统不可调度 (Unschedulable)。模型必须“边跑边看” ，调度器无法在 t=0 时刻预知任务是否会提前结束。SP-VLA、SpecPrune-VLA等、使用early-exit、token剪枝等方法
      - 方法局限的根本原因：Local & Late Decision Making ——决策依赖于中间层的置信度计算，且决策时刻过晚，导致 Worst-Case Execution Time (WCET) 无法降低，释放的 Slack 时间过于碎片化，难以被后台任务利用。
- **第三类方法**：Token级剪枝
    - 间接方法：SP-VLA、SpecPrune-VLA（Token级剪枝）
      - 方法的局限：减少了序列长度（优化了 Throughput），但没有减少模型深度（延迟的主要来源）
      - 局限的根本原因：完全从 Throughput 考虑，没有针对实时系统的需求


##### **现有相关方法的共性缺陷** 

**总结现有相关方法的共同的根本的缺陷。** 

- 最好是 1 个，不超过 3 个
- 导致缺陷的根本技术原因从**思想上**或者**大的原理上**讨论
- 避免讨论具体算法和工程实现
- 技术原因：如果这个缺陷不被解决，为什么这个问题就无论如何也解决不好
- 不是这个缺陷为什么困难

- **共性缺陷 1：**  缺乏调度感知的可预测性
  - 技术原因 1：现有 ML 加速算法通常只关注 Total FLOPs 或 Average Latency，忽略了 System Jitter Cost。
    - 在机器人中，节省 50% FLOPs 但增加了 50% Jitter 是不可接受的
  - 技术原因 2：现有的自适应方法旨在降低平均延迟 ，而实时系统调度依赖于最坏情况延迟 (WCET) 的缩减或提前的计算量预知。
    - 如果调度器不知道模型会“快”还是“慢”。如果按照按“慢”来预留资源（保守模式），导致系统效用无法提升，如果按照“快”预留资源（激进模式）来预留资源，而VLA模型需要慢推理，则会产生高jitter
    - 同时，大模型庞大的显存占用量使得传统的抢占式调度代价高昂： SlowTrack [AAAI’24] 指出，当 VLA 抢占导致 LiDAR 任务超时时，物理碰撞风险会呈指数级上升。

##### **解决共性缺陷的难点/挑战** 

**列出解决现有相关方法的共性缺陷的难点/挑战。** 

- 解决共性缺陷需要技术满足某些需求/达到一定指标，目前无法满足/达到： 
- 技术需要资源太多/理论复杂度太高/存在 open problem
- 技术需求之间存在矛盾
- **技术需求：** 需要一种机制，能够在 LLM 的昂贵的自回归生成开始之前，就准确预判出所需的计算时间。

- **技术限制 1**：特征不对齐
    - 解释：VLA 的中间层（如 L15）的特征空间与深层（L31）完全不同，直接截断会导致语义崩塌，无法生成有效动作。

- **技术需求矛盾 1**：Overhead vs. Accuracy
    - 解释：预判模块（Router）必须极轻量（远小于LLM推理代价）才能不拖累推理，但又必须足够准确以保证安全性（需要Full layer 推理的预测Accuracy>95%，总的任务正确率几乎不受影响）


##### **Insights** 

**针对现有相关方法的共性缺陷及其技术原因，提出新的 insights。** 

- 1-3 条 insights，最好是 1 条，不要超过 3 条

- 避免算法/代码等技术细节

  

**Insight**：面向实时系统设计基于时间预算的主动路由与调度

- 现有方法（Reactive）不能提前预知推理复杂度，为了在满足实时调度需求（降低WCET）的同时最大化系统资源利用率，我们需要提前预知计算复杂度。我们将推理加速问题重新建模为实时调度问题，训练一个极轻量的 Router，Router可以在计算开始前根据当前的state给出需要的计算复杂度。
- Scheduler 将根据Router 判断结果、当前系统负载和任务需求等动态调整运行路径，在满足时序限制和推理精度的情况下最大化利用计算资源

##### **新的 Insights 的本质区别** 

**归纳出新的 insights 和现有方法的思路的本质区别。** 

- 1-3 点区别，最好是 1 点，不要超过 3 点
- 避免具体的算法设计
- **强调本质区别** 
- 采用不同的机器学习模型/方法不算本质区别
- **区别 1：**  现有方法是尽力而为式加速，我的方法是面向可预测调度
  - 解释 1：现有方法是 Reactive（跑到目标层再看看置信度，再决定是否中断输出），决策时刻滞后。我们的方法是 Proactive（Router 可以通过输入特征马上决定走哪条路），决策时刻在最开始，可以被Scheduler利用。对于实时调度器（Scheduler）而言，“什么时候知道任务会结束” 往往比 “任务什么时候结束” 更重要。
  - 解释 2：Worst-Case 优化：现有方法只能降低 Average Latency，我们的方法还允许调度器在资源紧张时强制选择 Fast 路径，从而人为且安全地降低了实际运行时的 Worst-Case Latency，保证没有deadline miss。


##### **新的 Insights 的技术难点** 

**归纳出新的 insights 在实现时需要解决的技术难点。** 

- 技术难点：整体上的困难，如效率、准确性等
- **技术难点 1**：  如何在短时间内准确推理复杂度
  - 解释：单纯看图像或文本都不够，Router 需要理解多模态交互，同时很难量化推理的复杂度
  - 本工作技术方案：设计基于 Attention Pooling 的轻量级 Router，直接作用于预处理后的 Embeddings（包含多模态信息），捕捉关键 Token 的语义冲突。推理复杂度通过预训练的 Early Exit 模型 Fast 和 Full 模式推理的 L1 Loss 给出（简单场景Fast 模式可以给出较好结果，但难场景误差大），客观给出了难度量化方式，同时节省了标注数据集的成本。

- **技术难点 2**：   Memory Consistency (KV Cache 管理)。
  - 解释：对于需要记录 KV Cache 的 Stateful 推理，如果在 Frame T 走了浅层，Frame T+1 需要走深层，KV Cache 会缺失 L16-31 的历史信息，导致 Attention 崩溃。
  - 本工作方案：实现了 Semantic Adapter，将浅层特征映射到深层，投影特征可以直接写入深层的KV-Cache（虽然是伪造的，但可以保证KV-Cache连续性），无需拷贝和重复计算。对于 Stateful 推理，可以确保混合深度推理的上下文连续性。


##### **新的 Insights 的正确性：Insight 1** 

**从概念上解释新的 insight 1 的正确性。** 

- 避免算法/代码等技术细节
- **理由 1**：机器人任务的二八定律
    - 解释 1：在长程任务中，大部分时间（约 70%-80%）是在进行简单的空间移动（例如把机械臂移动到需要抓取的物体上面），只有接触物体或精密对准的瞬间（约 20%）需要 LLM 的深层推理能力。
    - 解释 2：虽然输入的高维像素变化很大，但其包含的控制语义熵在很多时候很低（只有确定的移动策略），这使得 Router 的预测成为可能。


##### **Motivating Example** 

**给出一个简单示例。** 

- 示例能说明现有技术的共性缺陷
- 示例能体现新的 Insights 能解决共性缺陷

- 场景描述：自动驾驶车辆接近一个复杂路口。

- 任务集：
  T_safe：LiDAR 避障与定位、SLAM 建图等背景任务。
  T_VLA：VLA 模型，判断路口意图与控制 (Deadline: 100ms, Slow Mode WCET: 90ms, Fast Mode WCET: 40ms)。

- Existing Method (Reactive Early-Exit)：
  输入一个简单帧。模型运行，在 40ms (Layer 15) 时发现置信度高，退出。耗时 40ms。
  系统调度侧：调度器在 t=0 时不敢分配后台任务（如 T_safe ），因为为了防止 VLA 走到 Layer 31 (90ms)，必须预留资源。结果：Slack 时间被浪费，系统利用率低。输入一个复杂帧。模型运行 90ms Deadline Miss

- 我们的方法：
  输入简单帧。Router（耗时<5ms）立即得知只需 40ms。调度器批准 VLA 运行 Fast Mode，并将剩余的5ms以及原本预留的安全余量立刻分配给后台 T_safe 。输入复杂帧。Router 预测  Hard。但调度器发现当前剩余时间只有 50ms。调度器强制覆盖 Router 建议，执行 Fast Mode + Adapter (45ms)。虽然动作精度略降



##### 设计方案：Overview

- 架构图：TODO
  **体现新的 Insights 的组件**：Router 位于推理的最前端，实现对于任务复杂度的预测提供确定性调度能力；Scheduler 引入了强制降级逻辑，实现了最坏情况下的系统安全性。
  **架构输入**：
- Router：推理多模态输入数据，Scheduler：Router输出+当前控制周期的 Deadline 与背景负载预估时间
  **架构输出**：Action Token
  组件 1：Context-Aware Router	功能：在VLA推理前基于 Embedding 特征将计算复杂度量化为标量 α，将不可知的执行时间转化为可知的分类问题
  组件 2： Runtime Scheduler
  功能：执行 Input-Aware Imprecise Computation 策略。仲裁 Router 的推荐与系统的时间预算。在资源充裕时最大化精度，在资源受限时强制执行 Fast Path 以保证deadline安全性
  组件 3：Semantic-Adapted Elastic Inference Engine
  功能：根据 Scheduler 的指令，执行确定性的计算路径。如果走 Fast Path，利用 Semantic Adapter 补偿浅层特征的语义缺失提前退出以节省计算时间，同时负责维护 KV Cache 的一致性

##### **设计方案：Context-Aware Router**

- 输入：原本输入VLA模型的图文 Embedding
- 输出：复杂度评分 α
- 技术挑战 1： Router 预测精度和预测成本的矛盾
  - 解释： 为了对调度有用，预测必须发生在计算量巨大的 Transformer Layers 之前。但此时特征尚未经过 Self-Attention 交互，缺乏全局上下文，极易导致对复杂空间关系（如物体遮挡）的漏判。
- 解决挑战的重要性（不解决挑战的影响）：如果 Router 不准（特别是 False Negative），调度器会错误地安排 Fast Path 处理复杂任务，导致动作失败；如果 Router 太慢，就失去了加速的意义。
- 现有相关技术方案（每种方案用一句话总结）：
  - 方案 1：Reactive Early Exit
  - 不能解决这一挑战：必须先跑完一部分网络才能决定是否退出，缺乏确定性
- 本工作技术方案：见 Insight

##### **设计方案：Elastic Runtime Scheduler**

- 输入： Router 预测复杂度评分 α，系统剩余预算 S， 路径消耗（C_fast,C_slow），
- 输出：推理路径选择（Fast， Slow）
- 技术挑战 1： Router 预测难度和系统调度deadline的矛盾
  - 解释： Router 仅关注推理的难度，不能从系统整体调度的层面解决。
- 解决挑战的重要性（不解决挑战的影响）：Router认为当前帧很难，但系统即将超时，需要解决冲突，发生了deadline miss 在实时系统中代价极大。
- 现有相关技术方案（每种方案用一句话总结）：
  - 方案 1：简单丢弃任务
  - 不能解决这一挑战：忽略了输入内容的实际需求，导致在资源允许的情况下也没有获得最佳精度。
- 本工作技术方案：建立基于不精确计算的形式化调度模型，将每个任务拆分为 Mandatory 和 Optional 两部分，根据当前系统的任务具体需求（效用价值）进行规划。

##### 设计方案：Semantic-Adapted Inference Engine

- 输入：推理路径选择（Fast，Slow）
- 输出： Action Token，KV Cache 更新（对于Stateful推理）
- 技术挑战 1： 特征空间漂移
  - 解释、解决方法： 见前面的技术难点

##### **实验：架构设计有效性**

实验验证新设计方案的有效性。

- 指标能够正确度量新设计方案的优势与额外代价
- 请对每个指标的合理性进行讨论，尽量采用其他顶会论文用过的指标

- 预期新架构有优势的方面以及度量优势的指标：
  - 优势 1（模型性能）：Acc Rate 

  - 优势 2（调度性能）：Schedulability，Utilization Rate （和Reactive Early Exit对比），Deadline Miss Rate 

  - 优势 3（综合安全性）：自动驾驶平台 Benchmark Score, Collision Rate 等

- 优势指标正确性：
  - 优势指标 1：证明模型保持和完整模型差不多的性能（几乎不损失精度）

  - 优势指标 2：证明系统更能保证实时系统的时序正确性，且最大化background利用率

- 预期新架构会付出额外代价的方面以及度量代价的指标：
  - 代价 1：Router Overhead

  - 代价 2：和完整模型、Reactive Early Exit 对比的Acc Rate

- 代价指标正确性：
  - 代价指标 1：需要证明Router 引入额外推理代价很低

  - 代价指标 2：需要证明Router 具有一定的精度保证推理正确


##### 实验：架构设计有效性

实验验证新设计方案的有效性。

- Baselines 能够代表现有相关方法的普遍情况
  - 每一类现有相关方法都需要有至少一个 baseline
- Baseline 开源：配置
- Baseline 不开源：复现

- 选取的 baselines：
  - Baseline 1：原版模型（32Layer），Pruned（16Layer）作为性能的上下界

  - Baseline 2：SOTA方式（Reactive Early-Exit）

- Baselines 的实现与正确性：
  - Baseline 1：采用开源原版模型

  - Baseline 2：根据SOTA论文方式微调


##### 实验：架构设计有效性

实验验证新设计方案的有效性。

- Dataset/Benchmark 能够公平地评测 baselines
- Dataset/Benchmark 公开：如何使用
- Dataset/Benchmark 不公开：如何构造，为什么合理
- 选取的 datasets/benchmark：
- datasets/benchmark 1：Libero（包含各种不同长度、场景的任务），
  - 是 OpenVLA 和众多其它VLA模型的标准测试集

  - 包含了大量的不同难度的场景，适合展示该架构的优势

- datasets/benchmark 的使用：
  - datasets/benchmark 1：按照原版配置
    对于RT调度部分，按照推理速度设计一个deadline并在系统模拟引入随机背景负载


- 选取的 datasets/benchmark：
  - datasets/benchmark 2：CARLA
  - 自动驾驶最广泛应用的仿真平台，包含标准化benchmark
  - 包含了大量的不同难度的场景和不同维度的指标
- datasets/benchmark 的使用：
  - datasets/benchmark 2：
  - 按照原版配置
  - 对于RT调度部分，按照推理速度设计一个deadline并在系统模拟引入随机背景负载

##### 实验：架构设计有效性

实验验证新设计方案的有效性。

- 实验方法能够反映真实世界的普遍情况
- 典型偏差 1：没有多次实验计算平均值和方差，与baseline比较没有计算统计显著性
- 典型偏差 2：baseline没有覆盖主要典型相关方法
- 典型偏差 3：实现未开源的baseline，没有讨论如何保证实现的正确性

- 实验 1：TODO
  - 实验方法为何能够反映普遍情况：TODO
  - 可能的偏见/误差：TODO
  - 避免偏见/误差的方法：TODO
  - 对于 baselines 的公平性：TODO
- 实验 2：...

##### 实验：架构设计有效性

实验验证新设计方案的有效性。

列出实验数据

- 优势：
  - 优势 1：指标数据 1，图或表，一句话总结实验结果
  - 优势 2：指标数据 2，图或表，一句话总结实验结果
  - 优势 3：指标数据 3，图或表，一句话总结实验结果
- 代价：
  - 代价 1：指标数据 1，图或表，一句话总结实验结果
  - 代价 2：指标数据 2，图或表，一句话总结实验结果
  - 代价 3：指标数据 3，图或表，一句话总结实验结果



##### 实验：讨论现有方法性能不够好的技术原因

现有方法的实验可能和其论文中的表述有出入，请详细分析解释原因

讨论现有方法效果不好的原因，为什么不好，你的实验中和他论文的实验中有什么不同，这些不同怎么导致了现有方法性能不好，这些不同是否是由于你的insight导致的

- baseline 3（SOTA） 性能不好：
  技术理由1：调度器不知道任务何时结束，为了安全只能预留 Worst-Case 资源，导致系统整体利用率低，VLA 任务的平均延迟降低并没有转化为系统红利。
- baseline 1（Pruned） 性能不好：
  技术理由1：模型裁剪导致精度永久性降低，推理正确性不如完整模型

##### 实验：Insights 正确性

实验验证 Insights 的正确性。

- 有效性超过 baseline 只是 insights 正确性的间接证明，验证正确性需要补充：
- Insights 相关的现象，在实验中确实能够观察到
- 有效性实验中的优势确实是由 insights 导致的



- Insight 1：Router 的正确性
  现象：False Positive <10%
  证明我们的轻量级 Router 没有因为“看全图不看 LLM 中间层”而漏掉关键的困难样本。
  Insight 2：Semantic Adapter 的必要性
  现象：L15直接输出不做对齐的动作误差大，且无法填充KV-Cache
  证明我们的 Semantic Adapter 对于系统的正确性、稳定性和KV-Cache一致性有必要性
- …

##### 实验：Insights 正确性

实验验证 Insights 的正确性。
证明 insights 的风险/局限能够被克服，或虽然存在但在实际情况中影响不大

- Insights 风险/局限 1：TODO
  - 能够被克服/不能被克服但对实际效果影响不大
  - 实验证明：TODO
    - 实验方法：TODO
    - 实验方法普适性：TODO
    - 实验方法正确性：TODO
  - 实验结果：图或表，一句话总结



##### 实验：重要模块对实验结果的影响

实验测量重要模块对实验结果的影响，证明各个模块的重要性。

- 重要模块 1：Router 是否必要（Ablation Study）
  - 实验方法：对比 Naïve Method（随机一半Fast，一半Slow）
  - 实验方法普适性：/
  - 实验方法正确性：随机方式精度低证明Router 确实学到了 Input Difficulty，而不是单纯因为“大部分任务都很简单” 才效果好
  - 实验结果：图或表，一句话总结




##### 关于实验部分的典型拒稿理由

- Does not follow accepted evaluation standard. The evaluation standard in the fuzzing community (Klees et al.'s "Evaluating Fuzz Testing") recommends statistical significance tests to compare competing tools, yet the authors did not perform any such tests in their evaluation. Moroever, the metric of "unique crashes" is widely known to be over-counted and unreliable, yet the authors list it as a key evaluation metric in comparing their approach to others.
- Unclear experimental setup. The paper claims that competing state-of-the-art tools fail on a large percentage of benchmarks, yet the authors provide only vague explanations of the supposed causes of failures. Recent literature shows that these tools do in fact support many of these benchmarks, suggesting there are discrepancies in the authors' experimental setup. Moreover, at least one of the competing tools has been obsolete for several years, and the authors fail to include the state-of-the-art successor in their evaluation.





### 任务模型：

#### VLA任务 (高优先级, $\tau_H$)

必须在周期 $T$ 内完成。不可以 Miss Deadline

**执行模式：**

*   Fast Path: 耗时 $C_{fast}$，执行 Early Exit + Adapter
*   Slow Path: 耗时 $C_{slow}$，执行完整 VLA模型

**Router行为：**

*   在 $t=0$ 时刻，Router 输出信号 $\sigma = \|Output_{fast}, Output_{slow}\|$ 即为 VLA 的 Fast 和 Slow 模式的输出 L1 Loss 的预测误差
*   如果选择 Fast，任务的价值定义为 $-\sigma \cdot k$， $k$ 为参数，即为推理误差
*   如果选择 Slow，任务的价值为 0

#### 背景任务流 (低优先级，随机到达, $\tau_{bg}$)

Best-effort，没有硬性 Deadline，但是有价值 $v_i$。目标是最大化单位时间内的总价值，假设服从泊松分布，平均到达率 $\lambda$。

任务队列 $Q_{bg} = \{J_1, J_2, \dots\}$ 维护当前接收到的背景任务，每个任务 $J_i$ 有预估耗时 $e_i$。

考虑到设备显存有限，任务抢占的时间成本较高（换入换出等等），调度器必须在 $t=0$ 时刻决定任务的运行。

#### Baseline

传统实时系统中，为了保证 $\tau_H$ 的绝对安全，调度器在 $t=0$ 时刻必须悲观地预留 $C_{slow}$ 的资源给 VLA。

这意味着在 $t \in [0, C_{slow} - C_{fast}]$ 这段时间内，如果实际只要跑 Fast 模式，资源是被“虚占”的，不能得到利用。

---

### Our Method

在加入了 Router 之后，算法可以从任务的实际价值出发，更高效的利用背景任务

```python
def Scheduler(visual_input, bg_queue, cycle_deadline):
    # Step 1: Router 推理 Fast 带来的额外 Loss
    # 耗时：epsilon (可忽略不计)
    sigma = Router(visual_input)

    # Step 2: 计算剩余时间
    time_now = GetTime()
    T_remain = cycle_deadline - time_now

    # Step 3: Safety Guard
    # 如果系统剩余时间不足以运行 Slow, 强制降级
    if T_remain < C_slow:
        mode_signal = FAST
        _, selected_bg_tasks = SolveKnapsack(bg_queue, capacity=slack - C_fast)
    else:
    # Step 4: 分两种情况处理背包问题计算价值，选取最优情况
        Value_slow, selected_tasks_slow = SolveKnapsack(bg_queue, capacity=slack - C_slow)
        Value_Fast, selected_tasks_fast = SolveKnapsack(bg_queue, capacity=slack - C_fast)
        Value_Fast += - k * sigma

        if Value_slow < Value_Fast:
            mode_signal = FAST
            selected_bg_tasks = selected_tasks_fast
        else:
            mode_signal = SLOW
            selected_bg_tasks = selected_tasks_slow

    # Step 5: 根据信号运行任务
    Execute_VLA(mode=mode_signal) # 占用 GPU
    Execute_BG(selected_bg_tasks) # 占用 VLA 释放后的 GPU
```

## 模型修改

之前的版本：模型运行分为两种模式：FastPath 和 SlowPath，FastPath为运行模型一半的层（16/32层）。

现在的版本：更接近SOTA的 Reactive Early-Exit 的模式，分为多个出口（k个），每个出口都可以作为输出。

我们使用新的版本，首先按照 DeeR-VLA 的方式对原模型进行微调，原模型为32层，出口共8个：（3,7,11,15,19,23,27,31)，如果第i层输出和第i+1层输出的L1 Loss 小于预设的阈值 k，则输出第i+1层的结果，不进行后续计算。在LIBERO数据集上测得的输出层号统计如下（k=0.05）：

```
=== Early Exit Statistics ===
Total Inference Steps: 7356
Average Exit Layer:    9.49 / 32
Compute Saved (est.):  70.36%
Distribution:
- Layer 7: 78.1%
- Layer 11: 10.2%
- Layer 15: 1.7%
- Layer 19: 2.9%
- Layer 23: 0.8%
- Layer 27: 1.2%
- Layer 31: 5.1%
=============================
```
## 模型修改

之前的版本：模型运行分为两种模式：FastPath 和 SlowPath，FastPath为运行模型一半的层（16/32层）。

现在的版本：更接近SOTA的 Reactive Early-Exit 的模式，分为多个出口（k个），每个出口都可以作为输出。

我们使用新的版本，首先按照 DeeR-VLA 的方式对原模型进行微调，原模型为32层，出口共8个：（3,7,11,15,19,23,27,31)，如果第i层输出和第i+1层输出的L1 Loss 小于预设的阈值 k，则输出第i+1层的结果，不进行后续计算。在LIBERO数据集上测得的输出层号统计如下（k=0.05）：

```
=== Early Exit Statistics ===
Total Inference Steps: 7356
Average Exit Layer:    9.49 / 32
Compute Saved (est.):  70.36%
Distribution:
- Layer 7: 78.1%
- Layer 11: 10.2%
- Layer 15: 1.7%
- Layer 19: 2.9%
- Layer 23: 0.8%
- Layer 27: 1.2%
- Layer 31: 5.1%·
=============================
```

### 任务模型：

#### VLA任务 (高优先级, $\tau_H$)

必须在周期 $T$ 内完成。不可以 Miss Deadline

**执行模式：**

*   新的模型架构有 n 个出口。（$e_1, e_2, \dots, e_n)$，其中$e_n$ 为最后一层。每层的耗时为 $C_1, C_2, \dots, C_n$ 。
*   每个Layer都有一个对应的 Semantic Adapter，将该层输出特征映射到最后一层的特征，保持特征空间一致。

**Router行为：**

*   在 $t=0$ 时刻，Router 输出 $(\sigma_1, \sigma_2, \dots, \sigma_n)$ ，其中 $\sigma_k$ 为预估的 $e_k$ 和$e_n$ 输出的 Loss ，且 $\sigma_1 > \sigma_2 \dots > \sigma_n = 0$
*   从最小化误差的角度，从每个出口输出带来的价值为 $V_k = -p\sigma_k $，其中 $p$ 为参数

#### 背景任务流 (低优先级，随机到达, $\tau_{bg}$)

Best-effort，没有硬性 Deadline，但是有价值 $v_i$。目标是最大化单位时间内的总价值。每个背景任务在单个控制周期内随机到达。

任务队列 $Q_{bg} = \{J_1, J_2, \dots\}$ 维护当前接收到的背景任务，每个任务 $J_i$ 有预估耗时 $e_i$，价值 $v_i$。

考虑到设备显存有限，任务抢占的时间成本较高（换入换出等等），调度器必须在 $t=0$ 时刻决定好控制周期内时间片的分配。

#### Baseline

传统实时系统中，为了保证 $\tau_H$ 的绝对安全，调度器在 $t=0$ 时刻必须悲观地预留 $C_{n}$ 的资源给 VLA。

这意味着在 $t \in [C_{n} - C_{exit}, C_n]$ 这段时间内，如果模型提前退出，资源是被“虚占”的，不能得到利用。

---

### Our Method

在加入了 Router 之后，算法可以从任务的实际价值出发，更高效的利用背景任务

```python
def Scheduler(visual_input, bg_queue, cycle_deadline):
    # Step 1: Router 推理 Fast 带来的额外 Loss
    # 耗时：epsilon (可忽略不计)
    sigma_1, ..., sigma_n = Router(visual_input)

    # Step 2: 计算剩余时间
    time_now = GetTime()
    T_remain = cycle_deadline - time_now

    # Step 3: Safety Guard
    # 如果系统剩余时间不足以从某个exit退出，强制禁止选择
    valid_exit_list = []
    for i in 1, ..., n:
        if T_remain < C_i:
            break
        else:
            valid_exit_list.append(i)
            
    # Step 4: 处理背包问题计算价值，选取最优情况
    # SolveKnapsack：分层背包，强制从不同exit中选择一个，背景任务可以任意选择，总耗时不超过T_remain，最大化价值
	selected_exit, selected_bg_tasks = SolveKnapsack(valid_exit_list, bg_queue, T_remain)

    # Step 5: 根据信号运行任务
    Execute_VLA(exit=selected_exit) # 占用 GPU
    Execute_BG(selected_bg_tasks) # 占用 VLA 释放后的 GPU
```



## 实验设计&实验结果

### Empirical Study & RQ1：Model Capability

实验目的：证明现有模型在端侧运行效率低，reactive early-exit模型方差大且不可预测（Empirical Study）：

实验设计：

Jetson Thor，OpenVLA 7b vs Reactive Early-exit，LIBERO数据集 （目标 20hz，因为每个step输出8个frame的动作，因此目标为2.5hz），测试端到端动作控制的延迟，结果如图1。

<img src="image/OpenVLA 7b vs Reactive Early-exit.png" alt="image-20260121015035333" style="zoom:50%;" />

​	NVIDIA A100，Orion （基于 LLAVA 7b）vs  vs Reactive Early-exit，Bench2Drive数据集（Planing，目标2hz），在CARLA模拟器下测试端到端动作控制延迟，结果如图2。

<img src="image/Orion vs  vs Reactive Early-exit.png" alt="image-20260121103415283" style="zoom:50%;" />

实验目的：证明模型压缩算法存在模型性能局限性

在资源不受限的场景下，Ours (Routed early exit) 的exit选择为：根据 Router的输出，找到第一个低于 early-exit 的阈值 k 的出口作为输出。

实验设计：OpenVLA 7b vs Reactive Early-exit，LIBERO数据集，测试任务成功率（Empirical Study），证明我们的方法性能损耗低，在资源不受限的场景下，精度接近SOTA水平（RQ1：Model Capability）

实验结果：**[]内为95%置信区间（由Wilson Score Interval计算得出）**

| 模型                                      | LIBERO-Spatial           | LIBERO-Object            | LIBERO-Goal              | LIBERO-10                |
| ----------------------------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| $\pi_{0}$-4b （同参数sota开源模型）       | 96.8 [95.52%, 97.72%]    | 98.8 [97.91%, 99.31%]    | 95.8  [94.37%, 96.88%]   | 85.2[82.86%, 87.27%]     |
| OpenVLA-7b (original)                     | 97.6[96.45%, 98.38%]     | 98.4[97.42%, 99.01%]     | 97.9[96.81%, 98.62%]     | 94.5[92.91%, 95.75%]     |
| OpenVLA-7b reactive early exit            | 96.9[95.63%, 97.81%]     | 99.2[98.43%, 99.59%]     | 97.6[96.45%, 98.38%]     | 94.2[92.58%, 95.49%]     |
| **Ours (OpenVLA-7b + Routed early exit)** | **97.1[95.87%, 97.97%]** | **98.7[97.79%, 99.24%]** | **97.4[96.22%, 98.22%]** | **93.1[91.25%, 94.42%]** |

解释：Ours 证明了 System-level 的截断几乎没有牺牲精度，Router 是全局视角的预测，而 Reactive 是局部阈值截断，Router 可能比 Reactive 更保守，这是部分指标可能表现更好的原因。



实验设计：Bench2Drive数据集（Open-Loop为在数据集上直接测试， Close-Loop为在CARLA模拟器下测试端到端任务）

实验结果：

| 模型                             | Avg L2 (Open-Loop) | Driving Score(Close-Loop) | Success Rate(Close-Loop) | Collisions with pedestrians | Collisions with vehicles | Collisions with layout |
| -------------------------------- | ------------------ | ------------------------- | ------------------------ | --------------------------- | ------------------------ | ---------------------- |
| Orion (original)                 | 0.630              | 77.492508                 | 55.25                    | 0.044                       | 4.897                    | 0.794                  |
| Orion reactive early exit        | 0.668              | TBD                       | TBD                      | TBD                         | TBD                      | TBD                    |
| Ours (Orion + Routed early exit) | 0.681              | TBD                       | TBD                      | TBD                         | TBD                      | TBD                    |

**26/1/28：测试环境已经成功搭建正常运行（支持了断点保存续测），单次运行耗时约72h，且需要有人值守**







### Empirical Study & RQ2: Schedulability Test

实验目的：证明reactive early-exit推理的高jitter导致的调度能力下降，schedulability低，背景任务利用率低（Empirical Study），证明我们的调度方法具有优秀的可调度性，schedulability高，背景任务完成率高（RQ2: Schedulability Test）。

实验设计：

按照实际任务需求构建一系列背景任务（代表摄像机、传感器等），参考上面的任务模型：

1. 在一个控制周期内，VLA推理任务在t=0时刻到达，且必须在控制周期结束前完成

2. 在一个控制周期内，其它背景任务按照一定的概率在随机时刻到达（可以开始执行）。

3. 根据参考文献以及确定性假设（抢占会产生较高的代价），调度器必须在t=0时刻决定好周期内时间片的分配

4. 要求VLA推理任务满足deadline的前提下，尽可能最大化背景任务的完成率

   

**Bench2Drive Open-Loop  Evaluation**

对比基线：

Pessimistic-EarlyExit：模型按照最坏情况预留推理时间

Optismistic-EarlyExit：模型按照平均情况预留推理时间，可能会导致超时

ElasticVLA：我们的调度方法（Proactive Router + Background Scheduler）

模型最大运行时间平均115ms

背景任务包含了不同价值和参数的传感器，任务运行时间按照一定的正态分布分配，到达时间按照泊松分布，固定任务优先级（例如前向摄像机的优先级总是比后向摄像机高）

推理超时的后果：直接复用上一帧输出的动作（统计意义上一般问题不大）

实验结果：

<img src="image/b2d-openloop.png" alt="image-20260312105426380" style="zoom:50%;" />

| 调度算法/cycle time    | 180   | 165   | 150   | 135   | 120   | 105   | 90    |
| ---------------------- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| Pessimistic-EarlyExit  | 0.537 | 0.548 | 0.588 | 0.681 | 1.701 | 1.710 | 1.708 |
| Optismistic--EarlyExit | 0.530 | 0.542 | 0.547 | 0.561 | 0.578 | 0.595 | 0.619 |
| ElasticVLA             | 0.533 | 0.533 | 0.535 | 0.541 | 0.549 | 0.562 | 0.575 |

Pessimistic-EarlyExit 在 Cycle Time 低于模型运行最坏时间后，会放弃所有背景任务，导致获取不到任何可供推理的视觉信息（瞎了）。



**Schedullability Test：**

随机构造任务，使用蒙特卡洛模拟计算 Deadline Miss Rate 和 Resource Utilization

默认配置：VLA模型的出口分配概率（每个动作在保证误差的情况下需要选择对应出口的概率）使用Empirical Study中实验数据。任务到达采用泊松分布（每周期平均任务数量=8，任务时间在[5,20]ms 内随机，任务价值在 [5,30] 内随机分布），Router Accuracy=0.95。

Test 1：固定其它参数，改变cycle时间预算

<img src="image/schedulability_results.png" />

Test 2：固定其它参数，改变背景任务数量（压力测试）

<img src="image/workload_saturation_results.png"/>


Test 3：固定其它参数，改变Router 预测精确度

<img src="image/router_robustness_results.png"/>

Test 4：固定其它参数，改变模型推理时间方差

<img src="image/jitter_tolerance_results.png"/>

Test 5：调节 VLA 推理深度和背景任务利用率的平衡，证明达到帕累托最优

<img src="image/pareto_frontier_results.png"/>


### RQ1: End-To-End Performance

实验目的：证明在计算资源受限以及实时性的要求下，我们的方式的端到端性能优于baseline

实验设计：按照如下方式模拟计算资源受限的场景：在 RQ1的端到端性能测试中，每个背景任务（代表传感器）若未完成，则不给模型推理提供当前帧的传感器信息；若VLA推理出现了 deadline miss，则当前帧控制失效。根据 RQ2 的实验结果（背景任务完成率，deadline miss 率），随机使deadline miss 和背景任务未完成，测试这种情况下的端到端任务完成效果。

**26.2.4**：改为直接在端到端运行测试，将 Bench2Drive 改造为多线程，运行背景任务

1. 将模拟器改为多线程并发推理，同时为每个传感器分配一个子任务
2. 每个传感器的子任务如果超时/未运行，那么该传感器对应的数据就不输入到当前帧模型的推理中
3. 如果当前帧模型推理超时，则当前帧不输出任何动作，直接复用上一帧的动作
4. 反复测试不同参数的设置，使得我的ElasticVLA对比 Baseline 的Overall Driving Score 更高，碰撞率更低



**注：B2D的 Close Loop Test 跑一次需要3天时间，且需要有人值守，最多对于每个 Baseline 测一个数据点**



### Ablation Study

实验目的：证明 Router 架构的有效性：

实验设计：同一些简单的算法代替router进行对比，测试LIBERO的任务成功率：

Uniform：均匀随机选择出口

By Distribution：根据 Reactive-Early-Exit的统计数据，按照概率选择出口。

实验结果：

| 模型              | LIBERO-Spatial | LIBERO-Object | LIBERO-Goal | LIBERO-10 |
| ----------------- | -------------- | ------------- | ----------- | --------- |
| Always Early Exit | 83.1           | 86.0          | 79.8        | 52.0      |
| Uniform           | 89.8           | 92.7          | 90.2        | 74.5      |
| By Distribution   | 84.5           | 88.7          | 81.3        | 55.8      |
| w/ Router         | 97.1           | 98.7          | 97.4        | 93.1      |

解释：根据统计学意义，选择第一个exit（Layer 7，模型的1/4）概率最大，导致关键步骤错过推理