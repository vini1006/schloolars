import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type { Student } from '@/lib/class-optimize/types';

const columnHelper = createColumnHelper<Student>();

const columns = [
	columnHelper.accessor('name', { header: '이름' }),
	columnHelper.accessor('grade', { header: '학년' }),
	columnHelper.accessor('classNum', { header: '반' }),
	columnHelper.accessor('number', { header: '번호' }),
	columnHelper.accessor('score', {
		header: '성적',
		cell: (info) => info.getValue().toFixed(1),
	}),
	columnHelper.accessor('id', { header: 'ID' }),
];

export function StudentTable({ students }: { students: Student[] }) {
	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data: students,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="max-h-80 overflow-y-auto rounded-md border">
			<Table>
				<TableHeader className="sticky top-0 bg-background">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{flexRender(
										header.column.columnDef.header,
										header.getContext(),
									)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
