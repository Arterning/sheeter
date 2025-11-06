'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FieldType, CellValue, Field, Row, Cell } from '@/types';

interface SheetData {
  sheet: {
    id: string;
    name: string;
    description: string | null;
  };
  fields: Field[];
  rows: Row[];
  cells: Cell[];
}

export default function SheetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sheetId = params.id as string;

  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [creating, setCreating] = useState(false);

  // 加载表格数据
  const loadData = async () => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}`);
      if (res.ok) {
        const data = await res.json();
        setSheetData(data);
      } else if (res.status === 404) {
        router.push('/sheets');
      }
    } catch (error) {
      console.error('Error fetching sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sheetId]);

  // 添加字段
  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/sheets/${sheetId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFieldName,
          type: newFieldType,
        }),
      });

      if (res.ok) {
        setAddFieldDialogOpen(false);
        setNewFieldName('');
        setNewFieldType('text');
        await loadData();
      } else {
        const data = await res.json();
        alert(`添加字段失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error adding field:', error);
      alert('添加字段时发生错误');
    } finally {
      setCreating(false);
    }
  };

  // 添加行
  const handleAddRow = async () => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}/rows`, {
        method: 'POST',
      });

      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(`添加行失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error adding row:', error);
      alert('添加行时发生错误');
    }
  };

  // 更新单元格
  const handleCellUpdate = async (cellId: string, value: CellValue) => {
    if (!cellId) return;

    try {
      await fetch(`/api/cells/${cellId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });

      // 更新本地状态
      setSheetData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          cells: prev.cells.map((cell) =>
            cell.id === cellId ? { ...cell, value } : cell
          ),
        };
      });
    } catch (error) {
      console.error('Error updating cell:', error);
    }
  };

  // 获取单元格数据
  const getCellValue = (rowId: string, fieldId: string): Cell => {
    if (!sheetData) {
      return { id: '', rowId, fieldId, value: null };
    }
    const cell = sheetData.cells.find(
      (c) => c.rowId === rowId && c.fieldId === fieldId
    );
    return cell || { id: '', rowId, fieldId, value: null };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!sheetData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/sheets')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{sheetData.sheet.name}</h1>
              {sheetData.sheet.description && (
                <p className="text-sm text-gray-600">{sheetData.sheet.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex gap-2">
            <Dialog open={addFieldDialogOpen} onOpenChange={setAddFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  添加字段
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加新字段</DialogTitle>
                  <DialogDescription>为表格添加一个新列</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddField} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fieldName">字段名称</Label>
                    <Input
                      id="fieldName"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="请输入字段名称"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fieldType">字段类型</Label>
                    <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as FieldType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">单行文本</SelectItem>
                        <SelectItem value="longText">多行文本</SelectItem>
                        <SelectItem value="number">数字</SelectItem>
                        <SelectItem value="date">日期</SelectItem>
                        <SelectItem value="datetime">日期时间</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setAddFieldDialogOpen(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? '创建中...' : '创建'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-2" />
              添加行
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {sheetData.fields.map((field) => (
                    <th
                      key={field.id}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
                    >
                      {field.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sheetData.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={sheetData.fields.length || 1}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      暂无数据，点击"添加行"或"添加字段"开始
                    </td>
                  </tr>
                ) : (
                  sheetData.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {sheetData.fields.map((field) => {
                        const cell = getCellValue(row.id, field.id);
                        return (
                          <td key={field.id} className="px-4 py-2">
                            <CellEditor
                              cell={cell}
                              field={field}
                              onUpdate={(value) => handleCellUpdate(cell.id, value)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// 单元格编辑器
function CellEditor({
  cell,
  field,
  onUpdate,
}: {
  cell: Cell;
  field: Field;
  onUpdate: (value: CellValue) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<string>('');

  const displayValue = () => {
    if (cell.value === null || cell.value === '') {
      return '-';
    }
    if (field.type === 'date' || field.type === 'datetime') {
      return new Date(cell.value as string).toLocaleDateString('zh-CN');
    }
    return String(cell.value);
  };

  const handleClick = () => {
    setValue(cell.value ? String(cell.value) : '');
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    let finalValue: CellValue = value;

    if (field.type === 'number') {
      finalValue = value ? Number(value) : null;
    } else if (value === '') {
      finalValue = null;
    }

    if (finalValue !== cell.value) {
      onUpdate(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.type !== 'longText') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={handleClick}
        className="min-w-[150px] p-2 cursor-pointer hover:bg-gray-100 rounded text-sm"
      >
        {displayValue()}
      </div>
    );
  }

  if (field.type === 'longText') {
    return (
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        rows={3}
        className="min-w-[200px]"
      />
    );
  }

  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className="min-w-[150px]"
      />
    );
  }

  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      autoFocus
      className="min-w-[150px]"
    />
  );
}
