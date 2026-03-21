import { FileSpreadsheet, RotateCcw, Upload } from 'lucide-react';
import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Student } from '@/lib/class-optimize/types';
import { StudentTable } from './student-table';

interface StepUploadProps {
	students: Student[];
	targetClassCount: number;
	onStudentsLoaded: (students: Student[]) => void;
	onTargetClassCountChange: (count: number) => void;
	onNext: () => void;
}

export function StepUpload({
	students,
	targetClassCount,
	onStudentsLoaded,
	onTargetClassCountChange,
	onNext,
}: StepUploadProps) {
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [fileName, setFileName] = useState<string | null>(null);
	const [isParsing, setIsParsing] = useState(false);
	const [textInput, setTextInput] = useState('');
	const [textError, setTextError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(
		async (file: File) => {
			setError(null);
			setFileName(file.name);
			setIsParsing(true);
			try {
				const { parseStudentsFromFile } = await import(
					'@/lib/class-optimize/excel-parser'
				);
				const parsed = await parseStudentsFromFile(file);
				onStudentsLoaded([...students, ...parsed]);
			} catch (e) {
				setError(
					e instanceof Error ? e.message : '파일 처리 중 오류가 발생했습니다.',
				);
			} finally {
				setIsParsing(false);
			}
		},
		[onStudentsLoaded, students],
	);

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) handleFile(file).then(() => {});
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) handleFile(file).then(() => {});
	};

	const handleTextAdd = () => {
		setTextError(null);
		try {
			const parsed = parseTextInput(textInput);
			if (parsed.length === 0) return;
			onStudentsLoaded([...students, ...parsed]);
			setTextInput('');
		} catch (e) {
			setTextError(
				e instanceof Error ? e.message : '텍스트 처리 중 오류가 발생했습니다.',
			);
		}
	};

	const handleReset = () => {
		onStudentsLoaded([]);
		setFileName(null);
		setTextInput('');
		setError(null);
		setTextError(null);
	};

	function handleRemoveStudent(studentId: string) {
		onStudentsLoaded(students.filter((s) => s.id !== studentId));
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>엑셀 파일 업로드</CardTitle>
					<CardDescription>
						학생 데이터가 포함된 엑셀 파일을 업로드하세요. (이름, 학년, 반,
						번호, 성적)
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={() => setIsDragging(false)}
						onClick={() => !isParsing && fileInputRef.current?.click()}
						className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
							isParsing
								? 'cursor-not-allowed opacity-50'
								: isDragging
									? 'border-primary bg-primary/5'
									: 'border-muted-foreground/25 hover:border-primary/50'
						}`}
					>
						{fileName ? (
							<FileSpreadsheet className="size-10 text-primary" />
						) : (
							<Upload className="size-10 text-muted-foreground" />
						)}
						<div className="text-center">
							<p className="text-sm font-medium">
								{isParsing
									? '파일 처리 중...'
									: fileName
										? fileName
										: '파일을 드래그하거나 클릭하여 업로드'}
							</p>
							<p className="text-xs text-muted-foreground">
								.xlsx, .xls 파일 지원
							</p>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept=".xlsx,.xls"
							className="hidden"
							onChange={handleInputChange}
							disabled={isParsing}
						/>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>텍스트로 학생 추가</CardTitle>
					<CardDescription>
						한 줄에 한 명씩 입력하세요. 형식: 이름 학년,반,번호 성적 (예: 홍길동
						1,1,35 495)
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Textarea
						placeholder={
							'홍길동 1,1,35 495\n김철수 1,2,12 480\n이영희 1,3,7 510'
						}
						value={textInput}
						onChange={(e) => setTextInput(e.target.value)}
						rows={5}
					/>
					<Button onClick={handleTextAdd} disabled={!textInput.trim()}>
						학생 추가
					</Button>

					{textError && (
						<Alert variant="destructive">
							<AlertDescription>{textError}</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>

			{students.length > 0 && (
				<>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle>학생 목록 미리보기 ({students.length}명)</CardTitle>
							<Button
								variant="outline"
								size="sm"
								onClick={handleReset}
								className="gap-1.5"
							>
								<RotateCcw className="size-4" />
								초기화
							</Button>
						</CardHeader>
						<CardContent>
							<StudentTable
								students={students}
								onRemove={handleRemoveStudent}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>배정 반 수</CardTitle>
							<CardDescription>
								학생들을 몇 개의 반으로 나눌지 입력하세요.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-3">
								<Label htmlFor="classCount">반 수</Label>
								<Input
									id="classCount"
									type="number"
									min={2}
									max={20}
									value={targetClassCount}
									onChange={(e) =>
										onTargetClassCountChange(Number(e.target.value))
									}
									className="w-24"
								/>
								<span className="text-sm text-muted-foreground">
									(반당 약 {Math.ceil(students.length / targetClassCount)}
									명)
								</span>
							</div>
						</CardContent>
					</Card>

					<div className="flex justify-end">
						<Button onClick={onNext}>다음 단계</Button>
					</div>
				</>
			)}
		</div>
	);
}

function parseTextInput(text: string): Student[] {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	const students: Student[] = [];

	for (const line of lines) {
		const parts = line.split(/\s+/);
		if (parts.length < 3) {
			throw new Error(
				`잘못된 형식: "${line}"\n올바른 형식: 이름 학년,반,번호 성적`,
			);
		}
		const name = parts[0];
		const [gradeStr, classStr, numberStr] = parts[1].split(',');
		const scoreStr = parts[2];

		const grade = Number(gradeStr);
		const classNum = Number(classStr);
		const number = Number(numberStr);
		const score = Number(scoreStr);

		if (
			!name ||
			Number.isNaN(grade) ||
			Number.isNaN(classNum) ||
			Number.isNaN(number) ||
			Number.isNaN(score)
		) {
			throw new Error(
				`잘못된 형식: "${line}"\n올바른 형식: 이름 학년,반,번호 성적`,
			);
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

	return students;
}
