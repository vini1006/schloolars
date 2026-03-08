import * as XLSX from 'xlsx';
import type {
	ClassAssignment,
	PlacementRule,
	RuleType,
	Student,
	ValidationViolation,
} from './types';

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

const RULE_TYPE_TO_LABEL: Record<
	Exclude<RuleType, 'same_name_separate'>,
	string
> = {
	no_together: '붙이면 안되는 학생들',
	separate_1_to_n: '분리 필요학생 (1:N)',
};

const LABEL_TO_RULE_TYPE = new Map(
	Object.entries(RULE_TYPE_TO_LABEL).map(([k, v]) => [v, k as RuleType]),
);

export function exportRulesToExcel(
	rules: PlacementRule[],
	students: Student[],
): void {
	const studentMap = new Map(students.map((s) => [s.id, s]));

	const rows = rules
		.filter((r) => r.type !== 'same_name_separate')
		.map((rule) => ({
			규칙이름: rule.label,
			유형: RULE_TYPE_TO_LABEL[
				rule.type as Exclude<RuleType, 'same_name_separate'>
			],
			우선순위: rule.priority,
			학생목록: rule.studentIds
				.map((id) => {
					const s = studentMap.get(id);
					return s ? `${s.name}(${s.id})` : id;
				})
				.join(', '),
		}));

	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, '배치 규칙');
	XLSX.writeFile(wb, '배치_규칙.xlsx');
}

const RULE_HEADERS = ['규칙이름', '유형', '우선순위', '학생목록'] as const;

export function parseRulesFromFile(
	file: File,
	students: Student[],
): Promise<{ rules: PlacementRule[]; warnings: string[] }> {
	const studentIds = new Set(students.map((s) => s.id));

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
					reject(new Error('규칙 데이터가 없습니다.'));
					return;
				}

				const headers = (rows[0] as unknown[]).map((h) => String(h).trim());
				for (const expected of RULE_HEADERS) {
					if (!headers.includes(expected)) {
						reject(
							new Error(
								`필수 열 "${expected}"이(가) 없습니다. 필요한 열: ${RULE_HEADERS.join(', ')}`,
							),
						);
						return;
					}
				}

				const colIdx = {
					label: headers.indexOf('규칙이름'),
					type: headers.indexOf('유형'),
					priority: headers.indexOf('우선순위'),
					studentList: headers.indexOf('학생목록'),
				};

				const rules: PlacementRule[] = [];
				const warnings: string[] = [];

				for (let i = 1; i < rows.length; i++) {
					const row = rows[i];
					if (!row || row.length === 0) continue;

					const typeLabel = String(row[colIdx.type] ?? '').trim();
					const ruleType = LABEL_TO_RULE_TYPE.get(typeLabel);
					if (!ruleType) {
						warnings.push(`${i + 1}행: 알 수 없는 규칙 유형 "${typeLabel}"`);
						continue;
					}

					const priority = Number(row[colIdx.priority]);
					if (Number.isNaN(priority) || priority < 1) {
						warnings.push(`${i + 1}행: 유효하지 않은 우선순위`);
						continue;
					}

					const rawList = String(row[colIdx.studentList] ?? '').trim();
					const parsedIds: string[] = [];
					if (rawList) {
						const idPattern = /\((\d+-\d+-\d+)\)/g;
						let match: RegExpExecArray | null;
						while ((match = idPattern.exec(rawList)) !== null) {
							const id = match[1];
							if (studentIds.has(id)) {
								parsedIds.push(id);
							} else {
								warnings.push(
									`${i + 1}행: 학생 ID "${id}"을(를) 찾을 수 없습니다`,
								);
							}
						}
					}

					rules.push({
						id: crypto.randomUUID(),
						type: ruleType,
						priority,
						studentIds: parsedIds,
						label: String(row[colIdx.label] ?? '').trim(),
					});
				}

				if (rules.length === 0 && warnings.length === 0) {
					reject(new Error('유효한 규칙을 찾을 수 없습니다.'));
					return;
				}

				resolve({ rules, warnings });
			} catch {
				reject(new Error('규칙 엑셀 파일을 읽는 중 오류가 발생했습니다.'));
			}
		};
		reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
		reader.readAsArrayBuffer(file);
	});
}
