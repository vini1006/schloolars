import { AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type {
	ClassAssignment,
	ValidationViolation,
} from '@/lib/class-optimize/types';
import { ViolationAlert } from './violation-alert';

interface StepExportProps {
	assignments: ClassAssignment[];
	violations: ValidationViolation[];
	onBack: () => void;
}

export function StepExport({
	assignments,
	violations,
	onBack,
}: StepExportProps) {
	const [isExporting, setIsExporting] = useState(false);
	const totalStudents = assignments.reduce(
		(sum, a) => sum + a.students.length,
		0,
	);

	async function handleExport() {
		setIsExporting(true);
		try {
			// Lazy load xlsx and export function to reduce initial bundle size
			const { exportResultToExcel } = await import(
				'@/lib/class-optimize/excel-parser'
			);
			exportResultToExcel(assignments, violations);
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>엑셀 내보내기</CardTitle>
					<CardDescription>
						배치 결과를 엑셀 파일로 다운로드합니다.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3 rounded-lg bg-muted/50 p-4">
						<div className="flex items-center gap-2">
							<CheckCircle className="size-4 text-primary" />
							<span className="text-sm">
								총 {totalStudents}명 / {assignments.length}개 반 배정 완료
							</span>
						</div>
						{violations.length > 0 ? (
							<div className="flex items-center gap-2">
								<AlertTriangle className="size-4 text-destructive" />
								<span className="text-sm text-destructive">
									{violations.length}건의 위반 사항이 비고 열에 표시됩니다.
								</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<CheckCircle className="size-4 text-primary" />
								<span className="text-sm">모든 규칙이 충족되었습니다.</span>
							</div>
						)}
					</div>

					<div className="text-sm text-muted-foreground">
						<p className="mb-1 font-medium">내보내기 포맷:</p>
						<ul className="list-inside list-disc space-y-0.5">
							<li>이름, 학년, 반, 번호, 성적, 기존 학번</li>
							<li>같은 학년/반 기준 이름 가나다순 정렬</li>
							<li>위반 사항이 있는 학생은 비고 열에 내용 표시</li>
						</ul>
					</div>

					<Button
						onClick={handleExport}
						className="w-full"
						size="lg"
						disabled={isExporting}
					>
						<Download className="size-4" />
						{isExporting ? '내보내기 중...' : '엑셀 파일 다운로드'}
					</Button>
				</CardContent>
			</Card>

			{violations.length > 0 && <ViolationAlert violations={violations} />}

			<div className="flex justify-start">
				<Button variant="outline" onClick={onBack}>
					결과 다시 보기
				</Button>
			</div>
		</div>
	);
}
