# Sheeter RESTful API 文档

每个用户创建的表格都会自动生成一套 RESTful API，可以像操作传统数据库一样进行增删改查。

## API 端点格式

```
/api/user/{userId}/sheet/{sheetName}
```

- `{userId}`: 用户 ID
- `{sheetName}`: 表格名称

## 认证

所有 API 请求都需要用户登录认证。请确保：
1. 已通过 Better Auth 登录
2. Cookie 会话有效
3. 只能访问自己的表格数据

## API 操作

### 1. 获取所有记录 (GET)

获取表格中的所有数据，以数组对象格式返回。

**请求：**
```http
GET /api/user/{userId}/sheet/{sheetName}
```

**响应示例：**
```json
[
  {
    "_id": "row-uuid-1",
    "name": "Alice",
    "age": 25,
    "email": "alice@example.com"
  },
  {
    "_id": "row-uuid-2",
    "name": "Bob",
    "age": 30,
    "email": "bob@example.com"
  }
]
```

**说明：**
- `_id` 是行的唯一标识符
- 其他字段根据表格定义的字段返回
- 字段值可能为 `null`

---

### 2. 创建新记录 (POST)

向表格中插入一条新记录。

**请求：**
```http
POST /api/user/{userId}/sheet/{sheetName}
Content-Type: application/json

{
  "name": "Charlie",
  "age": 28,
  "email": "charlie@example.com"
}
```

**响应示例：**
```json
{
  "_id": "new-row-uuid",
  "name": "Charlie",
  "age": 28,
  "email": "charlie@example.com"
}
```

**说明：**
- 请求体中的字段名必须与表格定义的字段名匹配
- 未提供的字段会设置为 `null`
- 不存在的字段会被忽略

---

### 3. 获取单条记录 (GET)

根据行 ID 获取特定的一条记录。

**请求：**
```http
GET /api/user/{userId}/sheet/{sheetName}/{rowId}
```

**响应示例：**
```json
{
  "_id": "row-uuid-1",
  "name": "Alice",
  "age": 25,
  "email": "alice@example.com"
}
```

---

### 4. 更新记录 (PUT)

更新指定行的数据。

**请求：**
```http
PUT /api/user/{userId}/sheet/{sheetName}/{rowId}
Content-Type: application/json

{
  "age": 26,
  "email": "alice.new@example.com"
}
```

**响应示例：**
```json
{
  "_id": "row-uuid-1",
  "name": "Alice",
  "age": 26,
  "email": "alice.new@example.com"
}
```

**说明：**
- 只更新请求体中提供的字段
- 未提供的字段保持不变

---

### 5. 删除记录 (DELETE)

删除指定的记录。

**请求：**
```http
DELETE /api/user/{userId}/sheet/{sheetName}/{rowId}
```

**响应示例：**
```json
{
  "success": true
}
```

---

## 使用示例

假设你创建了一个名为 `person` 的表格，包含以下字段：
- name (文本)
- age (数字)
- email (文本)

你的用户 ID 是 `user-123`

### JavaScript/TypeScript 示例

```typescript
const userId = 'user-123';
const sheetName = 'person';
const baseUrl = `/api/user/${userId}/sheet/${sheetName}`;

// 1. 获取所有记录
const getAllRecords = async () => {
  const response = await fetch(baseUrl);
  const data = await response.json();
  console.log(data);
};

// 2. 创建新记录
const createRecord = async () => {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice',
      age: 25,
      email: 'alice@example.com'
    })
  });
  const data = await response.json();
  console.log(data);
};

// 3. 更新记录
const updateRecord = async (rowId: string) => {
  const response = await fetch(`${baseUrl}/${rowId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      age: 26
    })
  });
  const data = await response.json();
  console.log(data);
};

// 4. 删除记录
const deleteRecord = async (rowId: string) => {
  const response = await fetch(`${baseUrl}/${rowId}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  console.log(data);
};
```

### cURL 示例

```bash
# 获取所有记录
curl http://localhost:3001/api/user/user-123/sheet/person

# 创建新记录
curl -X POST http://localhost:3001/api/user/user-123/sheet/person \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","age":25,"email":"alice@example.com"}'

# 更新记录
curl -X PUT http://localhost:3001/api/user/user-123/sheet/person/row-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"age":26}'

# 删除记录
curl -X DELETE http://localhost:3001/api/user/user-123/sheet/person/row-uuid-1
```

---

## 错误处理

API 返回标准的 HTTP 状态码：

- `200 OK` - 请求成功
- `201 Created` - 创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未登录
- `403 Forbidden` - 无权限访问
- `404 Not Found` - 资源不存在
- `500 Internal Server Error` - 服务器错误

**错误响应格式：**
```json
{
  "error": "错误信息"
}
```

---

## 注意事项

1. **表格名称唯一性**：同一用户下的表格名称必须唯一
2. **字段类型**：API 会根据字段类型自动处理数据
   - 文本字段：字符串
   - 数字字段：数字
   - 日期字段：ISO 8601 格式字符串
3. **权限**：只能操作自己创建的表格
4. **_id 字段**：系统保留字段，不要在创建/更新时使用

---

## 下一步计划

未来可能添加的功能：
- 查询过滤 (`?where={"age":{"$gt":25}}`)
- 排序 (`?sort=age&order=desc`)
- 分页 (`?limit=10&offset=0`)
- 字段选择 (`?fields=name,email`)
- 批量操作
