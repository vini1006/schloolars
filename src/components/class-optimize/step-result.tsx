import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type {
	ClassAssignment,
	ValidationViolation,
} from '@/lib/class-optimize/types';
import { ViolationAlert } from './violation-alert';

interface StepResultProps {
	assignments: ClassAssignment[];
	violations: ValidationViolation[];
	onBack: () => void;
	onNext: () => void;
}

export function StepResult({
	assignments,
	violations,
	onBack,
	onNext,
}: StepResultProps) {
	const [selectedClass, setSelectedClass] = useState<number | null>(null);

	const totalStudents = assignments.reduce(
		(sum, a) => sum + a.students.length,
		0,
	);

	const violatedStudentIds = new Set(
		violations.flatMap((v) => v.involvedStudents.map((s) => s.id)),
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>반별 요약</CardTitle>
					<CardDescription>
						총 {totalStudents}명이 {assignments.length}개 반에 배정되었습니다.
						{violations.length > 0 && ` (위반 사항 ${violations.length}건)`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{assignments.map((a) => (
							<button
								key={a.classNum}
								type="button"
								onClick={() =>
									setSelectedClass(
										selectedClass === a.classNum ? null : a.classNum,
									)
								}
								className={`rounded-lg border p-3 text-left transition-colors ${
									selectedClass === a.classNum
										? 'border-primary bg-primary/5'
										: 'hover:bg-muted/50'
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-medium">{a.classNum}반</span>
									<Badge variant="secondary">{a.students.length}명</Badge>
								</div>
								<div className="mt-1 text-sm text-muted-foreground">
									평균: {a.averageScore.toFixed(1)}
								</div>
								<div className="mt-0.5 text-xs text-muted-foreground">
									최고: {Math.max(...a.students.map((s) => s.score)).toFixed(1)}{' '}
									/ 최저:{' '}
									{Math.min(...a.students.map((s) => s.score)).toFixed(1)}
								</div>
							</button>
						))}
					</div>
				</CardContent>
			</Card>

			{selectedClass !== null && (
				<Card>
					<CardHeader>
						<CardTitle>{selectedClass}반 학생 목록</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="max-h-64 overflow-y-auto rounded-md border">
							<Table>
								<TableHeader className="sticky top-0 bg-background">
									<TableRow>
										<TableHead>이름</TableHead>
										<TableHead>학년</TableHead>
										<TableHead>기존 반</TableHead>
										<TableHead>번호</TableHead>
										<TableHead>성적</TableHead>
										<TableHead>상태</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{assignments
										.find((a) => a.classNum === selectedClass)
										?.students.map((s) => (
											<TableRow key={s.id}>
												<TableCell>{s.name}</TableCell>
												<TableCell>{s.grade}</TableCell>
												<TableCell>{s.classNum}</TableCell>
												<TableCell>{s.number}</TableCell>
												<TableCell>{s.score.toFixed(1)}</TableCell>
												<TableCell>
													{violatedStudentIds.has(s.id) ? (
														<Badge variant="destructive">위반</Badge>
													) : (
														<Badge variant="secondary">정상</Badge>
													)}
												</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			)}

			<ViolationAlert violations={violations} />

			<div className="flex justify-between">
				<Button variant="outline" onClick={onBack}>
					규칙 수정
				</Button>
				<Button onClick={onNext}>엑셀 내보내기</Button>
			</div>
		</div>
	);
}
