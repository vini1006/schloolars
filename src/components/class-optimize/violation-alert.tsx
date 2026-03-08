import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { ValidationViolation } from '@/lib/class-optimize/types';

export function ViolationAlert({
	violations,
}: {
	violations: ValidationViolation[];
}) {
	if (violations.length === 0) return null;

	return (
		<div className="space-y-2">
			<h3 className="text-sm font-medium text-destructive">
				위반 사항 ({violations.length}건)
			</h3>
			{violations.map((v, i) => (
				<Alert key={i} variant="destructive">
					<AlertTriangle className="size-4" />
					<AlertTitle className="flex items-center gap-2">
						{v.rule.label}
						<Badge variant="destructive">{v.assignedClass}반</Badge>
					</AlertTitle>
					<AlertDescription>{v.message}</AlertDescription>
				</Alert>
			))}
		</div>
	);
}
