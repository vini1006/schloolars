import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';

export default function NotFound() {
	return (
		<div
			data-testid="not-found-container"
			className="flex min-h-[calc(100vh-14rem)] w-full h-full items-center justify-center -mx-4 max-w-none"
		>
			<Empty className="max-w-none">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<span className="text-4xl">404</span>
					</EmptyMedia>
					<EmptyTitle>Page Not Found</EmptyTitle>
					<EmptyDescription>
						The page you're looking for doesn't exist or has been moved.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button asChild>
						<Link to="/class-optimize">Go Back Home</Link>
					</Button>
				</EmptyContent>
			</Empty>
		</div>
	);
}
