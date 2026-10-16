# 异常指纹归一化规则

## 目标

把"同源同因"的 ERROR 折叠为同一条报表项。归一化后的字符串经 MD5 → 32 位 hex → `fingerprint`。

## 输入字段拼接顺序

```
appName + "|" + errorClass + "|" + normalizedMessage + "|" + topUserStackLine
```

## normalizedMessage 归一化正则字典

按以下顺序顺次替换为字面量 `*`：

| 序号 | 正则 | 说明 |
|---|---|---|
| 1 | `\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b` | UUID |
| 2 | `\b[0-9a-fA-F]{32}\b` | MD5 / 32 位 hex |
| 3 | `\b[0-9a-fA-F]{16,}\b` | 长 hex 串（雪花 ID 转 hex 等） |
| 4 | `\b\d{13}\b` | 13 位毫秒时间戳 |
| 5 | `\b\d{10}\b` | 10 位秒级时间戳 |
| 6 | `\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?` | 日期时间 |
| 7 | `\b(\d{1,3}\.){3}\d{1,3}\b` | IPv4 |
| 8 | `\b\d{6,}\b` | 长数字（订单号 / 业务 ID） |
| 9 | `'[^']{0,200}'` 或 `"[^"]{0,200}"` | 单/双引号包裹的字面量值 |
| 10 | `\s+` → 单空格 | 折叠空白 |

## topUserStackLine 提取规则

1. 解析 `Throwable.getStackTrace()` 第一帧
2. 从顶向下扫，跳过包名前缀以下任一开头的帧：
   - `java.`
   - `javax.`
   - `jakarta.`
   - `sun.` / `jdk.`
   - `org.springframework.`
   - `org.apache.`
   - `com.alibaba.druid.` / `com.alibaba.fastjson.`
   - `com.baomidou.` / `org.mybatis.`
   - `io.netty.` / `reactor.`
3. 取第一个**非框架**帧，格式化为 `ClassName#methodName:lineNo`
4. 若全部为框架帧（极端情况），取第一帧原值

## 测试用例（回归保护）

| 原始 message | 归一化后 |
|---|---|
| `订单 12345678 在 2026-05-20 10:00:00 处理失败` | `订单 * 在 * 处理失败` |
| `Connection refused: 192.168.1.10:3306` | `Connection refused: *:*` |
| `Duplicate key 'a3f9c8d1-...-...' for index ...` | `Duplicate key * for index ...` |

> 新增正则规则前，必须把对应的"原始 → 期望"用例补到本文件并保证回归通过。
