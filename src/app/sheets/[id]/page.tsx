'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, ArrowLeft, X, Download, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // 配置 dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要拖动8px才触发，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // 删除行
  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('确定要删除这一行吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/rows/${rowId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(`删除行失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Error deleting row:', error);
      alert('删除行时发生错误');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRows.size === 0) {
      alert('请先选择要删除的行');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedRows.size} 行吗？`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedRows).map((rowId) =>
          fetch(`/api/rows/${rowId}`, { method: 'DELETE' })
        )
      );
      setSelectedRows(new Set());
      await loadData();
    } catch (error) {
      console.error('Error batch deleting rows:', error);
      alert('批量删除时发生错误');
    }
  };

  // 导出CSV
  const handleExportCSV = () => {
    if (!sheetData || selectedRows.size === 0) {
      alert('请先选择要导出的行');
      return;
    }

    // 构建CSV内容
    const headers = sheetData.fields.map((f) => f.name).join(',');
    const selectedRowsData = sheetData.rows.filter((row) => selectedRows.has(row.id));

    const rows = selectedRowsData.map((row) => {
      return sheetData.fields
        .map((field) => {
          const cell = getCellValue(row.id, field.id);
          const value = cell.value ?? '';
          // 处理包含逗号或引号的值
          const strValue = String(value);
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        })
        .join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // 下载CSV文件
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${sheetData.sheet.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 切换行选择
  const toggleRowSelection = (rowId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (!sheetData) return;

    if (selectedRows.size === sheetData.rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sheetData.rows.map((r) => r.id)));
    }
  };

  // 更新单元格
  const handleCellUpdate = async (cellId: string, value: CellValue) => {
    console.log('更新单元格:', { cellId, value });
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

  // 处理行拖动结束
  const handleRowDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !sheetData) {
      return;
    }

    const oldIndex = sheetData.rows.findIndex((r) => r.id === active.id);
    const newIndex = sheetData.rows.findIndex((r) => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 更新本地状态
    const newRows = arrayMove(sheetData.rows, oldIndex, newIndex);
    setSheetData({
      ...sheetData,
      rows: newRows,
    });

    // 保存到服务器
    try {
      const orders = newRows.map((row, index) => ({
        id: row.id,
        order: index,
      }));

      await fetch(`/api/sheets/${sheetId}/rows/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
    } catch (error) {
      console.error('Error reordering rows:', error);
      // 重新加载数据以恢复正确的顺序
      loadData();
    }
  };

  // 处理列拖动结束
  const handleFieldDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !sheetData) {
      return;
    }

    const oldIndex = sheetData.fields.findIndex((f) => f.id === active.id);
    const newIndex = sheetData.fields.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 更新本地状态
    const newFields = arrayMove(sheetData.fields, oldIndex, newIndex);
    setSheetData({
      ...sheetData,
      fields: newFields,
    });

    // 保存到服务器
    try {
      const orders = newFields.map((field, index) => ({
        id: field.id,
        order: index,
      }));

      await fetch(`/api/sheets/${sheetId}/fields/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
    } catch (error) {
      console.error('Error reordering fields:', error);
      // 重新加载数据以恢复正确的顺序
      loadData();
    }
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
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex gap-2">
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
                          <SelectItem value="date">日期（仅年月日）</SelectItem>
                          <SelectItem value="datetime">日期时间（年月日+时分）</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {newFieldType === 'date' && '日期：只显示年月日，例如：2024/1/15'}
                        {newFieldType === 'datetime' && '日期时间：显示年月日和时分，例如：2024/1/15 14:30'}
                        {newFieldType === 'text' && '单行文本：简短的文字内容'}
                        {newFieldType === 'longText' && '多行文本：较长的文字内容'}
                        {newFieldType === 'number' && '数字：可进行数学运算的数值'}
                      </p>
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

            {selectedRows.size > 0 && (
              <div className="flex gap-2">
                <span className="text-sm text-gray-600 flex items-center">
                  已选择 {selectedRows.size} 行
                </span>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  导出CSV
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                  <X className="h-4 w-4 mr-2" />
                  批量删除
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFieldDragEnd}
            >
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 w-24 bg-gray-50">
                      <Checkbox
                        checked={sheetData.rows.length > 0 && selectedRows.size === sheetData.rows.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <SortableContext
                      items={sheetData.fields.map((f) => f.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {sheetData.fields.map((field) => (
                        <SortableFieldHeader key={field.id} field={field} />
                      ))}
                    </SortableContext>
                    <th className="px-4 py-3 w-12 bg-gray-50"></th>
                  </tr>
                </thead>
              </table>
            </DndContext>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleRowDragEnd}
            >
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  {sheetData.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={(sheetData.fields.length || 1) + 2}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        暂无数据，点击"添加行"或"添加字段"开始
                      </td>
                    </tr>
                  ) : (
                    <SortableContext
                      items={sheetData.rows.map((r) => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sheetData.rows.map((row) => (
                        <SortableRow
                          key={row.id}
                          row={row}
                          fields={sheetData.fields}
                          sheetData={sheetData}
                          getCellValue={getCellValue}
                          handleCellUpdate={handleCellUpdate}
                          selectedRows={selectedRows}
                          toggleRowSelection={toggleRowSelection}
                          handleDeleteRow={handleDeleteRow}
                        />
                      ))}
                    </SortableContext>
                  )}
                </tbody>
              </table>
            </DndContext>
          </div>
        </div>
      </main>
    </div>
  );
}

// 可排序的列头
function SortableFieldHeader({ field }: { field: Field }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span>{field.name}</span>
      </div>
    </th>
  );
}

// 可排序的行
function SortableRow({
  row,
  fields,
  sheetData,
  getCellValue,
  handleCellUpdate,
  selectedRows,
  toggleRowSelection,
  handleDeleteRow,
}: {
  row: Row;
  fields: Field[];
  sheetData: SheetData;
  getCellValue: (rowId: string, fieldId: string) => Cell;
  handleCellUpdate: (cellId: string, value: CellValue) => void;
  selectedRows: Set<string>;
  toggleRowSelection: (rowId: string) => void;
  handleDeleteRow: (rowId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Checkbox
            checked={selectedRows.has(row.id)}
            onCheckedChange={() => toggleRowSelection(row.id)}
          />
        </div>
      </td>
      {fields.map((field) => {
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
      <td className="px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteRow(row.id)}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
        >
          <X className="h-3 w-3" />
        </Button>
      </td>
    </tr>
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
    if (field.type === 'date') {
      const date = new Date(cell.value as string);
      return date.toLocaleDateString('zh-CN');
    }
    if (field.type === 'datetime') {
      const date = new Date(cell.value as string);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return String(cell.value);
  };

  const handleClick = () => {
    // 对于日期类型，不需要设置 value，直接编辑
    if (field.type !== 'date' && field.type !== 'datetime') {
      setValue(cell.value ? String(cell.value) : '');
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    console.log('保存单元格:', { field: field.name, oldValue: cell.value, newValue: value });
    setIsEditing(false);
    let finalValue: CellValue = value;

    if (field.type === 'number') {
      finalValue = value ? Number(value) : null;
    } else if (value === '') {
      finalValue = null;
    }

    console.log('最终值:', finalValue, '原值:', cell.value);

    if (finalValue !== cell.value) {
      console.log('调用更新');
      onUpdate(finalValue);
    } else {
      console.log('值未改变，跳过更新');
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const isoString = date.toISOString();
      onUpdate(isoString);
    } else {
      onUpdate(null);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.type !== 'longText') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
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

  // 日期选择器
  if (field.type === 'date' || field.type === 'datetime') {
    return (
      <div className="min-w-[200px]">
        <DatePicker
          value={cell.value ? new Date(cell.value as string) : undefined}
          onChange={handleDateChange}
          placeholder={field.type === 'date' ? '选择日期' : '选择日期时间'}
        />
      </div>
    );
  }

  // 多行文本
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

  // 数字
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

  // 默认文本
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
