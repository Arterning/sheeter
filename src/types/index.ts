// 共享类型定义

export type FieldType =
  | 'text'
  | 'longText'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'date'
  | 'datetime';

export type CellValue = string | number | string[] | null;

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  options?: any;
  order: number;
}

export interface Row {
  id: string;
  order: number;
}

export interface Cell {
  id: string;
  rowId: string;
  fieldId: string;
  value: CellValue;
}

export interface Sheet {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
