'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function APITestPage() {
  const [userId, setUserId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [response, setResponse] = useState('');
  const [requestBody, setRequestBody] = useState('{\n  "name": "Alice",\n  "age": 25\n}');
  const [rowId, setRowId] = useState('');

  const baseUrl = userId && sheetName ? `/api/user/${userId}/sheet/${sheetName}` : '';

  const testAPI = async (method: string, url: string, body?: any) => {
    try {
      const options: RequestInit = {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>RESTful API 测试工具</CardTitle>
            <CardDescription>
              测试表格的 RESTful API 功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="输入用户 ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheetName">表格名称</Label>
                <Input
                  id="sheetName"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="例如: person"
                />
              </div>
            </div>

            {baseUrl && (
              <div className="p-3 bg-gray-100 rounded text-sm font-mono">
                <strong>API 端点：</strong> {baseUrl}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API 操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => testAPI('GET', baseUrl)}
                disabled={!baseUrl}
                variant="outline"
              >
                GET - 获取所有记录
              </Button>

              <Button
                onClick={() => {
                  try {
                    const body = JSON.parse(requestBody);
                    testAPI('POST', baseUrl, body);
                  } catch (e) {
                    setResponse('JSON 格式错误');
                  }
                }}
                disabled={!baseUrl}
                variant="outline"
              >
                POST - 创建记录
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestBody">请求体 (用于 POST/PUT)</Label>
              <Textarea
                id="requestBody"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rowId">Row ID (用于单条记录操作)</Label>
              <Input
                id="rowId"
                value={rowId}
                onChange={(e) => setRowId(e.target.value)}
                placeholder="输入行 ID"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Button
                onClick={() => testAPI('GET', `${baseUrl}/${rowId}`)}
                disabled={!baseUrl || !rowId}
                variant="outline"
              >
                GET - 获取单条
              </Button>

              <Button
                onClick={() => {
                  try {
                    const body = JSON.parse(requestBody);
                    testAPI('PUT', `${baseUrl}/${rowId}`, body);
                  } catch (e) {
                    setResponse('JSON 格式错误');
                  }
                }}
                disabled={!baseUrl || !rowId}
                variant="outline"
              >
                PUT - 更新
              </Button>

              <Button
                onClick={() => testAPI('DELETE', `${baseUrl}/${rowId}`)}
                disabled={!baseUrl || !rowId}
                variant="destructive"
              >
                DELETE - 删除
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>响应结果</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={response}
              readOnly
              rows={15}
              className="font-mono text-sm bg-gray-50"
              placeholder="API 响应将显示在这里..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. 输入你的 User ID 和表格名称</p>
            <p>2. 点击对应的按钮测试 API</p>
            <p>3. 对于 POST/PUT 操作，先在"请求体"中填写 JSON 数据</p>
            <p>4. 对于单条记录操作，需要先填写 Row ID（可以从 GET 所有记录的响应中获取 _id）</p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold">提示：</p>
              <p>完整的 API 文档请查看项目根目录的 <code>API.md</code> 文件</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
