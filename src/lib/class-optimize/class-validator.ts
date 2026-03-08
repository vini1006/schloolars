import type {
	ClassAssignment,
	PlacementRule,
	Student,
	ValidationViolation,
} from './types';

export function validateAssignments(
	assignments: ClassAssignment[],
	rules: PlacementRule[],
): ValidationViolation[] {
	const violations: ValidationViolation[] = [];

	const studentClassMap = new Map<string, number>();
	const studentMap = new Map<string, Student>();

	for (const assignment of assignments) {
		for (const student of assignment.students) {
			studentClassMap.set(student.id, assignment.classNum);
			studentMap.set(student.id, student);
		}
	}

	for (const rule of rules) {
		switch (rule.type) {
			case 'no_together':
				violations.push(
					...validateNoTogether(rule, studentClassMap, studentMap),
				);
				break;
			case 'separate_1_to_n':
				violations.push(
					...validateSeparate1ToN(rule, studentClassMap, studentMap),
				);
				break;
			case 'same_name_separate':
				violations.push(...validateSameNameSeparate(rule, assignments));
				break;
		}
	}

	return violations;
}

function validateNoTogether(
	rule: PlacementRule,
	studentClassMap: Map<string, number>,
	studentMap: Map<string, Student>,
): ValidationViolation[] {
	const violations: ValidationViolation[] = [];

	const byClass = new Map<number, Student[]>();
	for (const id of rule.studentIds) {
		const classNum = studentClassMap.get(id);
		const student = studentMap.get(id);
		if (classNum === undefined || !student) continue;

		const list = byClass.get(classNum) ?? [];
		list.push(student);
		byClass.set(classNum, list);
	}

	for (const [classNum, students] of byClass) {
		if (students.length <= 1) continue;

		const names = students.map((s) => s.name).join(', ');
		violations.push({
			rule,
			involvedStudents: students,
			assignedClass: classNum,
			message: `${names} 학생들이 같은 반(${classNum}반)에 배정되었습니다. 분리가 필요합니다.`,
		});
	}

	return violations;
}

function validateSeparate1ToN(
	rule: PlacementRule,
	studentClassMap: Map<string, number>,
	studentMap: Map<string, Student>,
): ValidationViolation[] {
	const violations: ValidationViolation[] = [];

	if (rule.studentIds.length < 2) return violations;

	const anchorId = rule.studentIds[0];
	const anchorClass = studentClassMap.get(anchorId);
	const anchorStudent = studentMap.get(anchorId);

	if (anchorClass === undefined || !anchorStudent) return violations;

	for (let i = 1; i < rule.studentIds.length; i++) {
		const otherId = rule.studentIds[i];
		const otherClass = studentClassMap.get(otherId);
		const otherStudent = studentMap.get(otherId);

		if (otherClass === undefined || !otherStudent) continue;

		if (otherClass === anchorClass) {
			violations.push({
				rule,
				involvedStudents: [anchorStudent, otherStudent],
				assignedClass: anchorClass,
				message: `${otherStudent.name} 학생이 ${anchorStudent.name} 학생과 같은 반(${anchorClass}반)에 배정되었습니다. 분리가 필요합니다.`,
			});
		}
	}

	return violations;
}

function validateSameNameSeparate(
	rule: PlacementRule,
	assignments: ClassAssignment[],
): ValidationViolation[] {
	const violations: ValidationViolation[] = [];

	for (const assignment of assignments) {
		const nameCount = new Map<string, Student[]>();
		for (const student of assignment.students) {
			const list = nameCount.get(student.name) ?? [];
			list.push(student);
			nameCount.set(student.name, list);
		}

		for (const [name, students] of nameCount) {
			if (students.length <= 1) continue;

			violations.push({
				rule,
				involvedStudents: students,
				assignedClass: assignment.classNum,
				message: `동명이인 "${name}"이(가) 같은 반(${assignment.classNum}반)에 ${students.length}명 배정되었습니다.`,
			});
		}
	}

	return violations;
}
