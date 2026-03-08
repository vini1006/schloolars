import { Check } from 'lucide-react';
import { useState } from 'react';
import { StepExport } from '@/components/class-optimize/step-export';
import { StepResult } from '@/components/class-optimize/step-result';
import { StepRules } from '@/components/class-optimize/step-rules';
import { StepUpload } from '@/components/class-optimize/step-upload';
import { optimizeClasses } from '@/lib/class-optimize/class-optimizer';
import { validateAssignments } from '@/lib/class-optimize/class-validator';
import type {
	ClassAssignment,
	PlacementRule,
	Student,
	ValidationViolation,
} from '@/lib/class-optimize/types';
import { cn } from '@/lib/utils';

const STEPS = [
	{ id: 1, label: '데이터 업로드' },
	{ id: 2, label: '규칙 설정' },
	{ id: 3, label: '배치 결과' },
	{ id: 4, label: '내보내기' },
] as const;

export function Component() {
	const [currentStep, setCurrentStep] = useState(1);
	const [students, setStudents] = useState<Student[]>([]);
	const [targetClassCount, setTargetClassCount] = useState(4);
	const [rules, setRules] = useState<PlacementRule[]>([]);
	const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
	const [violations, setViolations] = useState<ValidationViolation[]>([]);

	function runOptimization() {
		const result = optimizeClasses(students, targetClassCount, rules);
		const validationResult = validateAssignments(result, rules);
		setAssignments(result);
		setViolations(validationResult);
		setCurrentStep(3);
	}

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">반 배정 최적화</h1>
				<p className="text-sm text-muted-foreground">
					학생 데이터를 업로드하고 규칙을 설정하여 최적의 반 배정을 수행합니다.
				</p>
			</div>

			<StepIndicator currentStep={currentStep} />

			{currentStep === 1 && (
				<StepUpload
					students={students}
					targetClassCount={targetClassCount}
					onStudentsLoaded={setStudents}
					onTargetClassCountChange={setTargetClassCount}
					onNext={() => setCurrentStep(2)}
				/>
			)}

			{currentStep === 2 && (
				<StepRules
					students={students}
					rules={rules}
					onRulesChange={setRules}
					onBack={() => setCurrentStep(1)}
					onNext={runOptimization}
				/>
			)}

			{currentStep === 3 && (
				<StepResult
					assignments={assignments}
					violations={violations}
					onBack={() => setCurrentStep(2)}
					onNext={() => setCurrentStep(4)}
				/>
			)}

			{currentStep === 4 && (
				<StepExport
					assignments={assignments}
					violations={violations}
					onBack={() => setCurrentStep(3)}
				/>
			)}
		</div>
	);
}

function StepIndicator({ currentStep }: { currentStep: number }) {
	return (
		<nav aria-label="진행 단계" className="flex items-center gap-2">
			{STEPS.map((step, i) => (
				<div key={step.id} className="flex items-center gap-2">
					{i > 0 && (
						<div
							className={cn(
								'h-px w-8',
								currentStep > step.id - 1 ? 'bg-primary' : 'bg-border',
							)}
						/>
					)}
					<div className="flex items-center gap-1.5">
						<div
							className={cn(
								'flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
								currentStep === step.id && 'bg-primary text-primary-foreground',
								currentStep > step.id && 'bg-primary/20 text-primary',
								currentStep < step.id && 'bg-muted text-muted-foreground',
							)}
						>
							{currentStep > step.id ? <Check className="size-3.5" /> : step.id}
						</div>
						<span
							className={cn(
								'hidden text-xs font-medium sm:inline',
								currentStep === step.id
									? 'text-foreground'
									: 'text-muted-foreground',
							)}
						>
							{step.label}
						</span>
					</div>
				</div>
			))}
		</nav>
	);
}
