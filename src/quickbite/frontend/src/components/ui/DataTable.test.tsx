import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type Column } from './DataTable';

type Row = { id: number; name: string; total: number };
const columns: Column<Row>[] = [
  { key: 'name', header: 'Tên', cell: (r) => r.name },
  { key: 'total', header: 'Tổng', align: 'right', cell: (r) => r.total },
];

describe('DataTable', () => {
  it('hiển thị tiêu đề cột, dòng dữ liệu và caption cho trình đọc màn hình', () => {
    render(<DataTable caption="Bảng thử" columns={columns} rows={[{ id: 1, name: 'Quầy A', total: 5 }]} rowKey={(r) => r.id} />);
    const table = screen.getByRole('table', { name: 'Bảng thử' });
    expect(within(table).getByRole('columnheader', { name: 'Tên' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Quầy A' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '5' })).toHaveClass('text-right');
  });

  it('không có dữ liệu → hiện thông báo trống', () => {
    render(<DataTable caption="Bảng thử" columns={columns} rows={[]} rowKey={(r) => r.id} empty="Chưa có quầy" />);
    expect(screen.getByText('Chưa có quầy')).toBeInTheDocument();
  });

  it('đang tải → hiện dòng giữ chỗ, không hiện thông báo trống', () => {
    render(<DataTable caption="Bảng thử" columns={columns} rows={undefined} rowKey={(r) => r.id} loading empty="Chưa có quầy" />);
    expect(screen.queryByText('Chưa có quầy')).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(5); // 1 tiêu đề + 4 dòng giữ chỗ
  });
});
