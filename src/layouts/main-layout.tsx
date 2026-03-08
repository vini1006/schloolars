import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

function MainLayout() {
	const location = useLocation();

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
				<NavigationMenu>
					<NavigationMenuList className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
						<div className="flex gap-6 w-full">
							<Link to="/" className="flex items-center space-x-2">
								<span className="text-lg font-bold">Schoolars V2</span>
							</Link>
							<nav className="flex items-center gap-2">
								<NavigationMenuItem>
									<NavigationMenuTrigger
										data-active={location.pathname.startsWith('/class-')}
										onClick={(e) => e.preventDefault()}
										onPointerDown={(e) => e.preventDefault()}
									>
										반 배치
									</NavigationMenuTrigger>
									<NavigationMenuContent>
										<ul className="grid w-48 gap-1">
											<li>
												<NavigationMenuLink
													asChild
													data-active={location.pathname === '/class-optimize'}
												>
													<Link to="/class-optimize">반 배정 최적화</Link>
												</NavigationMenuLink>
											</li>
											<li>
												<NavigationMenuLink
													asChild
													data-active={location.pathname === '/class-editor'}
												>
													<Link to="/class-editor">반 배정 에디터</Link>
												</NavigationMenuLink>
											</li>
										</ul>
									</NavigationMenuContent>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<NavigationMenuLink
										asChild
										data-active={location.pathname === '/teacher-timetable'}
									>
										<Link to="/teacher-timetable">선생님 시간표</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
							</nav>
						</div>
					</NavigationMenuList>
				</NavigationMenu>
			</header>
			<main className="flex-1">
				<div className="container py-6 px-4">
					<Suspense>
						<Outlet />
					</Suspense>
				</div>
			</main>
		</div>
	);
}

export default MainLayout;
