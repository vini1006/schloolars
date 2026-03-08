import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as XLSX from 'xlsx';
import type {
	ClassAssignment,
	PlacementRule,
	Student,
	ValidationViolation,
} from '../types';

const { writeFileMock } = vi.hoisted(() => ({
	writeFileMock: vi.fn(),
}));

vi.mock('xlsx', async (importOriginal) => {
	const actual = await importOriginal<typeof import('xlsx')>();
	return {
		...actual,
		writeFile: writeFileMock,
	};
});

const { exportResultToExcel } = await import('../excel-parser');

let studentCounter = 0;

function createStudent(overrides: Partial<Student> = {}): Student {
	studentCounter++;
	const grade = overrides.grade ?? faker.number.int({ min: 1, max: 6 });
	const classNum = overrides.classNum ?? faker.number.int({ min: 1, max: 5 });
	const number = overrides.number ?? studentCounter;
	return {
		name: overrides.name ?? faker.person.lastName() + faker.person.firstName(),
		grade,
		classNum,
		number,
		score: overrides.score ?? faker.number.int({ min: 0, max: 100 }),
		id: overrides.id ?? `${grade}-${classNum}-${number}`,
	};
}

function makeAssignment(
	classNum: number,
	students: Student[],
): ClassAssignment {
	const avg =
		students.length > 0
			? students.reduce((sum, s) => sum + s.score, 0) / students.length
			: 0;
	return { classNum, students, averageScore: avg };
}

describe('exportResultToExcel', () => {
	beforeEach(() => {
		writeFileMock.mockClear();
	});

	it('generates correct row structure with student data', async () => {
		const XLSX = await import('xlsx');
		const s1 = createStudent({
			name: '홍길동',
			grade: 3,
			classNum: 1,
			number: 5,
			score: 85,
			id: '3-1-5',
		});
		const s2 = createStudent({
			name: '김철수',
			grade: 3,
			classNum: 2,
			number: 3,
			score: 92,
			id: '3-2-3',
		});

		const assignments: ClassAssignment[] = [
			makeAssignment(1, [s1]),
			makeAssignment(2, [s2]),
		];

		exportResultToExcel(assignments, []);

		expect(writeFileMock).toHaveBeenCalledOnce();
		const wb = writeFileMock.mock.calls[0][0] as XLSX.WorkBook;
		const ws = wb.Sheets['반배정 결과'];
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			이름: '홍길동',
			학년: 3,
			'배정 반': 1,
			번호: 5,
			성적: 85,
			'기존 반': 1,
		});
		expect(rows[1]).toMatchObject({
			이름: '김철수',
			학년: 3,
			'배정 반': 2,
			번호: 3,
			성적: 92,
			'기존 반': 2,
		});
	});

	it('handles empty violations with empty 비고 column', async () => {
		const XLSX = await import('xlsx');
		const s1 = createStudent({ id: 'x1' });
		const assignments: ClassAssignment[] = [makeAssignment(1, [s1])];

		exportResultToExcel(assignments, []);

		const wb = writeFileMock.mock.calls[0][0] as XLSX.WorkBook;
		const ws = wb.Sheets['반배정 결과'];
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

		expect(rows[0]['비고']).toBe('');
	});

	it('joins multiple violations for one student with semicolon', async () => {
		const XLSX = await import('xlsx');
		const s1 = createStudent({ id: 'y1', name: '이영희' });
		const assignments: ClassAssignment[] = [makeAssignment(1, [s1])];

		const rule1: PlacementRule = {
			id: 'r1',
			type: 'no_together',
			priority: 1,
			studentIds: ['y1'],
			label: 'rule1',
		};
		const rule2: PlacementRule = {
			id: 'r2',
			type: 'same_name_separate',
			priority: 2,
			studentIds: [],
			label: 'rule2',
		};

		const violations: ValidationViolation[] = [
			{
				rule: rule1,
				involvedStudents: [s1],
				assignedClass: 1,
				message: '위반 사항 1',
			},
			{
				rule: rule2,
				involvedStudents: [s1],
				assignedClass: 1,
				message: '위반 사항 2',
			},
		];

		exportResultToExcel(assignments, violations);

		const wb = writeFileMock.mock.calls[0][0] as XLSX.WorkBook;
		const ws = wb.Sheets['반배정 결과'];
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

		expect(rows[0]['비고']).toBe('위반 사항 1; 위반 사항 2');
	});

	it('calls XLSX.writeFile with correct filename', () => {
		const s1 = createStudent();
		const assignments: ClassAssignment[] = [makeAssignment(1, [s1])];

		exportResultToExcel(assignments, []);

		expect(writeFileMock).toHaveBeenCalledWith(
			expect.any(Object),
			'반배정_결과.xlsx',
		);
	});

	it('creates a workbook with the correct sheet name', () => {
		const s1 = createStudent();
		const assignments: ClassAssignment[] = [makeAssignment(1, [s1])];

		exportResultToExcel(assignments, []);

		const wb = writeFileMock.mock.calls[0][0] as XLSX.WorkBook;
		expect(wb.SheetNames).toContain('반배정 결과');
	});
});
