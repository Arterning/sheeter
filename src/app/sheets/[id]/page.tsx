'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Plus, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/lib/auth-client';
import type { FieldType, CellValue } from '@/db/schema';

interface Field {
  id: string;
  name: string;
  type: FieldType;
  options?: any;
  order: number;
}

interface Row {
  id: string;
  order: number;
}

interface Cell {
  id: string;
  rowId: string;
  fieldId: string;
  value: CellValue;
}

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
  const { data: session } = useSession();
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/auth');
      return;
    }
    fetchSheetData();
  }, [session, params.id]);

  const fetchSheetData = async () => {
    try {
      const res = await fetch(`/api/sheets/${params.id}`);
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

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch(`/api/sheets/${params.id}/fields`, {
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
        fetchSheetData();
      }
    } catch (error) {
      console.error('Error adding field:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleAddRow = async () => {
    try {
      const res = await fetch(`/api/sheets/${params.id}/rows`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchSheetData();
      }
    } catch (error) {
      console.error('Error adding row:', error);
    }
  };

  const handleCellUpdate = async (cellId: string, value: CellValue) => {
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

  // 构建表格数据
  const tableData = sheetData?.rows.map((row) => {
    const rowData: any = { id: row.id };
    sheetData.fields.forEach((field) => {
      const cell = sheetData.cells.find(
        (c) => c.rowId === row.id && c.fieldId === field.id
      );
      rowData[field.id] = cell || { id: '', rowId: row.id, fieldId: field.id, value: null };
    });
    return rowData;
  }) || [];

  // 构建列定义
  const columns: ColumnDef<any>[] =
    sheetData?.fields.map((field) => ({
      id: field.id,
      accessorKey: field.id,
      header: field.name,
      cell: ({ getValue }) => {
        const cell = getValue() as Cell;
        return (
          <CellEditor
            cell={cell}
            field={field}
            onUpdate={(value) => handleCellUpdate(cell.id, value)}
          />
        );
      },
    })) || [];

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
                          <SelectItem value="select">单选</SelectItem>
                          <SelectItem value="multiSelect">多选</SelectItem>
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
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                      暂无数据，点击"添加行"开始
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}

// 单元格编辑器组件
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
  const [value, setValue] = useState(cell.value);

  const handleBlur = () => {
    setIsEditing(false);
    if (value !== cell.value) {
      onUpdate(value);
    }
  };

  const renderDisplay = () => {
    if (cell.value === null || cell.value === '') {
      return <span className="text-gray-400">-</span>;
    }

    switch (field.type) {
      case 'date':
      case 'datetime':
        return new Date(cell.value as string).toLocaleDateString('zh-CN');
      case 'multiSelect':
        return Array.isArray(cell.value) ? cell.value.join(', ') : '';
      default:
        return String(cell.value);
    }
  };

  const renderEditor = () => {
    switch (field.type) {
      case 'longText':
        return (
          <Textarea
            value={String(value || '')}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={String(value || '')}
            onChange={(e) => setValue(e.target.value ? Number(e.target.value) : null)}
            onBlur={handleBlur}
            autoFocus
          />
        );

      case 'date':
      case 'datetime':
        return (
          <DatePicker
            value={value ? new Date(value as string) : undefined}
            onChange={(date) => {
              setValue(date ? date.toISOString() : null);
              setIsEditing(false);
              onUpdate(date ? date.toISOString() : null);
            }}
          />
        );

      default:
        return (
          <Input
            value={String(value || '')}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            autoFocus
          />
        );
    }
  };

  if (isEditing) {
    return <div className="min-w-[200px]">{renderEditor()}</div>;
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="min-w-[200px] p-2 cursor-pointer hover:bg-gray-50 rounded"
    >
      {renderDisplay()}
    </div>
  );
}
