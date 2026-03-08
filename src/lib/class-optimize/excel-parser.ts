import * as XLSX from 'xlsx';
import type { ClassAssignment, Student, ValidationViolation } from './types';

const EXPECTED_HEADERS = ['이름', '학년', '반', '번호', '성적'] as const;

export function parseStudentsFromFile(file: File): Promise<Student[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target?.result as ArrayBuffer);
				const workbook = XLSX.read(data, { type: 'array' });
				const sheet = workbook.Sheets[workbook.SheetNames[0]];
				const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
					header: 1,
				});

				if (rows.length < 2) {
					reject(new Error('엑셀 파일에 데이터가 없습니다.'));
					return;
				}

				const headers = (rows[0] as unknown[]).map((h) => String(h).trim());
				for (const expected of EXPECTED_HEADERS) {
					if (!headers.includes(expected)) {
						reject(
							new Error(
								`필수 열 "${expected}"이(가) 없습니다. 필요한 열: ${EXPECTED_HEADERS.join(', ')}`,
							),
						);
						return;
					}
				}

				const colIdx = {
					name: headers.indexOf('이름'),
					grade: headers.indexOf('학년'),
					classNum: headers.indexOf('반'),
					number: headers.indexOf('번호'),
					score: headers.indexOf('성적'),
				};

				const students: Student[] = [];
				for (let i = 1; i < rows.length; i++) {
					const row = rows[i];
					if (!row || row.length === 0) continue;

					const name = String(row[colIdx.name] ?? '').trim();
					const grade = Number(row[colIdx.grade]);
					const classNum = Number(row[colIdx.classNum]);
					const number = Number(row[colIdx.number]);
					const score = Number(row[colIdx.score]);

					if (!name || Number.isNaN(grade) || Number.isNaN(score)) {
						continue;
					}

					students.push({
						name,
						grade,
						classNum,
						number,
						score,
						id: `${grade}-${classNum}-${number}`,
					});
				}

				if (students.length === 0) {
					reject(new Error('유효한 학생 데이터를 찾을 수 없습니다.'));
					return;
				}

				resolve(students);
			} catch {
				reject(new Error('엑셀 파일을 읽는 중 오류가 발생했습니다.'));
			}
		};
		reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
		reader.readAsArrayBuffer(file);
	});
}

export function exportResultToExcel(
	assignments: ClassAssignment[],
	violations: ValidationViolation[],
): void {
	const violationMap = new Map<string, string[]>();
	for (const v of violations) {
		for (const s of v.involvedStudents) {
			const existing = violationMap.get(s.id) ?? [];
			existing.push(v.message);
			violationMap.set(s.id, existing);
		}
	}

	const rows: Record<string, string | number>[] = [];
	for (const assignment of assignments) {
		for (const student of assignment.students) {
			const warnings = violationMap.get(student.id);
			rows.push({
				이름: student.name,
				학년: student.grade,
				'배정 반': assignment.classNum,
				번호: student.number,
				성적: student.score,
				'기존 반': student.classNum,
				비고: warnings ? warnings.join('; ') : '',
			});
		}
	}

	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, '반배정 결과');

	XLSX.writeFile(wb, '반배정_결과.xlsx');
}
